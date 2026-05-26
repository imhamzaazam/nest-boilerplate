import { Controller, Get, Post, Body, Param, Headers, ParseUUIDPipe } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiHeader } from '@nestjs/swagger';
import { RoleType } from '@prisma/client';
import { ProductsService } from './products.service';
import { CreateProductDto, ProductResponseDto, CreateAddonDto, AddonResponseDto } from './dto/product.dto';
import { Public } from '@/auth/decorators/public.decorator';
import { Roles } from '@/auth/decorators/roles.decorator';
import { CurrentUser } from '@/auth/decorators/current-user.decorator';
import { AuthenticatedUser } from '@/auth/auth.service';

@ApiTags('Products')
@Controller('merchant/products')
export class MerchantProductsController {
  constructor(private readonly service: ProductsService) {}

  @Get()
  @Public()
  @ApiHeader({ name: 'x-merchant-id', required: false })
  @ApiOperation({ summary: 'List all products' })
  findAll(
    @CurrentUser() user: AuthenticatedUser | undefined,
    @Headers('x-merchant-id') headerMerchantId?: string,
  ): Promise<ProductResponseDto[]> {
    const merchantId = user?.merchantId || headerMerchantId;
    if (!merchantId) throw new Error('Merchant ID required');
    return this.service.findAllByMerchant(merchantId);
  }

  @Post()
  @ApiBearerAuth()
  @Roles(RoleType.admin, RoleType.merchant)
  @ApiOperation({ summary: 'Create a product' })
  create(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateProductDto): Promise<ProductResponseDto> {
    return this.service.create(user.merchantId, dto);
  }
}

@ApiTags('Products')
@Controller('products')
export class ProductsController {
  constructor(private readonly service: ProductsService) {}

  @Get(':product_id')
  @Public()
  @ApiOperation({ summary: 'Get product details' })
  findOne(@Param('product_id', ParseUUIDPipe) id: string): Promise<ProductResponseDto> {
    return this.service.findOne(id);
  }

  @Get(':product_id/addons')
  @Public()
  @ApiOperation({ summary: 'List product addons' })
  findAddons(@Param('product_id', ParseUUIDPipe) id: string): Promise<AddonResponseDto[]> {
    return this.service.findAddonsByProduct(id);
  }

  @Post(':product_id/addons')
  @ApiBearerAuth()
  @Roles(RoleType.admin, RoleType.merchant)
  @ApiOperation({ summary: 'Add an addon' })
  createAddon(
    @Param('product_id', ParseUUIDPipe) id: string,
    @Body() dto: CreateAddonDto,
  ): Promise<AddonResponseDto> {
    return this.service.createAddon(id, dto);
  }
}
