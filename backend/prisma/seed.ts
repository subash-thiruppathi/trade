import { PrismaClient, KycStatus } from '@prisma/client';
import { Decimal } from 'decimal.js';

const prisma = new PrismaClient();

async function main() {
  const userId = 'user-123';

  console.log(`Seeding database for mock user: ${userId}...`);

  // 1. Create the User (if they don't exist)
  const user = await prisma.user.upsert({
    where: { id: userId },
    update: {},
    create: {
      id: userId,
      email: 'protrader@example.com',
      phone: '+919876543210',
      password: 'mockHashedPassword123', // Required by new schema
      kycStatus: KycStatus.APPROVED,
    },
  });

  // 2. Create the Margin Wallet with ₹50,000 initial balance
  await prisma.marginWallet.upsert({
    where: { userId: userId },
    update: {
      availableCash: new Decimal(50000.00), // Reset balance to 50k on re-run
    },
    create: {
      userId: userId,
      availableCash: new Decimal(50000.00),
      utilizedMargin: new Decimal(0.00),
      collateralMargin: new Decimal(0.00),
    },
  });

  console.log('✅ Successfully seeded User and MarginWallet with ₹50,000!');
}

main()
  .catch((e) => {
    console.error('Failed to seed database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
