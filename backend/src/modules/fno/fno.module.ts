import { Module } from '@nestjs/common';
import { MarketDataModule } from '../market-data/market-data.module';
import { BlackScholesService } from './black-scholes.service';
import { OptionsController } from './options.controller';

@Module({
    imports: [MarketDataModule],
    controllers: [OptionsController],
    providers: [BlackScholesService],
    exports: [BlackScholesService]
})
export class FnoModule { }
