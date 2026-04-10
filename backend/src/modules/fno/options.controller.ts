import { Controller, Get, Param, Query, BadRequestException } from '@nestjs/common';
import { BlackScholesService } from './black-scholes.service';

@Controller('fno')
export class OptionsController {
    constructor(private readonly blackScholesService: BlackScholesService) { }

    @Get('option-chain/:symbol')
    async getOptionChain(
        @Param('symbol') symbol: string,
        @Query('strikes') strikes?: string,
        @Query('expiryDays') expiryDays?: string
    ) {
        try {
            const strikeCount = strikes ? parseInt(strikes, 10) : 10;
            const days = expiryDays ? parseInt(expiryDays, 10) : 7;

            const chain = await this.blackScholesService.generateOptionChain(symbol, strikeCount, days);

            return {
                status: 'success',
                data: chain
            };
        } catch (err: any) {
            throw new BadRequestException(err.message);
        }
    }
}
