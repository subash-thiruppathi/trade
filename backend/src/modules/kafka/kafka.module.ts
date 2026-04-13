// src/modules/kafka/kafka.module.ts
import { Global, Module } from '@nestjs/common';
import { ClientsModule, Transport } from '@nestjs/microservices';
import * as fs from 'fs';
import * as path from 'path';

// This determines if we are running on Render or locally
const isCloud = process.env.RENDER === 'true';
const certPath = isCloud ? '/etc/secrets' : path.join(process.cwd(), 'certs');

@Global() // Making it global so you don't have to import it everywhere
@Module({
  imports: [
    ClientsModule.register([
      {
        name: 'KAFKA_OMS_SERVICE',
        transport: Transport.KAFKA,
        options: {
          client: {
            clientId: 'trading-producer',
            brokers: [process.env.KAFKA_BROKER_URL],
            ssl: {
              rejectUnauthorized: true,
              ca: [fs.readFileSync(path.join(certPath, 'ca.pem'), 'utf-8')],
              key: fs.readFileSync(path.join(certPath, 'service.key'), 'utf-8'),
              cert: fs.readFileSync(path.join(certPath, 'service.cert'), 'utf-8'),
            },
          },
          consumer: {
            groupId: 'trading-producer-group',
          },
        },
      },
    ]),
  ],
  exports: [ClientsModule],
})
export class KafkaModule { }