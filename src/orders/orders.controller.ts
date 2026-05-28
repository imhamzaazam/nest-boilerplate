import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  ParseUUIDPipe,
  Query,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { RoleType } from '@prisma/client';
import { OrdersService } from './orders.service';
import {
  CreateOrderDto,
  UpdateOrderDto,
  UpdateOrderStatusDto,
  OrderResponseDto,
  CreateOrderResponseDto,
  OrderStatusesResponseDto,
  ListOrdersResponseDto,
} from './dto/order.dto';
import { ListOrdersQueryDto } from './dto/list-orders-query.dto';
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

  @Get('statuses')
  @Public()
  @ApiOperation({ summary: 'List all order delivery statuses' })
  getStatuses(): OrderStatusesResponseDto {
    return this.service.getOrderStatuses();
  }

  @Get(':order_id')
  @Public()
  @ApiOperation({ summary: 'Get order' })
  findOne(
    @Param('order_id', ParseUUIDPipe) id: string,
  ): Promise<OrderResponseDto> {
    return this.service.findOne(id);
  }

  @Get()
  @Public()
  @ApiOperation({ summary: 'List all orders' })
  findAll(@Query() query: ListOrdersQueryDto): Promise<ListOrdersResponseDto> {
    return this.service.findAll('', query);
  }

  @Patch(':order_id')
  @ApiBearerAuth()
  @Roles(RoleType.admin, RoleType.merchant, RoleType.employee)
  @ApiOperation({ summary: 'Update status' })
  updateStatus(
    @Param('order_id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateOrderStatusDto,
  ): Promise<OrderResponseDto> {
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
  findAll(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: ListOrdersQueryDto,
  ): Promise<ListOrdersResponseDto> {
    return this.service.findAll(user.merchantId, query);
  }

  @Patch(':order_id/status')
  @ApiOperation({ summary: 'Update order status' })
  updateStatus(
    @Param('order_id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateOrderStatusDto,
  ): Promise<OrderResponseDto> {
    return this.service.updateStatus(id, dto);
  }

  @Patch(':order_id')
  @ApiOperation({ summary: 'Update order' })
  update(
    @Param('order_id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateOrderDto,
  ): Promise<OrderResponseDto> {
    return this.service.update(id, dto);
  }

  @Delete(':order_id')
  @ApiOperation({ summary: 'Delete order' })
  delete(@Param('order_id', ParseUUIDPipe) id: string): Promise<void> {
    return this.service.delete(id);
  }
}
