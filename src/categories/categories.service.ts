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

  async findAllByMerchant(merchantId: string): Promise<CategoryResponseDto[]> {
    const cats = await this.prisma.productCategory.findMany({
      where: { merchantId },
      orderBy: { createdAt: 'desc' },
    });
    return cats.map(this.toResponse);
  }

  async update(id: string, dto: UpdateCategoryDto): Promise<CategoryResponseDto> {
    const cat = await this.prisma.productCategory.findUnique({ where: { id } });
    if (!cat) throw new NotFoundException('Category not found');
    const updated = await this.prisma.productCategory.update({
      where: { id },
      data: { isAvailable: dto.is_available },
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
