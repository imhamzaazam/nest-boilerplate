import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  ParseUUIDPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { RoleType } from '@prisma/client';
import { DiscountsService } from './discounts.service';
import {
  CreateDiscountDto,
  UpdateDiscountDto,
  DiscountResponseDto,
} from './dto/discount.dto';
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
  findAll(
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<DiscountResponseDto[]> {
    return this.service.findAllByMerchant(user.merchantId);
  }

  @Get(':discount_id')
  @ApiOperation({ summary: 'Get discount by ID' })
  findOne(
    @CurrentUser() user: AuthenticatedUser,
    @Param('discount_id', ParseUUIDPipe) id: string,
  ): Promise<DiscountResponseDto> {
    return this.service.findOne(user.merchantId, id);
  }

  @Post()
  @Roles(RoleType.admin, RoleType.merchant)
  @ApiOperation({ summary: 'Create a discount' })
  create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateDiscountDto,
  ): Promise<DiscountResponseDto> {
    return this.service.create(user.merchantId, dto);
  }

  @Patch(':discount_id')
  @Roles(RoleType.admin, RoleType.merchant)
  @ApiOperation({ summary: 'Update a discount' })
  update(
    @CurrentUser() user: AuthenticatedUser,
    @Param('discount_id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateDiscountDto,
  ): Promise<DiscountResponseDto> {
    return this.service.update(user.merchantId, id, dto);
  }

  @Delete(':discount_id')
  @Roles(RoleType.admin, RoleType.merchant)
  @ApiOperation({ summary: 'Delete a discount' })
  delete(
    @CurrentUser() user: AuthenticatedUser,
    @Param('discount_id', ParseUUIDPipe) id: string,
  ): Promise<void> {
    return this.service.delete(user.merchantId, id);
  }
}
