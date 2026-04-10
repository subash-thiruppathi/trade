import { Injectable } from '@nestjs/common';
import { InjectMetric } from '@willsoto/nestjs-prometheus';
import { Counter, Histogram } from 'prom-client';

@Injectable()
export class MetricsService {
    constructor(
        @InjectMetric('trade_orders_total')
        public readonly ordersTotal: Counter<string>,

        @InjectMetric('trade_order_errors_total')
        public readonly orderErrorsTotal: Counter<string>,

        @InjectMetric('http_request_duration_seconds')
        public readonly httpDuration: Histogram<string>,

        @InjectMetric('kafka_messages_consumed_total')
        public readonly kafkaConsumedTotal: Counter<string>,
    ) { }

    /** Call when an order is placed successfully */
    recordOrder(side: 'BUY' | 'SELL') {
        this.ordersTotal.inc({ side });
    }

    /** Call when an order fails */
    recordOrderError(side: 'BUY' | 'SELL', reason: string) {
        this.orderErrorsTotal.inc({ side, reason });
    }

    /** Call when a Kafka message is consumed */
    recordKafkaMessage(topic: string) {
        this.kafkaConsumedTotal.inc({ topic });
    }
}
