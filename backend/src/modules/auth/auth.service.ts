import { Injectable, UnauthorizedException, ConflictException, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(private jwtService: JwtService) { }

  async register(data: any) {
    try {
      const existingUser = await prisma.user.findFirst({
        where: { OR: [{ email: data.email }, { phone: data.phone }] },
      });

      if (existingUser) {
        throw new ConflictException('User with this email or phone already exists');
      }

      const hashedPassword = await bcrypt.hash(data.password, 10);

      // Create User and their Margin Wallet in a transaction
      const user = await prisma.$transaction(async (tx) => {
        const newUser = await tx.user.create({
          data: {
            email: data.email,
            phone: data.phone,
            password: hashedPassword,
          },
        });

        // Initialize Margin Wallet with zero balance
        // (In a real app, users would fund this via a payment gateway later)
        await tx.marginWallet.create({
          data: {
            userId: newUser.id,
            availableCash: 100000,
            utilizedMargin: 0,
            collateralMargin: 0,
          },
        });

        return newUser;
      });

      this.logger.log(`[Auth] Registered new user: ${user.id}`);

      // Return JWT Token immediately after registration
      return this.login(user);
    } catch (error: any) {
      if (error instanceof ConflictException) throw error;
      this.logger.error(`[Auth] Registration Failed: ${error.message}`);
      throw new Error('Internal server error during registration');
    }
  }

  async validateUser(email: string, pass: string): Promise<any> {
    const user = await prisma.user.findUnique({ where: { email } });
    if (user && await bcrypt.compare(pass, user.password)) {
      const { password, ...result } = user;
      return result;
    }
    return null;
  }

  async login(user: any) {
    const payload = { email: user.email, sub: user.id };
    return {
      access_token: this.jwtService.sign(payload),
      user: {
        id: user.id,
        email: user.email,
        phone: user.phone,
        kycStatus: user.kycStatus,
      },
    };
  }
}
