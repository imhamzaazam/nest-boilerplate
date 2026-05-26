import { Controller, Get, Post, Patch, Body, Param, ParseUUIDPipe } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { RoleType } from '@prisma/client';
import { OrdersService } from './orders.service';
import { CreateOrderDto, UpdateOrderStatusDto, OrderResponseDto, CreateOrderResponseDto } from './dto/order.dto';
import { Public } from '@/auth/decorators/public.decorator';
import { CurrentUser } from '@/auth/decorators/current-user.decorator';
import { Roles } from '@/auth/decorators/roles.decorator';
import { AuthenticatedUser } from '@/auth/auth.service';

@ApiTags('Orders')
@Controller('orders')
export class OrdersController {
  constructor(private readonly service: OrdersService) {}

  @Post()
  @Public()
  @ApiOperation({ summary: 'Place order' })
  create(@Body() dto: CreateOrderDto): Promise<CreateOrderResponseDto> {
    return this.service.create(dto);
  }

  @Get(':order_id')
  @Public()
  @ApiOperation({ summary: 'Get order' })
  findOne(@Param('order_id', ParseUUIDPipe) id: string): Promise<OrderResponseDto> {
    return this.service.findOne(id);
  }

  @Patch(':order_id')
  @ApiBearerAuth()
  @Roles(RoleType.admin, RoleType.merchant, RoleType.employee)
  @ApiOperation({ summary: 'Update status' })
  updateStatus(@Param('order_id', ParseUUIDPipe) id: string, @Body() dto: UpdateOrderStatusDto): Promise<OrderResponseDto> {
    return this.service.updateStatus(id, dto);
  }
}

@ApiTags('Orders')
@Controller('merchant/orders')
@ApiBearerAuth()
export class MerchantOrdersController {
  constructor(private readonly service: OrdersService) {}

  @Get()
  @ApiOperation({ summary: 'List orders' })
  findAll(@CurrentUser() user: AuthenticatedUser): Promise<OrderResponseDto[]> {
    return this.service.findAllByMerchant(user.merchantId);
  }
}
