import { Controller, Logger } from '@nestjs/common';
import { MessagePattern, Payload, Ctx, KafkaContext } from '@nestjs/microservices';
import { PrismaClient } from '@prisma/client';
import { Decimal } from 'decimal.js';
import { calculateIndianTaxes } from './tax-calculator';
import { MetricsService } from '../metrics/metrics.service';

const prisma = new PrismaClient();

@Controller()
export class OrderSettlementProcessor {
  private readonly logger = new Logger(OrderSettlementProcessor.name);

  constructor(private readonly metrics: MetricsService) { }

  @MessagePattern('order-executed')
  async handleOrderExecuted(
    @Payload() message: any,
    @Ctx() context: KafkaContext,
  ) {
    const raw = message?.value ?? message;
    const executionData = typeof raw === 'string' ? JSON.parse(raw) : raw;

    // Track Kafka consumption
    this.metrics.recordKafkaMessage('order-executed');

    this.logger.log(
      `[Settlement] Processing execution for order: ${executionData.idempotencyKey}`,
    );

    try {
      await prisma.$transaction(async (tx) => {
        // 1. Update Order Status to EXECUTED
        await tx.orderBook.update({
          where: { id: executionData.idempotencyKey },
          data: {
            status: 'EXECUTED',
            filledQty: new Decimal(executionData.filledQty),
            averagePrice: new Decimal(executionData.fillPrice),
          },
        });

        // 2. Calculate P&L / Margin Impact alongside Position update
        const qtyMultiplier = executionData.side === 'BUY' ? 1 : -1;
        const signedQty = new Decimal(executionData.filledQty).mul(qtyMultiplier);

        let cashImpact = new Decimal(0);
        let utilizedMarginImpact = new Decimal(0);

        if (executionData.side === 'BUY') {
          const executionValue = new Decimal(executionData.fillPrice).mul(executionData.filledQty);
          // For BUY orders, blocked margin is either from payload or recalculated
          const marginConsumed = executionData.productType === 'INTRADAY'
            ? executionValue.mul(0.2)
            : executionData.productType === 'MARGIN'
              ? executionValue.mul(0.3)
              : executionValue;
          const blockedMargin = new Decimal(executionData.blockedMargin || marginConsumed);

          cashImpact = blockedMargin.minus(marginConsumed); // Any difference returned to cash
          utilizedMarginImpact = marginConsumed.minus(blockedMargin); // Replace block with actual consumption
        }

        if (executionData.productType === 'INTRADAY') {
          const existingPos = await tx.position.findUnique({
            where: {
              userId_symbol: {
                userId: executionData.userId,
                symbol: executionData.symbol,
              },
            },
          });

          if (existingPos) {
            const newQty = new Decimal(existingPos.quantity).plus(signedQty);
            let newAvgPrice = new Decimal(executionData.fillPrice);

            if (!existingPos.quantity.equals(0) && executionData.side === 'BUY') {
              const oldTotalValue = new Decimal(existingPos.quantity).mul(existingPos.averagePrice);
              const newTotalValue = signedQty.mul(new Decimal(executionData.fillPrice));
              newAvgPrice = oldTotalValue.plus(newTotalValue).div(newQty);
            } else if (!existingPos.quantity.equals(0) && executionData.side === 'SELL') {
              newAvgPrice = newQty.equals(0) ? new Decimal(0) : existingPos.averagePrice;

              // Calculate Margin Release & Realized PNL for squaring off Long position
              const qtySold = new Decimal(executionData.filledQty);
              const marginReleased = qtySold.mul(existingPos.averagePrice).mul(0.2);
              const realizedPnl = qtySold.mul(new Decimal(executionData.fillPrice).minus(existingPos.averagePrice));

              cashImpact = cashImpact.plus(marginReleased).plus(realizedPnl);
              utilizedMarginImpact = utilizedMarginImpact.minus(marginReleased);

              await tx.position.update({
                where: { id: existingPos.id },
                data: { realizedPnl: new Decimal(existingPos.realizedPnl).plus(realizedPnl) }
              });
            }

            await tx.position.update({
              where: { id: existingPos.id },
              data: { quantity: newQty, averagePrice: newAvgPrice },
            });
          } else {
            await tx.position.create({
              data: {
                userId: executionData.userId,
                symbol: executionData.symbol,
                quantity: signedQty,
                averagePrice: new Decimal(executionData.fillPrice),
              },
            });
          }
        } else if (executionData.productType === 'DELIVERY' || executionData.productType === 'MARGIN') {
          const existingHolding = await tx.holding.findUnique({
            where: {
              userId_symbol: {
                userId: executionData.userId,
                symbol: executionData.symbol,
              },
            },
          });

          if (existingHolding) {
            const newQty = new Decimal(existingHolding.quantity).plus(signedQty);
            let newAvgPrice = existingHolding.averagePrice;

            if (executionData.side === 'BUY') {
              const oldTotalValue = new Decimal(existingHolding.quantity).mul(existingHolding.averagePrice);
              const newTotalValue = signedQty.mul(new Decimal(executionData.fillPrice));
              newAvgPrice = oldTotalValue.plus(newTotalValue).div(newQty);
            } else if (executionData.side === 'SELL') {
              const qtySold = new Decimal(executionData.filledQty);
              const marginReleased = qtySold.mul(existingHolding.averagePrice); // Delivery uses 100% margin
              const realizedPnl = qtySold.mul(new Decimal(executionData.fillPrice).minus(existingHolding.averagePrice));

              cashImpact = cashImpact.plus(marginReleased).plus(realizedPnl);
              utilizedMarginImpact = utilizedMarginImpact.minus(marginReleased);
            }

            await tx.holding.update({
              where: { id: existingHolding.id },
              data: {
                quantity: newQty,
                averagePrice: newQty.equals(0) ? new Decimal(0) : newAvgPrice,
              },
            });
          } else {
            if (executionData.side === 'BUY') {
              await tx.holding.create({
                data: {
                  userId: executionData.userId,
                  symbol: executionData.symbol,
                  quantity: signedQty,
                  averagePrice: new Decimal(executionData.fillPrice),
                },
              });
            }

            // Create MTF Liability Ledger tracking loaned capital against this holding
            if (executionData.productType === 'MARGIN' && executionData.side === 'BUY') {
              const orderTotal = new Decimal(executionData.fillPrice).mul(executionData.filledQty);
              const fundedAmount = orderTotal.mul(0.7); // 70% funded by broker
              await tx.mTFLedger.create({
                data: {
                  userId: executionData.userId,
                  orderId: executionData.idempotencyKey,
                  symbol: executionData.symbol,
                  fundedAmount: fundedAmount
                }
              });
            }
          }
        }

        // 3. Gather Wallet Before Updating
        const wallet = await tx.marginWallet.findUnique({
          where: { userId: executionData.userId },
        });

        if (!wallet) throw new Error('Wallet not found for execution');

        // 4. Compute Indian Taxation & Brokerage
        const orderTurnover = new Decimal(executionData.fillPrice).mul(executionData.filledQty);
        const taxes = calculateIndianTaxes(orderTurnover, executionData.side === 'BUY', executionData.productType);

        let initialCashImpact = cashImpact;
        cashImpact = cashImpact.minus(taxes.totalCharges);

        let rollingBalance = new Decimal(wallet.availableCash).plus(initialCashImpact);
        const ledgerEntries = [];

        const logTax = (amount: Decimal, type: any, desc: string) => {
          if (amount.gt(0)) {
            rollingBalance = rollingBalance.minus(amount);
            ledgerEntries.push({
              userId: executionData.userId,
              transactionType: type,
              amount: amount.negated(),
              balanceAfter: rollingBalance,
              referenceId: executionData.idempotencyKey,
              description: desc
            });
          }
        };

        logTax(taxes.brokerage, 'BROKERAGE', `Brokerage for ${executionData.symbol}`);
        logTax(taxes.stt, 'STT', `STT on ${executionData.symbol}`);
        logTax(taxes.stampDuty, 'STAMP_DUTY', `Stamp Duty on ${executionData.symbol}`);
        logTax(taxes.exchangeCharge.plus(taxes.gst), 'EXCHANGE_TXN_CHARGE', `Exchange Charges & GST on ${executionData.symbol}`);

        if (ledgerEntries.length > 0) {
          await tx.ledgerBook.createMany({ data: ledgerEntries });
        }

        // 5. Settle Margin Wallet
        if (!cashImpact.equals(0) || !utilizedMarginImpact.equals(0)) {
          await tx.marginWallet.update({
            where: { userId: executionData.userId },
            data: {
              availableCash: new Decimal(wallet.availableCash).plus(cashImpact),
              utilizedMargin: new Decimal(wallet.utilizedMargin).plus(utilizedMarginImpact),
            },
          });
        }
      });

      this.logger.log(
        `[Settlement] Order ${executionData.idempotencyKey} completely settled for User ${executionData.userId}`,
      );
    } catch (error: any) {
      this.metrics.recordOrderError(executionData?.side ?? 'BUY', 'SETTLEMENT_ERROR');
      this.logger.error(
        `[Settlement] Failed to settle order ${executionData?.idempotencyKey}: ${error.message}`,
      );
    }
  }
}