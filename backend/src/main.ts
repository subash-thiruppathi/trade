import { NestFactory } from '@nestjs/core';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import { AppModule } from './app.module';
import { MetricsInterceptor } from './modules/metrics/metrics.interceptor';
import { MetricsService } from './modules/metrics/metrics.service';
import * as fs from 'fs'; // Required to read the certificates
import * as path from 'path';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  const metricsService = app.get(MetricsService);
  app.useGlobalInterceptors(new MetricsInterceptor(metricsService));

  // Determine the path to certificates (Render uses /etc/secrets)
  const isCloud = process.env.RENDER === 'true';
  const certPath = isCloud ? '/etc/secrets' : path.join(process.cwd(), 'certs');

  app.connectMicroservice<MicroserviceOptions>({
    transport: Transport.KAFKA,
    options: {
      client: {
        clientId: 'oms-consumer',
        brokers: [process.env.KAFKA_BROKER_URL],
        // SSL Configuration for Aiven
        ssl: {
          rejectUnauthorized: true,
          ca: [fs.readFileSync(path.join(certPath, 'ca.pem'), 'utf-8')],
          key: fs.readFileSync(path.join(certPath, 'service.key'), 'utf-8'),
          cert: fs.readFileSync(path.join(certPath, 'service.cert'), 'utf-8'),
        },
      },
      consumer: {
        groupId: 'oms-consumer-group',
        allowAutoTopicCreation: true,
      },
    },
  });

  app.enableCors({
    origin: [
      'https://trade-drab-five.vercel.app',                           // 🟢 Add this (Main Production)
      'https://trade-ntxsdw8cl-subash-thiruppathys-projects.vercel.app', // (Specific Deployment)
      'http://localhost:3000',                                        // (Local Frontend usually runs on 3000)
      'http://localhost:3002',                                        // (Your local backend port)
    ],
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS', // 🟢 Added OPTIONS
    credentials: true,
  });
  await app.startAllMicroservices();

  // Use Render's PORT environment variable
  const port = process.env.PORT || 3001;
  await app.listen(port);

  // src/main.ts - Add these logs right before app.connectMicroservice
  // const isCloud = process.env.RENDER === 'true';
  // const certPath = isCloud ? '/etc/secrets' : path.join(process.cwd(), 'certs');

  console.log('🔍 Debugging Kafka Connection:');
  console.log('Path:', certPath);
  console.log('Broker:', process.env.KAFKA_BROKER_URL);

  try {
    const ca = fs.readFileSync(path.join(certPath, 'ca.pem'), 'utf-8');
    const key = fs.readFileSync(path.join(certPath, 'service.key'), 'utf-8');
    const cert = fs.readFileSync(path.join(certPath, 'service.cert'), 'utf-8');

    console.log('✅ Certs found. CA Length:', ca.length);
    console.log('✅ Key found. Key Length:', key.length);
    console.log('✅ Cert found. Cert Length:', cert.length);
  } catch (err) {
    console.error('❌ CRITICAL: Could not read cert files!', err.message);
  }

  console.log(`🚀 Backend is running on port ${port}`);
  console.log('📨 Kafka connected via SSL (Aiven Cloud)');
}

bootstrap();