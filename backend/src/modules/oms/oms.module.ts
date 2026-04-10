import { Module } from '@nestjs/common';
import { KafkaModule } from '../kafka/kafka.module';
import { OrderController } from './order.controller';
import { MarginCheckProcessor } from './margin-check.processor';
import { ExchangeRoutingProcessor } from './exchange-routing.processor';
import { OrderSettlementProcessor } from './order-settlement.processor';
import { MarketDataModule } from '../market-data/market-data.module';
import { TriggerEngineService } from './trigger-engine.service';
import { GttController } from './gtt.controller';
import { MetricsModule } from '../metrics/metrics.module';

@Module({
  imports: [KafkaModule, MarketDataModule, MetricsModule],
  controllers: [
    OrderController,
    MarginCheckProcessor,
    ExchangeRoutingProcessor,
    OrderSettlementProcessor,
    GttController,
  ],
  providers: [TriggerEngineService],
})
export class OmsModule { }