import { Module } from '@nestjs/common';
import { OrdersService } from './orders.service';
import { OrdersController } from './orders.controller';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { NATS_SERVICE } from 'src/config/services';
import { env } from 'src/config/env';

@Module({
  controllers: [OrdersController],
  providers: [OrdersService],  // if you don't use constants an joi for validation, you can use  env variable directly but with registerAsync],
  imports: [
    ClientsModule.register([
      {
        name: NATS_SERVICE,
        transport: Transport.NATS,
        options: {
          servers: env.natsServers,
        },
      },
    ]),
  ],
})
export class OrdersModule { }
