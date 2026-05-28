import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@/infra/config/prisma/prisma.service';
import { CreateCategoryDto, UpdateCategoryDto, CategoryResponseDto } from './dto/category.dto';

@Injectable()
export class CategoriesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(merchantId: string, dto: CreateCategoryDto): Promise<CategoryResponseDto> {
    const cat = await this.prisma.productCategory.create({
      data: { merchantId, name: dto.name, description: dto.description },
    });
    return this.toResponse(cat);
  }

  async findAllByMerchant(
    merchantId: string,
    limit?: number,
    skip?: number,
  ): Promise<any> {
    const where = { merchantId };
    const [cats, total] = await Promise.all([
      this.prisma.productCategory.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: skip || 0,
        take: limit || 10,
      }),
      this.prisma.productCategory.count({ where }),
    ]);
    return {
      items: cats.map(this.toResponse),
      total,
    };
  }

  async findOne(id: string): Promise<CategoryResponseDto> {
    const cat = await this.prisma.productCategory.findUnique({ where: { id } });
    if (!cat) throw new NotFoundException('Category not found');
    return this.toResponse(cat);
  }

  async delete(id: string): Promise<void> {
    const cat = await this.prisma.productCategory.findUnique({ where: { id } });
    if (!cat) throw new NotFoundException('Category not found');
    await this.prisma.productCategory.delete({ where: { id } });
  }

  async update(id: string, dto: UpdateCategoryDto): Promise<CategoryResponseDto> {
    const cat = await this.prisma.productCategory.findUnique({ where: { id } });
    if (!cat) throw new NotFoundException('Category not found');
    const updated = await this.prisma.productCategory.update({
      where: { id },
      data: {
        ...(dto.name !== undefined && { name: dto.name }),
        ...(dto.description !== undefined && { description: dto.description }),
        ...(dto.is_available !== undefined && { isAvailable: dto.is_available }),
      },
    });
    return this.toResponse(updated);
  }

  private toResponse(c: any): CategoryResponseDto {
    return {
      id: c.id,
      merchant_id: c.merchantId,
      name: c.name,
      description: c.description,
      is_available: c.isAvailable,
      created_at: c.createdAt,
    };
  }
}
