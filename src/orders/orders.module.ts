import { Module } from '@nestjs/common';
import { OrdersService } from './orders.service';
import { OrdersController } from './orders.controller';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { PRODUCT_SERVICE } from 'src/config/services';
import { env } from 'src/config/env';

@Module({
  controllers: [OrdersController],
  providers: [OrdersService] ,  // if you don't use constants an joi for validation, you can use  env variable directly but with registerAsync],
  imports: [
    ClientsModule.register([
      {
        name: PRODUCT_SERVICE,
        transport: Transport.TCP,
        options: {
          host: env.productsMicroserviceHost,
          port: env.productsMicroservicePort,
        },
      },
    ]),
  ],
})
export class OrdersModule { }
