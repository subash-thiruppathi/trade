import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { MarketDataService } from './market-data.service';
import { MarketWebSocketGateway } from './market-websocket.gateway';

@Module({
  imports: [ScheduleModule.forRoot()],
  providers: [
    MarketWebSocketGateway,
    MarketDataService,
  ],
  exports: [MarketDataService]
})
export class MarketDataModule { }