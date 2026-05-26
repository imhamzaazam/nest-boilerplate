import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@/infra/config/prisma/prisma.service';
import { Prisma } from '@prisma/client';
import { CreateProductDto, ProductResponseDto, CreateAddonDto, AddonResponseDto } from './dto/product.dto';

@Injectable()
export class ProductsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(merchantId: string, dto: CreateProductDto): Promise<ProductResponseDto> {
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
    return this.toProductResponse(product);
  }

  async findAllByMerchant(merchantId: string): Promise<ProductResponseDto[]> {
    const products = await this.prisma.product.findMany({
      where: { merchantId },
      orderBy: { createdAt: 'desc' },
    });
    return products.map(this.toProductResponse);
  }

  async findOne(id: string): Promise<ProductResponseDto> {
    const product = await this.prisma.product.findUnique({
      where: { id },
      include: { category: true },
    });
    if (!product) throw new NotFoundException('Product not found');
    return { ...this.toProductResponse(product), category_name: product.category.name };
  }

  async createAddon(productId: string, dto: CreateAddonDto): Promise<AddonResponseDto> {
    const product = await this.prisma.product.findUnique({ where: { id: productId } });
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

  async findAddonsByProduct(productId: string): Promise<AddonResponseDto[]> {
    const addons = await this.prisma.productAddon.findMany({
      where: { productId },
      orderBy: { createdAt: 'asc' },
    });
    return addons.map(this.toAddonResponse);
  }

  private toProductResponse(p: any): ProductResponseDto {
    return {
      id: p.id,
      merchant_id: p.merchantId,
      category_id: p.categoryId,
      name: p.name,
      description: p.description,
      base_price: p.basePrice.toNumber(),
      image_url: p.imageUrl,
      track_inventory: p.trackInventory,
      is_active: p.isActive,
      created_at: p.createdAt,
      updated_at: p.updatedAt,
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
