import { Controller, Get, Post, Body, Param } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

@Controller('mutual-funds')
export class MutualFundsController {

    @Get('explore')
    async exploreFunds() {
        return prisma.mutualFund.findMany({
            orderBy: { threeYearReturn: 'desc' }
        });
    }

    @Get(':userId/sips')
    async getUserSips(@Param('userId') userId: string) {
        return prisma.sipSubscription.findMany({
            where: { userId },
            include: { mutualFund: true }
        });
    }

    @Post('start-sip')
    async startSip(@Body() payload: { userId: string, mutualFundId: string, amount: number, frequency: 'DAILY' | 'WEEKLY' | 'MONTHLY' }) {
        // Set First Execution Date to exactly 1 minute from now so user can see it run!
        const nextExecution = new Date();
        nextExecution.setMinutes(nextExecution.getMinutes() + 1);

        const sub = await prisma.sipSubscription.create({
            data: {
                userId: payload.userId,
                mutualFundId: payload.mutualFundId,
                amount: payload.amount,
                frequency: payload.frequency,
                nextExecutionDate: nextExecution
            }
        });

        return { status: 'success', subscription: sub };
    }

    @Post(':id/cancel')
    async cancelSip(@Param('id') id: string) {
        return prisma.sipSubscription.update({
            where: { id },
            data: { status: 'CANCELLED' }
        });
    }
}
