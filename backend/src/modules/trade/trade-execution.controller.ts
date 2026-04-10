import { Controller, Logger, Post, Body, Req, HttpCode, HttpStatus } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { Decimal } from 'decimal.js';

@Controller('trade')
export class TradeExecutionController {
  private readonly logger = new Logger(TradeExecutionController.name);

  @Post()
  @HttpCode(HttpStatus.ACCEPTED)
  async initiateTrade(@Req() req: any, @Body() payload: any) {
    this.logger.log(`[API TRIGGERED] POST /trade - Request IP: ${req.ip}`);
    this.logger.log(`[API EXECUTING] Processing trade request for idempotencyKey: ${payload?.idempotencyKey}`);
    
    try {
      this.logger.debug(`[API DATA] Payload received: ${JSON.stringify(payload)}`);
      
      // Simulate immediate execution for Lite Mode
      const simulatedDelay = new Promise(resolve => setTimeout(resolve, 500));
      await simulatedDelay;

      this.logger.log(`[API SUCCESS] Trade request processed successfully for Asset: ${payload?.asset} | Amount: ${payload?.amount}`);
      
      return { status: 'PENDING', message: 'Trade is being processed internally', data: payload };
    } catch (error: any) {
      this.logger.error(`[API FAILED] Error processing trade request: ${error.message}`);
      throw error;
    }
  }

  @OnEvent('market.price-update')
  handleMarketUpdate(payload: any) {
    // Logic for recurring investments or stop-losses would go here
    // Omitting detailed logs here to avoid spamming the console every 2 seconds.
  }
}
