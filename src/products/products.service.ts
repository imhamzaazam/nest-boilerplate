import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@/infra/config/prisma/prisma.service';
import { Prisma } from '@prisma/client';
import { DEFAULT_CURRENCY } from '@/common/currency.util';
import { parseFeaturedProductIds } from '@/merchants/featured-products.util';
import {
  CreateProductDto,
  UpdateProductDto,
  ProductResponseDto,
  CreateAddonDto,
  UpdateAddonDto,
  AddonResponseDto,
} from './dto/product.dto';

@Injectable()
export class ProductsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(
    merchantId: string,
    dto: CreateProductDto,
  ): Promise<ProductResponseDto> {
    const { currency, featuredIds } =
      await this.getMerchantProductContext(merchantId);
    const product = await this.prisma.product.create({
      data: {
        merchantId,
        categoryId: dto.category_id,
        name: dto.name,
        description: dto.description,
        basePrice: new Prisma.Decimal(dto.base_price),
        imageUrl: dto.image_url,
        trackInventory: dto.track_inventory ?? false,
      },
    });
    return this.toProductResponse(product, currency, featuredIds);
  }

  async findAllByMerchant(
    merchantId: string,
    category?: string,
    minPrice?: number,
    maxPrice?: number,
    limit?: number,
    skip?: number,
    includeInactive = false,
  ): Promise<any> {
    const where: any = { merchantId };
    if (!includeInactive) {
      where.isActive = true;
    }
    if (category) {
      where.categoryId = category;
    }
    if (minPrice || maxPrice) {
      where.basePrice = {};
      if (minPrice) {
        where.basePrice.gte = minPrice;
      }
      if (maxPrice) {
        where.basePrice.lte = maxPrice;
      }
    }

    const { currency, featuredIds } =
      await this.getMerchantProductContext(merchantId);

    const [products, total] = await Promise.all([
      this.prisma.product.findMany({
        where,
        include: { category: { select: { id: true, name: true } } },
        orderBy: { createdAt: 'desc' },
        skip: skip || 0,
        take: limit || 10,
      }),
      this.prisma.product.count({ where }),
    ]);

    return {
      items: products.map((p) =>
        this.toProductResponse(p, currency, featuredIds),
      ),
      total,
      currency,
    };
  }

  async findAll(
    category?: string,
    minPrice?: number,
    maxPrice?: number,
    limit?: number,
    skip?: number,
  ): Promise<any> {
    const where: any = { isActive: true };
    if (category) {
      where.categoryId = category;
    }
    if (minPrice || maxPrice) {
      where.basePrice = {};
      if (minPrice) {
        where.basePrice.gte = minPrice;
      }
      if (maxPrice) {
        where.basePrice.lte = maxPrice;
      }
    }

    const [products, total] = await Promise.all([
      this.prisma.product.findMany({
        where,
        include: { category: { select: { id: true, name: true } } },
        orderBy: { createdAt: 'desc' },
        skip: skip || 0,
        take: limit || 10,
      }),
      this.prisma.product.count({ where }),
    ]);

    const currencyByMerchant = new Map<
      string,
      { currency: string; featuredIds: Set<string> }
    >();
    const items = await Promise.all(
      products.map(async (p) => {
        let ctx = currencyByMerchant.get(p.merchantId);
        if (!ctx) {
          ctx = await this.getMerchantProductContext(p.merchantId);
          currencyByMerchant.set(p.merchantId, ctx);
        }
        return this.toProductResponse(p, ctx.currency, ctx.featuredIds);
      }),
    );

    return {
      items,
      total,
    };
  }

  async findOne(id: string): Promise<ProductResponseDto> {
    const product = await this.prisma.product.findUnique({
      where: { id },
      include: { category: { select: { id: true, name: true } } },
    });
    if (!product) throw new NotFoundException('Product not found');
    const { currency, featuredIds } = await this.getMerchantProductContext(
      product.merchantId,
    );
    return this.toProductResponse(product, currency, featuredIds);
  }

  async createAddon(
    productId: string,
    dto: CreateAddonDto,
  ): Promise<AddonResponseDto> {
    const product = await this.prisma.product.findUnique({
      where: { id: productId },
    });
    if (!product) throw new NotFoundException('Product not found');

    const addon = await this.prisma.productAddon.create({
      data: {
        productId,
        name: dto.name,
        price: new Prisma.Decimal(dto.price),
      },
    });
    return this.toAddonResponse(addon);
  }

  async update(id: string, dto: UpdateProductDto): Promise<ProductResponseDto> {
    const product = await this.prisma.product.findUnique({ where: { id } });
    if (!product) throw new NotFoundException('Product not found');
    
    const updated = await this.prisma.product.update({
      where: { id },
      data: {
        ...(dto.category_id !== undefined && { categoryId: dto.category_id }),
        ...(dto.name !== undefined && { name: dto.name }),
        ...(dto.description !== undefined && { description: dto.description }),
        ...(dto.base_price !== undefined && { basePrice: new Prisma.Decimal(dto.base_price) }),
        ...(dto.image_url !== undefined && { imageUrl: dto.image_url }),
        ...(dto.track_inventory !== undefined && { trackInventory: dto.track_inventory }),
        ...(dto.is_active !== undefined && { isActive: dto.is_active }),
      },
      include: { category: { select: { id: true, name: true } } },
    });
    const { currency, featuredIds } = await this.getMerchantProductContext(
      updated.merchantId,
    );
    return this.toProductResponse(updated, currency, featuredIds);
  }

  async delete(id: string): Promise<void> {
    const product = await this.prisma.product.findUnique({ where: { id } });
    if (!product) throw new NotFoundException('Product not found');
    await this.prisma.product.delete({ where: { id } });
  }

  async updateAddon(
    addonId: string,
    dto: UpdateAddonDto,
  ): Promise<AddonResponseDto> {
    const addon = await this.prisma.productAddon.findUnique({
      where: { id: addonId },
    });
    if (!addon) throw new NotFoundException('Addon not found');
    
    const updated = await this.prisma.productAddon.update({
      where: { id: addonId },
      data: {
        ...(dto.name !== undefined && { name: dto.name }),
        ...(dto.price !== undefined && { price: new Prisma.Decimal(dto.price) }),
      },
    });
    return this.toAddonResponse(updated);
  }

  async deleteAddon(addonId: string): Promise<void> {
    const addon = await this.prisma.productAddon.findUnique({
      where: { id: addonId },
    });
    if (!addon) throw new NotFoundException('Addon not found');
    await this.prisma.productAddon.delete({ where: { id: addonId } });
  }

  async findAddonsByProduct(productId: string): Promise<AddonResponseDto[]> {
    const addons = await this.prisma.productAddon.findMany({
      where: { productId },
      orderBy: { createdAt: 'asc' },
    });
    return addons.map(this.toAddonResponse);
  }

  private async getMerchantProductContext(merchantId: string): Promise<{
    currency: string;
    featuredIds: Set<string>;
  }> {
    const merchant = await this.prisma.merchant.findUnique({
      where: { id: merchantId },
      select: { currency: true, featuredProductIds: true },
    });
    return {
      currency: merchant?.currency ?? DEFAULT_CURRENCY,
      featuredIds: new Set(
        parseFeaturedProductIds(merchant?.featuredProductIds),
      ),
    };
  }

  private toProductResponse(
    p: any,
    currency: string,
    featuredIds: Set<string>,
  ): ProductResponseDto {
    return {
      id: p.id,
      merchant_id: p.merchantId,
      category_id: p.categoryId,
      category: p.category
        ? {
            id: p.category.id,
            name: p.category.name,
          }
        : undefined,
      name: p.name,
      description: p.description,
      base_price: p.basePrice.toNumber(),
      image_url: p.imageUrl,
      track_inventory: p.trackInventory,
      is_active: p.isActive,
      created_at: p.createdAt,
      updated_at: p.updatedAt,
      currency,
      is_featured: featuredIds.has(p.id),
    };
  }

  private toAddonResponse(a: any): AddonResponseDto {
    return {
      id: a.id,
      product_id: a.productId,
      name: a.name,
      price: a.price.toNumber(),
      created_at: a.createdAt,
    };
  }
}
