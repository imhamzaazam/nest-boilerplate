import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/infra/config/prisma/prisma.service';
import { CreateInventoryDto, InventoryResponseDto, InventoryListDto } from './dto/inventory.dto';

@Injectable()
export class InventoryService {
  constructor(private readonly prisma: PrismaService) {}

  async upsert(dto: CreateInventoryDto): Promise<InventoryResponseDto> {
    const inv = await this.prisma.productInventory.upsert({
      where: { productId_branchId: { productId: dto.product_id, branchId: dto.branch_id } },
      update: { quantity: dto.quantity },
      create: { productId: dto.product_id, branchId: dto.branch_id, quantity: dto.quantity },
    });
    return {
      id: inv.id,
      product_id: inv.productId,
      branch_id: inv.branchId,
      quantity: inv.quantity,
      created_at: inv.createdAt,
      updated_at: inv.updatedAt,
    };
  }

  async findAllByMerchant(merchantId: string): Promise<InventoryListDto[]> {
    const items = await this.prisma.productInventory.findMany({
      where: { product: { merchantId } },
      include: { product: { select: { id: true, name: true } } },
    });

    const map = new Map<string, { name: string; qty: number }>();
    for (const i of items) {
      const existing = map.get(i.productId);
      if (existing) existing.qty += i.quantity;
      else map.set(i.productId, { name: i.product.name, qty: i.quantity });
    }

    return Array.from(map.entries()).map(([id, { name, qty }]) => ({
      product_id: id,
      product_name: name,
      quantity: qty,
    }));
  }
}
