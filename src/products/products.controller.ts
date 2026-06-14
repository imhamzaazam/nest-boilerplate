import { Controller, Get, Post, Delete, Patch, Body, Param, Headers, ParseUUIDPipe, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiHeader } from '@nestjs/swagger';
import { RoleType } from '@prisma/client';
import { ProductsService } from './products.service';
import { CreateProductDto, UpdateProductDto, ProductResponseDto, PosProductsListResponseDto, CreateAddonDto, UpdateAddonDto, AddonResponseDto } from './dto/product.dto';
import { Public } from '@/auth/decorators/public.decorator';
import { Roles } from '@/auth/decorators/roles.decorator';
import { CurrentUser } from '@/auth/decorators/current-user.decorator';
import { AuthenticatedUser } from '@/auth/auth.service';

@ApiTags('Products')
@Controller('merchant/products')
export class MerchantProductsController {
  constructor(private readonly service: ProductsService) {}

  @Get('pos')
  @Public()
  @ApiHeader({ name: 'x-merchant-id', required: false })
  @ApiOperation({
    summary: 'List products for POS (includes unavailable items with tags)',
  })
  findAllForPos(
    @CurrentUser() user: AuthenticatedUser | undefined,
    @Headers('x-merchant-id') headerMerchantId?: string,
    @Query('category') category?: string,
    @Query('minPrice') minPrice?: number,
    @Query('maxPrice') maxPrice?: number,
    @Query('limit') limit?: number,
    @Query('skip') skip?: number,
  ): Promise<PosProductsListResponseDto> {
    const merchantId = user?.merchantId || headerMerchantId;
    if (!merchantId) throw new Error('Merchant ID required');
    return this.service.findAllForPos(
      merchantId,
      category,
      minPrice,
      maxPrice,
      limit,
      skip,
    );
  }

  @Get()
  @Public()
  @ApiHeader({ name: 'x-merchant-id', required: false })
  @ApiOperation({ summary: 'List all products' })
  findAll(
    @CurrentUser() user: AuthenticatedUser | undefined,
    @Headers('x-merchant-id') headerMerchantId?: string,
    @Query('category') category?: string,
    @Query('minPrice') minPrice?: number,
    @Query('maxPrice') maxPrice?: number,
    @Query('limit') limit?: number,
    @Query('skip') skip?: number,
  ): Promise<any> {
    const merchantId = user?.merchantId || headerMerchantId;
    if (!merchantId) throw new Error('Merchant ID required');
    return this.service.findAllByMerchant(
      merchantId,
      category,
      minPrice,
      maxPrice,
      limit,
      skip,
      true,
    );
  }

  @Post()
  @ApiBearerAuth()
  @Roles(RoleType.admin, RoleType.merchant)
  @ApiOperation({ summary: 'Create a product' })
  create(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateProductDto): Promise<ProductResponseDto> {
    return this.service.create(user.merchantId, dto);
  }

  @Patch(':product_id')
  @ApiBearerAuth()
  @Roles(RoleType.admin, RoleType.merchant)
  @ApiOperation({ summary: 'Update a product' })
  update(
    @Param('product_id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateProductDto,
  ): Promise<ProductResponseDto> {
    return this.service.update(id, dto);
  }

  @Delete(':product_id')
  @ApiBearerAuth()
  @Roles(RoleType.admin, RoleType.merchant)
  @ApiOperation({ summary: 'Delete a product' })
  delete(@Param('product_id', ParseUUIDPipe) id: string): Promise<void> {
    return this.service.delete(id);
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

  @Patch(':product_id/addons/:addonId')
  @ApiBearerAuth()
  @Roles(RoleType.admin, RoleType.merchant)
  @ApiOperation({ summary: 'Update an addon' })
  updateAddon(
    @Param('product_id', ParseUUIDPipe) productId: string,
    @Param('addonId', ParseUUIDPipe) addonId: string,
    @Body() dto: UpdateAddonDto,
  ): Promise<AddonResponseDto> {
    return this.service.updateAddon(addonId, dto);
  }

  @Delete(':product_id/addons/:addonId')
  @ApiBearerAuth()
  @Roles(RoleType.admin, RoleType.merchant)
  @ApiOperation({ summary: 'Delete an addon' })
  deleteAddon(
    @Param('product_id', ParseUUIDPipe) productId: string,
    @Param('addonId', ParseUUIDPipe) addonId: string,
  ): Promise<void> {
    return this.service.deleteAddon(addonId);
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
