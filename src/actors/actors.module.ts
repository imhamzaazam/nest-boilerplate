import { Module } from '@nestjs/common';
import { ActorsController, MerchantActorsController } from './actors.controller';
import { ActorsService } from './actors.service';

@Module({
  controllers: [ActorsController, MerchantActorsController],
  providers: [ActorsService],
  exports: [ActorsService],
})
export class ActorsModule {}
