import { Injectable, Logger, Inject } from '@nestjs/common';
import { Interval } from '@nestjs/schedule';
import { PrismaClient } from '@prisma/client';
import { ClientKafka } from '@nestjs/microservices';
import { MarketDataService } from '../market-data/market-data.service';

const prisma = new PrismaClient();

@Injectable()
export class TriggerEngineService {
    private readonly logger = new Logger(TriggerEngineService.name);

    constructor(
        @Inject('KAFKA_OMS_SERVICE') private readonly kafkaClient: ClientKafka,
        private readonly marketDataService: MarketDataService,
    ) { }

    @Interval(1000)
    async checkTriggers() {
        try {
            const pendingOrders = await prisma.orderBook.findMany({
                where: { status: 'TRIGGER_PENDING' as any },
            });

            for (const order of pendingOrders) {
                const livePrice = this.marketDataService.getLivePrice(order.symbol);
                if (!livePrice || !order.triggerPrice) continue;

                let shouldTrigger = false;

                const triggerPriceNum = order.triggerPrice.toNumber();

                // Standard SL execution logic:
                // Buy SL: Triggers when price RISES to or above triggerPrice.
                // Sell SL: Triggers when price FALLS to or below triggerPrice.
                if (order.side === 'BUY' && livePrice >= triggerPriceNum) {
                    shouldTrigger = true;
                } else if (order.side === 'SELL' && livePrice <= triggerPriceNum) {
                    shouldTrigger = true;
                }

                if (shouldTrigger) {
                    const newOrderType = (order.orderType === 'SL_M' || order.orderType as any === 'SL-M') ? 'MARKET' : 'LIMIT';
                    this.logger.log(`[Trigger Engine] SL Hit for ${order.id}. Converting to ${newOrderType} and routing to Exchange.`);

                    await prisma.orderBook.update({
                        where: { id: order.id },
                        data: {
                            status: 'OPEN' as any,
                        }
                    });

                    const orderEvent = {
                        idempotencyKey: order.id,
                        userId: order.userId,
                        symbol: order.symbol,
                        side: order.side,
                        orderType: newOrderType,
                        productType: order.productType,
                        requestedQty: order.requestedQty.toNumber(),
                        price: order.price ? order.price.toNumber() : undefined,
                        status: 'OPEN',
                    };

                    // Emitting directly to exchange routing processor. Margin was already blocked during MarginCheck phase!
                    this.kafkaClient.emit('order-validated', JSON.stringify(orderEvent));
                }
            }
        } catch (err: any) {
            this.logger.error(`[Trigger Engine] Polling Error: ${err.message}`);
        }
    }
}
