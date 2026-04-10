import { Module } from '@nestjs/common';
import { ClientsModule, Transport } from '@nestjs/microservices';

@Module({
  imports: [
    ClientsModule.register([
      {
        name: 'KAFKA_OMS_SERVICE',
        transport: Transport.KAFKA,
        options: {
          client: {
            clientId: 'oms-producer',
            brokers: [process.env.KAFKA_BROKER_URL || 'localhost:9092'],
          },
          consumer: {
            groupId: 'oms-producer-group',
          },
        },
      },
    ]),
  ],
  exports: [ClientsModule],
})
export class KafkaModule {}
