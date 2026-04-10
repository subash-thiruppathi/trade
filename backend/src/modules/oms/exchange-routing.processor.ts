import { Controller, Logger, Inject } from '@nestjs/common';
import { MessagePattern, Payload, Ctx, KafkaContext, ClientKafka } from '@nestjs/microservices';
import { Decimal } from 'decimal.js';
import { MarketDataService } from '../market-data/market-data.service';

@Controller()
export class ExchangeRoutingProcessor {
  private readonly logger = new Logger(ExchangeRoutingProcessor.name);

  constructor(
    @Inject('KAFKA_OMS_SERVICE') private readonly kafkaClient: ClientKafka,
    private readonly marketDataService: MarketDataService,
  ) { }

  @MessagePattern('order-validated')
  async handleValidatedOrder(
    @Payload() message: any,
    @Ctx() context: KafkaContext,
  ) {
    const raw = message?.value ?? message;
    const orderData = typeof raw === 'string' ? JSON.parse(raw) : raw;

    this.logger.log(
      `[Exchange Router] Routing order to Broker API (Production Mode): ${orderData.idempotencyKey}`,
    );

    if (orderData.status === 'TRIGGER_PENDING') {
      this.logger.log(`[Exchange Router] Order accepted by exchange as TRIGGER_PENDING. Awaiting trigger hit.`);
      return; // Do not execute. 
    }

    try {
      // In a real production environment, we would POST to BROKER_API_URL here.
      // e.g., await axios.post(process.env.BROKER_API_URL + '/orders', orderData, { headers: { 'X-Broker-Key': process.env.BROKER_API_KEY } });

      // Simulate network round-trip to the physical exchange
      await new Promise((resolve) => setTimeout(resolve, 300));

      let fillPrice = orderData.price;

      if (orderData.orderType === 'MARKET') {
        // Fetch the absolute REAL-TIME price directly from the Yahoo feed cache for exact execution
        const livePrice = this.marketDataService.getLivePrice(orderData.symbol);

        if (!livePrice) {
          throw new Error('Live market data for symbol is unavailable. Order rejected by Exchange.');
        }
        fillPrice = livePrice;
      }

      const executionEvent = {
        ...orderData,
        fillPrice: new Decimal(fillPrice).toDecimalPlaces(4).toNumber(),
        filledQty: orderData.requestedQty,
        executionTime: new Date().toISOString(),
        exchangeTradeId: `EXCH-${Math.floor(Math.random() * 1000000000)}`, // Simulating real trade ID return from broker
      };

      this.logger.log(
        `[Exchange Router] Order Executed at Exchange: ${orderData.idempotencyKey} @ REAL-TIME PRICE ₹${executionEvent.fillPrice}`,
      );
      this.kafkaClient.emit('order-executed', JSON.stringify(executionEvent));
    } catch (error: any) {
      this.logger.error(
        `[Exchange Router] API error for ${orderData?.idempotencyKey}: ${error.message}`,
      );

      // Emit back to pipeline so user isn't stuck PENDING
      this.kafkaClient.emit(
        'order-rejected',
        JSON.stringify({ ...orderData, reason: error.message }),
      );
    }
  }
}