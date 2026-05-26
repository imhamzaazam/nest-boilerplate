import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '@/infra/config/prisma/prisma.service';
import { Prisma } from '@prisma/client';
import { CreateDiscountDto, DiscountResponseDto } from './dto/discount.dto';

@Injectable()
export class DiscountsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(merchantId: string, dto: CreateDiscountDto): Promise<DiscountResponseDto> {
    if (dto.product_id && dto.category_id) {
      throw new BadRequestException('Cannot specify both product_id and category_id');
    }
    const discount = await this.prisma.merchantDiscount.create({
      data: {
        merchantId,
        type: dto.type,
        value: new Prisma.Decimal(dto.value),
        description: dto.description,
        productId: dto.product_id,
        categoryId: dto.category_id,
      },
    });
    return this.toResponse(discount);
  }

  async findAllByMerchant(merchantId: string): Promise<DiscountResponseDto[]> {
    const discounts = await this.prisma.merchantDiscount.findMany({
      where: { merchantId },
      orderBy: { createdAt: 'desc' },
    });
    return discounts.map(this.toResponse);
  }

  private toResponse(d: any): DiscountResponseDto {
    return {
      id: d.id,
      merchant_id: d.merchantId,
      product_id: d.productId,
      category_id: d.categoryId,
      type: d.type,
      value: d.value.toNumber(),
      description: d.description,
      valid_from: d.validFrom,
      valid_to: d.validTo,
      created_at: d.createdAt,
    };
  }
}
