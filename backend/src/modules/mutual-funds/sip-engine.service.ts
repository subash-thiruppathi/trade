import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { Cron, CronExpression } from '@nestjs/schedule';

const prisma = new PrismaClient();

@Injectable()
export class SipEngineService implements OnModuleInit {
    private readonly logger = new Logger(SipEngineService.name);

    async onModuleInit() {
        this.logger.log('SIP Engine Initialized. Checking parameters...');
        await this.seedMutualFunds();
    }

    // Purely to provide data for the frontend to render since we don't have a live MF provider
    private async seedMutualFunds() {
        const count = await prisma.mutualFund.count();
        if (count === 0) {
            await prisma.mutualFund.createMany({
                data: [
                    { schemeCode: 'QUANTEQ', schemeName: 'Quant Active Fund Direct-Growth', amc: 'Quant Mutual', nav: 642.11, aum: 8520, category: 'Multi Cap', threeYearReturn: 32.4, oneYearReturn: 41.2 },
                    { schemeCode: 'PARAGFLEX', schemeName: 'Parag Parikh Flexi Cap Direct-Growth', amc: 'PPFAS', nav: 76.54, aum: 54000, category: 'Flexi Cap', threeYearReturn: 21.8, oneYearReturn: 36.1 },
                    { schemeCode: 'NIPPONSMAL', schemeName: 'Nippon India Small Cap Direct-Growth', amc: 'Nippon', nav: 184.22, aum: 43210, category: 'Small Cap', threeYearReturn: 42.1, oneYearReturn: 52.8 },
                    { schemeCode: 'SBICONTRA', schemeName: 'SBI Contra Direct Plan-Growth', amc: 'SBI Mutual', nav: 351.78, aum: 22100, category: 'Contra', threeYearReturn: 28.9, oneYearReturn: 40.5 },
                    { schemeCode: 'HDFCMID', schemeName: 'HDFC Mid-Cap Opportunities Direct-Growth', amc: 'HDFC', nav: 198.45, aum: 56000, category: 'Mid Cap', threeYearReturn: 24.5, oneYearReturn: 38.2 }
                ]
            });
            this.logger.log('Seeded top 5 Indian Mutual Funds into Database.');
        }
    }

    // Runs every day at 9 AM to process SIPs
    // For sandbox testing, we will run it every 1 minute so the user sees it work instantly!
    @Cron(CronExpression.EVERY_MINUTE)
    async executeScheduledSips() {
        this.logger.log('Sweeping for pending SIP Subscriptions...');

        // Find all Active SIPs whose nextExecutionDate is <= NOW
        const pendingSips = await prisma.sipSubscription.findMany({
            where: {
                status: 'ACTIVE',
                nextExecutionDate: { lte: new Date() }
            },
            include: { mutualFund: true }
        });

        if (pendingSips.length === 0) return;

        this.logger.log(`Found ${pendingSips.length} ripe SIP(s). Executing automated investments...`);

        for (const sip of pendingSips) {
            await this.processSip(sip);
        }
    }

    private async processSip(sip: any) {
        // We execute entirely inside a Transaction to guarantee absolute atomicity
        await prisma.$transaction(async (tx) => {
            // 1. Fetch Wallet
            const wallet = await tx.marginWallet.findUnique({ where: { userId: sip.userId } });
            if (!wallet) return; // Silent fail if no wallet

            const requiredMargin = sip.amount;

            // 1. Advance the execution date regardless of failure/success so it doesn't spam rejections every 60 seconds!
            const nextDate = new Date(sip.nextExecutionDate);
            if (sip.frequency === 'DAILY') nextDate.setDate(nextDate.getDate() + 1);
            else if (sip.frequency === 'WEEKLY') nextDate.setDate(nextDate.getDate() + 7);
            else if (sip.frequency === 'MONTHLY') nextDate.setMonth(nextDate.getMonth() + 1);

            await tx.sipSubscription.update({
                where: { id: sip.id },
                data: { nextExecutionDate: nextDate }
            });

            // 2. If user lacks funds, we mark SIP as FAILED for this period
            if (Number(wallet.availableCash) < Number(requiredMargin)) {
                this.logger.warn(`SIP ${sip.id} skipped due to insufficient margin.`);

                // Write failure natively explicitly to OrderBook!
                await tx.orderBook.create({
                    data: {
                        userId: sip.userId,
                        symbol: sip.mutualFund.schemeCode,
                        side: 'BUY',
                        orderType: 'MARKET',
                        productType: 'DELIVERY',
                        requestedQty: 0,
                        filledQty: 0,
                        price: sip.mutualFund.nav,
                        status: 'REJECTED',
                        averagePrice: 0,
                    }
                });
                return;
            }

            // 3. Deduct Funds Immutably
            const updatedWallet = await tx.marginWallet.update({
                where: { userId: sip.userId },
                data: { availableCash: { decrement: requiredMargin } }
            });

            // 4. Immutably track the SIP deduction via the Ledger
            await tx.ledgerBook.create({
                data: {
                    userId: sip.userId,
                    transactionType: 'WITHDRAWAL', // Using WITHDRAWAL to denote capital going into MF
                    amount: Number(requiredMargin) * -1,
                    balanceAfter: updatedWallet.availableCash,
                    referenceId: sip.id,
                    description: `SIP Installment: ${sip.mutualFund.schemeCode}`
                }
            });

            // 5. Calculate Allotted Units mathematically
            const allottedUnits = Number(requiredMargin) / Number(sip.mutualFund.nav);

            // 6. Write successful conversion implicitly to OrderBook!
            await tx.orderBook.create({
                data: {
                    userId: sip.userId,
                    symbol: sip.mutualFund.schemeCode,
                    side: 'BUY',
                    orderType: 'MARKET',
                    productType: 'DELIVERY',
                    requestedQty: allottedUnits,
                    filledQty: allottedUnits,
                    price: sip.mutualFund.nav,
                    status: 'EXECUTED',
                    averagePrice: sip.mutualFund.nav,
                }
            });

            // 7. Place it in user's Holdings
            const existingHolding = await tx.holding.findFirst({
                where: { userId: sip.userId, symbol: sip.mutualFund.schemeCode }
            });

            if (existingHolding) {
                const newQty = Number(existingHolding.quantity) + allottedUnits;
                const totalInvested = (Number(existingHolding.averagePrice) * Number(existingHolding.quantity)) + Number(requiredMargin);
                const newAvg = totalInvested / newQty;

                await tx.holding.update({
                    where: { id: existingHolding.id },
                    data: {
                        quantity: newQty,
                        averagePrice: newAvg
                    }
                });
            } else {
                await tx.holding.create({
                    data: {
                        userId: sip.userId,
                        symbol: sip.mutualFund.schemeCode,
                        quantity: allottedUnits,
                        averagePrice: sip.mutualFund.nav
                    }
                });
            }

            this.logger.log(`Successfully executed SIP for ${sip.mutualFund.schemeCode} (Amount: ₹${sip.amount}). Allotted ${allottedUnits.toFixed(4)} Units.`);
        });
    }
}
