import { Controller, Get, Post, Patch, Delete, Body, Param, Query, ParseUUIDPipe, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiQuery, ApiBearerAuth } from '@nestjs/swagger';
import { PaymentType } from '@prisma/client';
import { CartService } from './cart.service';
import { CreateCartDto, AddCartItemDto, UpdateCartItemDto, CartResponseDto, CartItemResponseDto, CartCreatedDto } from './dto/cart.dto';
import { Public } from '@/auth/decorators/public.decorator';
import { CurrentUser } from '@/auth/decorators/current-user.decorator';
import { AuthenticatedUser } from '@/auth/auth.service';

@ApiTags('Cart')
@Controller('carts')
export class CartController {
  constructor(private readonly service: CartService) {}

  @Post()
  @Public()
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create cart (returns generated cart_id)' })
  create(
    @Body() dto: CreateCartDto,
    @CurrentUser() user?: AuthenticatedUser,
  ): Promise<CartCreatedDto> {
    return this.service.create(dto, user?.id);
  }

  @Get(':cart_id')
  @Public()
  @ApiQuery({ name: 'payment_method', enum: PaymentType, required: false })
  @ApiOperation({ summary: 'Get cart' })
  findOne(
    @Param('cart_id', ParseUUIDPipe) id: string,
    @Query('payment_method') pm?: PaymentType,
  ): Promise<CartResponseDto> {
    return this.service.findOne(id, pm);
  }

  @Post(':cart_id/items')
  @Public()
  @ApiOperation({ summary: 'Add item' })
  addItem(@Param('cart_id', ParseUUIDPipe) id: string, @Body() dto: AddCartItemDto): Promise<CartItemResponseDto> {
    return this.service.addItem(id, dto);
  }

  @Patch(':cart_id/items/:item_id')
  @Public()
  @ApiOperation({ summary: 'Update item' })
  updateItem(
    @Param('cart_id', ParseUUIDPipe) cartId: string,
    @Param('item_id', ParseUUIDPipe) itemId: string,
    @Body() dto: UpdateCartItemDto,
  ): Promise<CartItemResponseDto> {
    return this.service.updateItem(cartId, itemId, dto);
  }

  @Delete(':cart_id/items/:item_id')
  @Public()
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Remove item' })
  removeItem(
    @Param('cart_id', ParseUUIDPipe) cartId: string,
    @Param('item_id', ParseUUIDPipe) itemId: string,
  ): Promise<void> {
    return this.service.removeItem(cartId, itemId);
  }
}
