import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '@/infra/config/prisma/prisma.service';
import { DiscountType, Prisma } from '@prisma/client';
import {
  CreateDiscountDto,
  DiscountResponseDto,
  DiscountScope,
  DiscountStatus,
  UpdateDiscountDto,
} from './dto/discount.dto';

const discountInclude = {
  product: { select: { id: true, name: true } },
  category: { select: { id: true, name: true } },
} as const;

@Injectable()
export class DiscountsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(
    merchantId: string,
    dto: CreateDiscountDto,
  ): Promise<DiscountResponseDto> {
    await this.validateDiscountInput(merchantId, dto);

    const discount = await this.prisma.merchantDiscount.create({
      data: {
        merchantId,
        type: dto.type,
        value: new Prisma.Decimal(dto.value),
        description: dto.description,
        productId: dto.product_id,
        categoryId: dto.category_id,
        validFrom: dto.valid_from ? new Date(dto.valid_from) : undefined,
        validTo: dto.valid_to ? new Date(dto.valid_to) : undefined,
      },
      include: discountInclude,
    });
    return this.toResponse(discount);
  }

  async findAllByMerchant(merchantId: string): Promise<DiscountResponseDto[]> {
    const discounts = await this.prisma.merchantDiscount.findMany({
      where: { merchantId },
      include: discountInclude,
      orderBy: { createdAt: 'desc' },
    });
    return discounts.map((d) => this.toResponse(d));
  }

  async findOne(merchantId: string, id: string): Promise<DiscountResponseDto> {
    const discount = await this.getDiscountForMerchant(merchantId, id);
    return this.toResponse(discount);
  }

  async update(
    merchantId: string,
    id: string,
    dto: UpdateDiscountDto,
  ): Promise<DiscountResponseDto> {
    const existing = await this.getDiscountForMerchant(merchantId, id);

    const productId =
      dto.product_id !== undefined ? dto.product_id : existing.productId;
    const categoryId =
      dto.category_id !== undefined ? dto.category_id : existing.categoryId;

    if (productId && categoryId) {
      throw new BadRequestException(
        'Cannot specify both product_id and category_id',
      );
    }

    await this.validateDiscountInput(merchantId, {
      type: dto.type ?? existing.type,
      value:
        dto.value !== undefined ? dto.value : existing.value.toNumber(),
      product_id: productId || undefined,
      category_id: categoryId || undefined,
      valid_from:
        dto.valid_from !== undefined
          ? dto.valid_from
          : existing.validFrom?.toISOString(),
      valid_to:
        dto.valid_to !== undefined
          ? dto.valid_to
          : existing.validTo?.toISOString(),
    });

    const updated = await this.prisma.merchantDiscount.update({
      where: { id },
      data: {
        ...(dto.type !== undefined && { type: dto.type }),
        ...(dto.value !== undefined && {
          value: new Prisma.Decimal(dto.value),
        }),
        ...(dto.description !== undefined && {
          description: dto.description,
        }),
        ...(dto.product_id !== undefined && {
          productId: dto.product_id,
        }),
        ...(dto.category_id !== undefined && {
          categoryId: dto.category_id,
        }),
        ...(dto.valid_from !== undefined && {
          validFrom: dto.valid_from ? new Date(dto.valid_from) : null,
        }),
        ...(dto.valid_to !== undefined && {
          validTo: dto.valid_to ? new Date(dto.valid_to) : null,
        }),
      },
      include: discountInclude,
    });
    return this.toResponse(updated);
  }

  async delete(merchantId: string, id: string): Promise<void> {
    await this.getDiscountForMerchant(merchantId, id);
    await this.prisma.merchantDiscount.delete({ where: { id } });
  }

  private async getDiscountForMerchant(merchantId: string, id: string) {
    const discount = await this.prisma.merchantDiscount.findUnique({
      where: { id },
      include: discountInclude,
    });
    if (!discount || discount.merchantId !== merchantId) {
      throw new NotFoundException('Discount not found');
    }
    return discount;
  }

  private async validateDiscountInput(
    merchantId: string,
    dto: {
      type: DiscountType;
      value: number;
      product_id?: string;
      category_id?: string;
      valid_from?: string;
      valid_to?: string;
    },
  ): Promise<void> {
    if (dto.product_id && dto.category_id) {
      throw new BadRequestException(
        'Cannot specify both product_id and category_id',
      );
    }

    if (dto.type === DiscountType.percentage && dto.value > 100) {
      throw new BadRequestException('Percentage value cannot exceed 100');
    }

    if (dto.value < 0) {
      throw new BadRequestException('Value must be non-negative');
    }

    if (dto.valid_from && dto.valid_to) {
      const from = new Date(dto.valid_from);
      const to = new Date(dto.valid_to);
      if (from >= to) {
        throw new BadRequestException('valid_from must be before valid_to');
      }
    }

    if (dto.product_id) {
      const product = await this.prisma.product.findFirst({
        where: { id: dto.product_id, merchantId },
      });
      if (!product) {
        throw new BadRequestException('Product not found for this merchant');
      }
    }

    if (dto.category_id) {
      const category = await this.prisma.productCategory.findFirst({
        where: { id: dto.category_id, merchantId },
      });
      if (!category) {
        throw new BadRequestException('Category not found for this merchant');
      }
    }
  }

  private deriveScope(d: {
    productId: string | null;
    categoryId: string | null;
  }): DiscountScope {
    if (d.productId) return 'product';
    if (d.categoryId) return 'category';
    return 'store';
  }

  private deriveStatus(d: {
    validFrom: Date | null;
    validTo: Date | null;
  }): DiscountStatus {
    const now = new Date();
    if (d.validFrom && now < d.validFrom) return 'scheduled';
    if (d.validTo && now > d.validTo) return 'expired';
    return 'active';
  }

  private toResponse(d: {
    id: string;
    merchantId: string;
    productId: string | null;
    categoryId: string | null;
    type: DiscountType;
    value: Prisma.Decimal;
    description: string | null;
    validFrom: Date | null;
    validTo: Date | null;
    createdAt: Date;
    product?: { id: string; name: string } | null;
    category?: { id: string; name: string } | null;
  }): DiscountResponseDto {
    const scope = this.deriveScope(d);
    return {
      id: d.id,
      merchant_id: d.merchantId,
      product_id: d.productId ?? undefined,
      category_id: d.categoryId ?? undefined,
      scope,
      product: d.product
        ? { id: d.product.id, name: d.product.name }
        : undefined,
      category: d.category
        ? { id: d.category.id, name: d.category.name }
        : undefined,
      type: d.type,
      value: d.value.toNumber(),
      description: d.description ?? undefined,
      valid_from: d.validFrom ?? undefined,
      valid_to: d.validTo ?? undefined,
      status: this.deriveStatus(d),
      created_at: d.createdAt,
    };
  }
}
