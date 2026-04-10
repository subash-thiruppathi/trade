import { NestFactory } from '@nestjs/core';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import { AppModule } from './app.module';
import { MetricsInterceptor } from './modules/metrics/metrics.interceptor';
import { MetricsService } from './modules/metrics/metrics.service';

async function bootstrap() {
  // Create hybrid app: HTTP server + Kafka microservice consumer
  const app = await NestFactory.create(AppModule);

  // Register HTTP duration interceptor globally
  const metricsService = app.get(MetricsService);
  app.useGlobalInterceptors(new MetricsInterceptor(metricsService));

  // Attach Kafka microservice (consumer side — listens to OMS topics)
  app.connectMicroservice<MicroserviceOptions>({
    transport: Transport.KAFKA,
    options: {
      client: {
        clientId: 'oms-consumer',
        brokers: [process.env.KAFKA_BROKER_URL || 'localhost:9092'],
      },
      consumer: {
        groupId: 'oms-consumer-group',
        allowAutoTopicCreation: true,
      },
    },
  });

  app.enableCors();

  // Start microservice consumers BEFORE HTTP server
  await app.startAllMicroservices();
  await app.listen(3001);

  console.log('🚀 Backend is running on http://localhost:3001');
  console.log('📨 Kafka consumer connected — OMS pipeline is LIVE');
  console.log('📊 Prometheus metrics available at http://localhost:3001/metrics');
}

bootstrap();