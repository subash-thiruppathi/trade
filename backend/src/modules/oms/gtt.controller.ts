import { Controller, Post, Body, Req, Logger, Get, Param } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export interface CreateGTTDto {
    userId: string;
    symbol: string;
    side: 'BUY' | 'SELL';
    productType: 'INTRADAY' | 'DELIVERY' | 'MARGIN';
    triggerType: 'SINGLE' | 'OCO';
    quantity: number;
    triggerPrice?: number;
    limitPrice?: number;
    stopLossTriggerPrice?: number;
    stopLossLimitPrice?: number;
    targetTriggerPrice?: number;
    targetLimitPrice?: number;
}

@Controller('gtt')
export class GttController {
    private readonly logger = new Logger(GttController.name);

    // Fetch GTTs for a user
    @Get(':userId')
    async getUserGTTs(@Param('userId') userId: string) {
        const gtts = await prisma.gTTOrder.findMany({
            where: { userId },
            orderBy: { createdAt: 'desc' }
        });
        return gtts;
    }

    // Create simple GTT (margin is ONLY blocked when it triggers)
    @Post()
    async createGTT(@Req() req: any, @Body() payload: CreateGTTDto) {
        this.logger.log(`[GTT API] Creating off-market trigger: ${payload.side} ${payload.symbol}`);

        const gtt = await prisma.gTTOrder.create({
            data: {
                userId: payload.userId,
                symbol: payload.symbol,
                side: payload.side,
                triggerType: payload.triggerType,
                productType: payload.productType,
                quantity: payload.quantity,

                triggerPrice: payload.triggerPrice,
                limitPrice: payload.limitPrice,

                stopLossTriggerPrice: payload.stopLossTriggerPrice,
                stopLossLimitPrice: payload.stopLossLimitPrice,
                targetTriggerPrice: payload.targetTriggerPrice,
                targetLimitPrice: payload.targetLimitPrice,

                status: 'ACTIVE'
            }
        });

        return {
            status: 'success',
            message: 'GTT Order created successfully. Waiting for trigger.',
            data: gtt
        };
    }
}
