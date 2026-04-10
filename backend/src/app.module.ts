import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { OmsModule } from './modules/oms/oms.module';
import { MarketDataModule } from './modules/market-data/market-data.module';
import { PortfolioModule } from './modules/portfolio/portfolio.module';
import { AuthModule } from './modules/auth/auth.module';
import { FnoModule } from './modules/fno/fno.module';
import { MutualFundsModule } from './modules/mutual-funds/mutual-funds.module';
import { MetricsModule } from './modules/metrics/metrics.module';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    MetricsModule,
    AuthModule,
    OmsModule,
    MarketDataModule,
    PortfolioModule,
    FnoModule,
    MutualFundsModule,
  ],
})
export class AppModule { }
