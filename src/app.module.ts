import { Module } from '@nestjs/common';
import { OrdersModule } from './orders/orders.module';
import { HealthCheckModule } from './health-check/health-check.module';

@Module({
  imports: [OrdersModule, HealthCheckModule],
  controllers: [],
  providers: [],
})
export class AppModule {}
