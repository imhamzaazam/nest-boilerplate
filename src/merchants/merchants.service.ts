import {
  Injectable,
  ConflictException,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '@/infra/config/prisma/prisma.service';
import { BranchStatus, PaymentType, Prisma } from '@prisma/client';
import {
  CreateMerchantDto,
  UpdateMerchantDto,
  MerchantResponseDto,
  BootstrapActorDto,
  ActorResponseDto,
} from './dto/merchant.dto';
import {
  MerchantSettingsResponseDto,
  UpdateMerchantSettingsDto,
} from './dto/merchant-settings.dto';
import { defaultVatRules, mapVatRules } from './merchant-settings.util';
import {
  MAX_FEATURED_PRODUCTS,
  parseFeaturedProductIds,
} from './featured-products.util';

@Injectable()
export class MerchantsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateMerchantDto): Promise<MerchantResponseDto> {
    const existing = await this.prisma.merchant.findUnique({
      where: { ntn: dto.ntn },
    });
    if (existing)
      throw new ConflictException('Merchant with this NTN already exists');

    const slug = `${dto.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${Date.now().toString(36)}`;
    const merchant = await this.prisma.merchant.create({
      data: {
        name: dto.name,
        ntn: dto.ntn,
        slug,
        address: dto.address,
        category: dto.category,
        contactNumber: dto.contact_number,
      },
    });
    return this.toResponse(merchant);
  }

  async findAll(): Promise<MerchantResponseDto[]> {
    const merchants = await this.prisma.merchant.findMany({
      orderBy: { createdAt: 'desc' },
    });
    return merchants.map(this.toResponse);
  }

  async findOne(id: string): Promise<MerchantResponseDto> {
    const merchant = await this.prisma.merchant.findUnique({ where: { id } });
    if (!merchant) throw new NotFoundException('Merchant not found');
    return this.toResponse(merchant);
  }

  async update(
    id: string,
    dto: UpdateMerchantDto,
  ): Promise<MerchantResponseDto> {
    const merchant = await this.prisma.merchant.findUnique({ where: { id } });
    if (!merchant) throw new NotFoundException('Merchant not found');

    if (dto.ntn && dto.ntn !== merchant.ntn) {
      const existing = await this.prisma.merchant.findUnique({
        where: { ntn: dto.ntn },
      });
      if (existing) throw new ConflictException('NTN already exists');
    }

    const updated = await this.prisma.merchant.update({
      where: { id },
      data: {
        ...(dto.name !== undefined && { name: dto.name }),
        ...(dto.ntn !== undefined && { ntn: dto.ntn }),
        ...(dto.address !== undefined && { address: dto.address }),
        ...(dto.category !== undefined && { category: dto.category }),
        ...(dto.contact_number !== undefined && {
          contactNumber: dto.contact_number,
        }),
        ...(dto.currency !== undefined && { currency: dto.currency }),
      },
    });
    return this.toResponse(updated);
  }

  async getStorefrontSettings(
    merchantId: string,
  ): Promise<{
    currency: string;
    featured_product_ids: string[];
    branch_id: string;
  }> {
    const merchant = await this.prisma.merchant.findUnique({
      where: { id: merchantId },
      select: { currency: true, featuredProductIds: true },
    });
    if (!merchant) throw new NotFoundException('Merchant not found');

    const branch = await this.prisma.branch.findFirst({
      where: { merchantId, status: BranchStatus.active },
      orderBy: { createdAt: 'asc' },
      select: { id: true },
    });
    if (!branch) {
      throw new NotFoundException('No active branch found for merchant');
    }

    return {
      currency: merchant.currency,
      featured_product_ids: parseFeaturedProductIds(
        merchant.featuredProductIds,
      ),
      branch_id: branch.id,
    };
  }

  async getSettings(merchantId: string): Promise<MerchantSettingsResponseDto> {
    const merchant = await this.prisma.merchant.findUnique({
      where: { id: merchantId },
      include: {
        vatRules: { orderBy: { paymentType: 'asc' } },
      },
    });
    if (!merchant) throw new NotFoundException('Merchant not found');

    return {
      currency: merchant.currency,
      vat_rules: mapVatRules(merchant.vatRules),
      featured_product_ids: parseFeaturedProductIds(
        merchant.featuredProductIds,
      ),
    };
  }

  async updateSettings(
    merchantId: string,
    dto: UpdateMerchantSettingsDto,
  ): Promise<MerchantSettingsResponseDto> {
    const merchant = await this.prisma.merchant.findUnique({
      where: { id: merchantId },
      include: { vatRules: true },
    });
    if (!merchant) throw new NotFoundException('Merchant not found');

    await this.prisma.$transaction(async (tx) => {
      if (dto.currency !== undefined) {
        await tx.merchant.update({
          where: { id: merchantId },
          data: { currency: dto.currency },
        });
      }

      if (dto.vat_rules?.length) {
        for (const rule of dto.vat_rules) {
          await tx.vatRule.upsert({
            where: {
              merchantId_paymentType: {
                merchantId,
                paymentType: rule.payment_type,
              },
            },
            create: {
              merchantId,
              paymentType: rule.payment_type,
              rate: new Prisma.Decimal(rule.rate),
            },
            update: {
              rate: new Prisma.Decimal(rule.rate),
            },
          });
        }
      }

      if (dto.featured_product_ids !== undefined) {
        const featuredIds = dto.featured_product_ids;
        if (featuredIds.length > MAX_FEATURED_PRODUCTS) {
          throw new BadRequestException(
            `You can feature at most ${MAX_FEATURED_PRODUCTS} products`,
          );
        }

        const uniqueIds = [...new Set(featuredIds)];
        if (uniqueIds.length !== featuredIds.length) {
          throw new BadRequestException('Duplicate featured products are not allowed');
        }

        if (uniqueIds.length > 0) {
          const validCount = await tx.product.count({
            where: {
              merchantId,
              id: { in: uniqueIds },
              isActive: true,
            },
          });
          if (validCount !== uniqueIds.length) {
            throw new BadRequestException(
              'One or more featured products are invalid or unavailable',
            );
          }
        }

        await tx.merchant.update({
          where: { id: merchantId },
          data: { featuredProductIds: uniqueIds },
        });
      }
    });

    return this.getSettings(merchantId);
  }

  async bootstrapActor(
    merchantId: string,
    dto: BootstrapActorDto,
  ): Promise<ActorResponseDto> {
    const merchant = await this.prisma.merchant.findUnique({
      where: { id: merchantId },
    });
    if (!merchant) throw new NotFoundException('Merchant not found');

    const existing = await this.prisma.actor.findUnique({
      where: { merchantId_email: { merchantId, email: dto.email } },
    });
    if (existing) throw new ConflictException('Actor already exists');

    const [firstName, ...rest] = dto.full_name.split(' ');
    const lastName = rest.join(' ') || firstName;
    const passwordHash = await bcrypt.hash(dto.password, 12);

    const actor = await this.prisma.$transaction(async (tx) => {
      let role = await tx.role.findUnique({
        where: { merchantId_roleType: { merchantId, roleType: dto.role } },
      });
      if (!role) {
        role = await tx.role.create({
          data: {
            merchantId,
            roleType: dto.role,
            description: `${dto.role} role`,
          },
        });
      }

      const newActor = await tx.actor.create({
        data: {
          merchantId,
          email: dto.email,
          passwordHash,
          firstName,
          lastName,
          isActive: true,
        },
      });

      await tx.actorRole.create({
        data: { merchantId, actorId: newActor.id, roleId: role.id },
      });

      return newActor;
    });

    return {
      uid: actor.id,
      merchant_id: actor.merchantId,
      email: actor.email,
      full_name: `${actor.firstName} ${actor.lastName}`,
      is_active: actor.isActive,
      last_login: actor.lastLogin,
    };
  }

  private toResponse(m: any): MerchantResponseDto {
    return {
      id: m.id,
      name: m.name,
      ntn: m.ntn,
      address: m.address,
      logo: m.logo,
      category: m.category,
      contact_number: m.contactNumber,
      currency: m.currency,
      created_at: m.createdAt,
      updated_at: m.updatedAt,
    };
  }
}
