import {
  Controller,
  Post,
  Body,
  Req,
  Logger,
  Inject,
  HttpException,
  HttpStatus,
  OnModuleInit,
} from '@nestjs/common';
import { ClientKafka } from '@nestjs/microservices';
import { v4 as uuidv4 } from 'uuid';
import { MetricsService } from '../metrics/metrics.service';

export interface CreateOrderDto {
  userId: string;
  symbol: string;
  side: 'BUY' | 'SELL';
  orderType: 'MARKET' | 'LIMIT' | 'SL' | 'SL_M';
  productType: 'DELIVERY' | 'INTRADAY' | 'MARGIN';
  requestedQty: number;
  price?: number;
  triggerPrice?: number;
}

@Controller('order')
export class OrderController implements OnModuleInit {
  private readonly logger = new Logger(OrderController.name);

  constructor(
    @Inject('KAFKA_OMS_SERVICE') private readonly kafkaClient: ClientKafka,
    private readonly metrics: MetricsService,
  ) { }

  async onModuleInit() {
    // For fire-and-forget emit() patterns no reply subscription is needed.
    // This hook is kept for future request-reply (send()) use cases.
    await this.kafkaClient.connect();
    this.logger.log('[OMS API] Kafka producer connected.');
  }

  @Post()
  async placeOrder(@Req() req: any, @Body() payload: CreateOrderDto) {
    this.logger.log(
      `[OMS API] Received Order Request: ${payload.side} ${payload.requestedQty} ${payload.symbol}`,
    );

    if (
      !payload.userId ||
      !payload.symbol ||
      !payload.side ||
      !payload.orderType ||
      !payload.productType ||
      !payload.requestedQty
    ) {
      this.metrics.recordOrderError(payload.side ?? 'BUY', 'MISSING_FIELDS');
      throw new HttpException(
        'Missing required order fields',
        HttpStatus.BAD_REQUEST,
      );
    }

    if (payload.requestedQty <= 0) {
      throw new HttpException(
        'Quantity must be greater than 0',
        HttpStatus.BAD_REQUEST,
      );
    }

    if (payload.orderType === 'LIMIT' && !payload.price) {
      throw new HttpException(
        'Limit orders require a price',
        HttpStatus.BAD_REQUEST,
      );
    }

    if ((payload.orderType === 'SL' || payload.orderType === 'SL_M') && !payload.triggerPrice) {
      throw new HttpException(
        'Stop-Loss orders require a triggerPrice',
        HttpStatus.BAD_REQUEST,
      );
    }

    const idempotencyKey = uuidv4();

    const orderEvent = {
      idempotencyKey,
      ...payload,
      timestamp: new Date().toISOString(),
    };

    // Publish to Kafka topic 'order-received'
    this.kafkaClient.emit('order-received', JSON.stringify(orderEvent));
    this.metrics.recordOrder(payload.side);
    this.logger.log(
      `[OMS API] Published 'order-received' event for idempotencyKey: ${idempotencyKey}`,
    );

    return {
      status: 'PENDING',
      message: 'Order received and sent for margin validation.',
      idempotencyKey,
    };
  }
}
