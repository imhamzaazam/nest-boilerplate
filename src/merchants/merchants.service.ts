import { Injectable, ConflictException, NotFoundException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '@/infra/config/prisma/prisma.service';
import {
  CreateMerchantDto,
  UpdateMerchantDto,
  MerchantResponseDto,
  BootstrapActorDto,
  ActorResponseDto,
} from './dto/merchant.dto';

@Injectable()
export class MerchantsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateMerchantDto): Promise<MerchantResponseDto> {
    const existing = await this.prisma.merchant.findUnique({ where: { ntn: dto.ntn } });
    if (existing) throw new ConflictException('Merchant with this NTN already exists');

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
    const merchants = await this.prisma.merchant.findMany({ orderBy: { createdAt: 'desc' } });
    return merchants.map(this.toResponse);
  }

  async findOne(id: string): Promise<MerchantResponseDto> {
    const merchant = await this.prisma.merchant.findUnique({ where: { id } });
    if (!merchant) throw new NotFoundException('Merchant not found');
    return this.toResponse(merchant);
  }

  async update(id: string, dto: UpdateMerchantDto): Promise<MerchantResponseDto> {
    const merchant = await this.prisma.merchant.findUnique({ where: { id } });
    if (!merchant) throw new NotFoundException('Merchant not found');

    if (dto.ntn && dto.ntn !== merchant.ntn) {
      const existing = await this.prisma.merchant.findUnique({ where: { ntn: dto.ntn } });
      if (existing) throw new ConflictException('NTN already exists');
    }

    const updated = await this.prisma.merchant.update({
      where: { id },
      data: {
        name: dto.name,
        ntn: dto.ntn,
        address: dto.address,
        category: dto.category,
        contactNumber: dto.contact_number,
      },
    });
    return this.toResponse(updated);
  }

  async bootstrapActor(merchantId: string, dto: BootstrapActorDto): Promise<ActorResponseDto> {
    const merchant = await this.prisma.merchant.findUnique({ where: { id: merchantId } });
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
          data: { merchantId, roleType: dto.role, description: `${dto.role} role` },
        });
      }

      const newActor = await tx.actor.create({
        data: { merchantId, email: dto.email, passwordHash, firstName, lastName, isActive: true },
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
      created_at: m.createdAt,
      updated_at: m.updatedAt,
    };
  }
}
