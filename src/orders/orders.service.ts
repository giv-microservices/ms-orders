import { HttpStatus, Inject, Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { CreateOrderDto } from './dto/create-order.dto';
import { PrismaClient } from '@prisma/client';
import { OrderPaginationDto } from './dto/order-pagination.dto';
import { ClientProxy, RpcException } from '@nestjs/microservices';
import { ChangeOrderStatusDto, OrderItemDto } from './dto';
import { firstValueFrom } from 'rxjs';
import { ProductItem } from 'src/common/types';
import { NATS_SERVICE } from 'src/config/services';


@Injectable()
export class OrdersService extends PrismaClient implements OnModuleInit {


  private readonly logger = new Logger(OrdersService.name);


  constructor(
    @Inject(NATS_SERVICE) private readonly client: ClientProxy,
  ) {
    super();
  }


  async onModuleInit() {
    await this.$connect();
    this.logger.log('OrdersService initialized');
  }



  async create(createOrderDto: CreateOrderDto) {
    try {

      // verifyProducts
      const verifiedProducts: ProductItem[] = await firstValueFrom(
        this.client.send({ cmd: 'validate_products' },
          createOrderDto.items.map(p => p.productId)
        ))
      this.logger.log(verifiedProducts);
      // calculate amounts
      const totalAmount = createOrderDto.items.reduce((acc: number, orderItem: OrderItemDto) => {
        const price = verifiedProducts.find(p => p.id === orderItem.productId).price;
        return acc + price * orderItem.quantity;
      }, 0)

      // transaction, prisma creates automatically a transaction if tables are related


      const order = await this.order.create({
        data: {
          totalAmount,
          totalItems: totalAmount,
          OrderItem: {
            createMany: {
              data: createOrderDto.items.map(item => {
                return {
                  quantity: item.quantity,
                  productId: item.productId,
                  price: verifiedProducts.find(p => p.id === item.productId).price,
                }
              })
            }
          }
        },
        // include: {
        //   OrderItem: {
        //     select: {
        //       quantity: true,
        //       price: true,
        //       productId: true,
        //     }
        //   }
        // }
      })

      const orderResume = createOrderDto.items.map(item => {
        const product = verifiedProducts.find(p => p.id === item.productId);
        return {
          quantity: item.quantity,
          productId: item.productId,
          price: product.price,
          name: product.name,
        };
      });
      return { order, detail: orderResume };
    } catch (error) {
      throw new RpcException({ status: HttpStatus.BAD_REQUEST, message: error.message });
    }
  }

  async findAll(orderPaginationDto: OrderPaginationDto) {
    const { page = 1, limit = 10 } = orderPaginationDto;
    const total = await this.order.count({
      where: {
        status: orderPaginationDto.status
      }
    });

    const currentPage = orderPaginationDto.page;
    const perPage = orderPaginationDto.limit;


    return {
      data: await this.order.findMany({
        skip: (currentPage - 1) * perPage,
        take: perPage,
        where: {
          status: orderPaginationDto.status
        }
      }),
      meta: {
        isFirst: page === 1,
        isLast: page * limit >= total,
        total,
        page: currentPage,
        lastPage: Math.ceil(total / perPage)
      }
    }
  }


  async findOne(id: string) {
    const order = await this.order.findFirst({
      where: { id },
      include: {
        OrderItem: {
          select: {
            price: true,
            quantity: true,
            productId: true,
          },
        },
      },
    });

    if (!order) {
      throw new RpcException({
        status: HttpStatus.NOT_FOUND,
        message: `Order with id ${id} not found`,
      });
    }

    const productIds = order.OrderItem.map((orderItem) => orderItem.productId);
    // using the retrieved product ids, we can now fetch the product details from the products microservice.
    const products: ProductItem[] = await firstValueFrom(
      this.client.send({ cmd: 'validate_products' }, productIds),
    );

    // maps order items with product details
    const items = order.OrderItem.map((orderItem) => ({
      ...orderItem,
      name: products.find((product) => product.id === orderItem.productId)
        .name,
    }))

    // remove OrderItem from order object to avoid  duplicated information in json response
    delete order.OrderItem;
    
    return {
      ...order,
      detail: items,
    };
  }
  async changeStatus(changeOrderStatusDto: ChangeOrderStatusDto) {

    const { id, status } = changeOrderStatusDto;

    const order = await this.findOne(id);
    if (order.status === status) {
      return order;
    }

    return this.order.update({
      where: { id },
      data: { status: status }
    });


  }

}
