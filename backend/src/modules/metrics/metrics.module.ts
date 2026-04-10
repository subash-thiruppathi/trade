import { Module } from '@nestjs/common';
import {
    PrometheusModule,
    makeCounterProvider,
    makeHistogramProvider,
} from '@willsoto/nestjs-prometheus';
import { MetricsService } from './metrics.service';
import { MetricsInterceptor } from './metrics.interceptor';

@Module({
    imports: [
        PrometheusModule.register({
            path: '/metrics',
            defaultMetrics: {
                enabled: true,
            },
        }),
    ],
    providers: [
        MetricsService,
        MetricsInterceptor,

        // --- Business Metrics ---
        makeCounterProvider({
            name: 'trade_orders_total',
            help: 'Total number of orders placed',
            labelNames: ['side'],
        }),
        makeCounterProvider({
            name: 'trade_order_errors_total',
            help: 'Total number of order errors',
            labelNames: ['side', 'reason'],
        }),
        makeCounterProvider({
            name: 'kafka_messages_consumed_total',
            help: 'Total Kafka messages consumed by topic',
            labelNames: ['topic'],
        }),

        // --- HTTP Metrics ---
        makeHistogramProvider({
            name: 'http_request_duration_seconds',
            help: 'HTTP request duration in seconds',
            labelNames: ['method', 'route', 'status_code'],
            buckets: [0.01, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10],
        }),
    ],
    exports: [MetricsService, MetricsInterceptor],
})
export class MetricsModule { }
