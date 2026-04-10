import { Controller, Logger, Inject } from '@nestjs/common';
import { MessagePattern, Payload, Ctx, KafkaContext, ClientKafka } from '@nestjs/microservices';
import { PrismaClient } from '@prisma/client';
import { Decimal } from 'decimal.js';

const prisma = new PrismaClient();

import { MarketDataService } from '../market-data/market-data.service';

@Controller()
export class MarginCheckProcessor {
  private readonly logger = new Logger(MarginCheckProcessor.name);

  constructor(
    @Inject('KAFKA_OMS_SERVICE') private readonly kafkaClient: ClientKafka,
    private readonly marketDataService: MarketDataService,
  ) { }

  @MessagePattern('order-received')
  async handleOrderReceived(
    @Payload() message: any,
    @Ctx() context: KafkaContext,
  ) {
    // Kafka delivers the message as an object with a `value` buffer/string
    const raw = message?.value ?? message;
    const orderData = typeof raw === 'string' ? JSON.parse(raw) : raw;

    this.logger.log(
      `[Margin Check] Validating order: ${orderData.idempotencyKey}`,
    );

    try {
      let requiredMarginAmount = new Decimal(0);

      if (orderData.side === 'BUY') {
        let priceToUse = orderData.price;
        if (orderData.orderType === 'MARKET') {
          const livePrice = this.marketDataService.getLivePrice(orderData.symbol);
          if (!livePrice) {
            throw new Error('Live market data unavailable for margin check');
          }
          priceToUse = livePrice;
        }

        const referencePrice = new Decimal(priceToUse || 100);
        requiredMarginAmount = referencePrice.mul(orderData.requestedQty);

        if (orderData.productType === 'INTRADAY') {
          requiredMarginAmount = requiredMarginAmount.mul(0.2); // 5x Leverage
        } else if (orderData.productType === 'MARGIN') {
          requiredMarginAmount = requiredMarginAmount.mul(0.3); // 3.3x Leverage
        }
      }

      await prisma.$transaction(async (tx) => {
        const order = await tx.orderBook.create({
          data: {
            id: orderData.idempotencyKey,
            userId: orderData.userId,
            symbol: orderData.symbol,
            side: orderData.side,
            orderType: orderData.orderType,
            productType: orderData.productType,
            requestedQty: new Decimal(orderData.requestedQty),
            price: orderData.price ? new Decimal(orderData.price) : null,
            triggerPrice: orderData.triggerPrice
              ? new Decimal(orderData.triggerPrice)
              : null,
            status: (orderData.orderType === 'SL' || orderData.orderType === 'SL_M') ? 'TRIGGER_PENDING' : 'OPEN',
          },
        });

        const wallet = await tx.marginWallet.findUnique({
          where: { userId: orderData.userId },
        });

        if (!wallet) {
          throw new Error('Margin Wallet not found for user');
        }

        const totalAvailableMargin = new Decimal(wallet.availableCash).plus(
          wallet.collateralMargin,
        );

        if (
          orderData.side === 'BUY' &&
          totalAvailableMargin.lt(requiredMarginAmount)
        ) {
          await tx.orderBook.update({
            where: { id: order.id },
            data: {
              status: 'REJECTED',
              rejectionReason: 'Insufficient Margin',
            },
          });

          this.logger.warn(
            `[Margin Check] Order Rejected: ${order.id} - Insufficient Margin`,
          );
          this.kafkaClient.emit(
            'order-rejected',
            JSON.stringify({ ...orderData, reason: 'Insufficient Margin' }),
          );
          return;
        }

        if (orderData.side === 'BUY') {
          await tx.marginWallet.update({
            where: { userId: orderData.userId },
            data: {
              availableCash: new Decimal(wallet.availableCash).minus(
                requiredMarginAmount,
              ),
              utilizedMargin: new Decimal(wallet.utilizedMargin).plus(
                requiredMarginAmount,
              ),
            },
          });
        }

        this.logger.log(
          `[Margin Check] Order Validated & Margin Blocked: ${order.id} (₹${requiredMarginAmount.toFixed(2)})`,
        );
        this.kafkaClient.emit('order-validated', JSON.stringify({
          ...orderData,
          status: order.status,
          blockedMargin: requiredMarginAmount.toNumber()
        }));
      });
    } catch (error: any) {
      this.logger.error(
        `[Margin Check] Error processing order ${orderData?.idempotencyKey}: ${error.message}`,
      );
      this.kafkaClient.emit(
        'order-rejected',
        JSON.stringify({ ...orderData, reason: 'Internal System Error' }),
      );
    }
  }
}