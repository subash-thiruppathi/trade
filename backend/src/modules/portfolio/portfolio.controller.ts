import { Controller, Get, Param, Logger } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

@Controller('portfolio')
export class PortfolioController {
  private readonly logger = new Logger(PortfolioController.name);

  @Get(':userId/margin')
  async getMarginWallet(@Param('userId') userId: string) {
    const wallet = await prisma.marginWallet.findUnique({
      where: { userId },
    });
    return wallet || { availableCash: 0, utilizedMargin: 0 };
  }

  @Get(':userId/positions')
  async getPositions(@Param('userId') userId: string) {
    return prisma.position.findMany({
      where: { userId },
    });
  }

  @Get(':userId/holdings')
  async getHoldings(@Param('userId') userId: string) {
    return prisma.holding.findMany({
      where: { userId },
    });
  }

  @Get(':userId/orders')
  async getOrders(@Param('userId') userId: string) {
    return prisma.orderBook.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 100
    });
  }

  @Get(':userId/ledger')
  async getLedger(@Param('userId') userId: string) {
    return prisma.ledgerBook.findMany({
      where: { userId },
      orderBy: { timestamp: 'desc' },
      take: 50 // Limit to latest 50 for fast rendering
    });
  }
}