import { Controller, Get, Post, Body } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { RoleType } from '@prisma/client';
import { DiscountsService } from './discounts.service';
import { CreateDiscountDto, DiscountResponseDto } from './dto/discount.dto';
import { CurrentUser } from '@/auth/decorators/current-user.decorator';
import { Roles } from '@/auth/decorators/roles.decorator';
import { AuthenticatedUser } from '@/auth/auth.service';

@ApiTags('Discounts')
@Controller('merchant/discounts')
@ApiBearerAuth()
export class DiscountsController {
  constructor(private readonly service: DiscountsService) {}

  @Get()
  @ApiOperation({ summary: 'List all discounts' })
  findAll(@CurrentUser() user: AuthenticatedUser): Promise<DiscountResponseDto[]> {
    return this.service.findAllByMerchant(user.merchantId);
  }

  @Post()
  @Roles(RoleType.admin, RoleType.merchant)
  @ApiOperation({ summary: 'Create a discount' })
  create(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateDiscountDto): Promise<DiscountResponseDto> {
    return this.service.create(user.merchantId, dto);
  }
}
