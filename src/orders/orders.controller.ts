import { Controller, Logger, ParseUUIDPipe} from '@nestjs/common';
import { EventPattern, MessagePattern, Payload } from '@nestjs/microservices';
import { OrdersService } from './orders.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { ChangeOrderStatusDto, OrderPaginationDto } from './dto';
import { PaidOrderDto } from './dto/paid-order.dto';

@Controller()
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  ordersLogger = new Logger('Microservice Orders');

  @MessagePattern({ cmd: 'create_order' })
  async create(@Payload() createOrderDto: CreateOrderDto) {;

    const order = await this.ordersService.create(createOrderDto);
    this.ordersLogger.log(`Order created: ${JSON.stringify(order)}`);
    const paymentSession = await this.ordersService.createPaymentSession(order)
    this.ordersLogger.log(`Payment Session created`, paymentSession);
    return {
      order,
      paymentSession,
    }
  }

  @MessagePattern({ cmd: 'find_all_orders' })
  findAll(@Payload() orderPaginationDto: OrderPaginationDto ) {
    return this.ordersService.findAll(orderPaginationDto);
  }

  @MessagePattern({cmd:'find_order_by_id'})
  findOne(@Payload('id', ParseUUIDPipe ) id: string) {
    return this.ordersService.findOne(id);
  }

  @MessagePattern({ cmd: 'update_order_status' })
  update(@Payload() changeOrderStatusDto: ChangeOrderStatusDto) {
    return this.ordersService.changeStatus(changeOrderStatusDto)
  }

  // escuchar el evento payment.succeeded
  @EventPattern('payment.succeeded')
  paidOrder(@Payload() paidOrderDto: PaidOrderDto ) {
    return this.ordersService.paidOrder( paidOrderDto );
  }

}
