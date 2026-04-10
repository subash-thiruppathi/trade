import { Module } from '@nestjs/common';
import { MutualFundsController } from './mutual-funds.controller';
import { SipEngineService } from './sip-engine.service';

@Module({
    controllers: [MutualFundsController],
    providers: [SipEngineService],
})
export class MutualFundsModule { }
