import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ConfigModule } from './infra/config/config.module';
import { PrismaModule } from './infra/config/prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { JwtAuthGuard } from './auth/jwt-auth.guard';
import { RolesGuard } from './auth/roles.guard';
import { MerchantsModule } from './merchants/merchants.module';
import { ActorsModule } from './actors/actors.module';
import { BranchesModule } from './branches/branches.module';
import { CategoriesModule } from './categories/categories.module';
import { ProductsModule } from './products/products.module';
import { DiscountsModule } from './discounts/discounts.module';
import { InventoryModule } from './inventory/inventory.module';
import { CartModule } from './cart/cart.module';
import { OrdersModule } from './orders/orders.module';
import { GeoModule } from './geo/geo.module';
import { ServiceZonesModule } from './service-zones/service-zones.module';
import { ReportsModule } from './reports/reports.module';
import { UploadsModule } from './uploads/uploads.module';

@Module({
  imports: [
    ConfigModule,
    PrismaModule,
    AuthModule,
    MerchantsModule,
    ActorsModule,
    BranchesModule,
    CategoriesModule,
    ProductsModule,
    DiscountsModule,
    InventoryModule,
    CartModule,
    OrdersModule,
    GeoModule,
    ServiceZonesModule,
    ReportsModule,
    UploadsModule,
  ],
  providers: [
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
  ],
})
export class AppModule {}
