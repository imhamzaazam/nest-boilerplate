import { Module } from '@nestjs/common';
import { MerchantsController, MerchantController } from './merchants.controller';
import { MerchantsService } from './merchants.service';

@Module({
  controllers: [MerchantsController, MerchantController],
  providers: [MerchantsService],
  exports: [MerchantsService],
})
export class MerchantsModule {}
