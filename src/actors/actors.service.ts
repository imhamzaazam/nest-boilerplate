import {
  Injectable,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { randomBytes } from 'crypto';
import { PrismaService } from '@/infra/config/prisma/prisma.service';
import { RoleType } from '@prisma/client';
import { CreateActorDto, ActorResponseDto } from './dto/actor.dto';

@Injectable()
export class ActorsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(
    merchantId: string,
    dto: CreateActorDto,
  ): Promise<ActorResponseDto> {
    const existing = await this.prisma.actor.findUnique({
      where: { merchantId_email: { merchantId, email: dto.email } },
    });
    if (existing) throw new ConflictException('Actor already exists');

    const [firstName, ...rest] = dto.full_name.split(' ');
    const lastName = rest.join(' ') || firstName;
    const password = dto.password || randomBytes(16).toString('hex');
    const passwordHash = await bcrypt.hash(password, 12);

    const actor = await this.prisma.$transaction(async (tx) => {
      const roleType = dto.role || RoleType.customer;
      let role = await tx.role.findUnique({
        where: { merchantId_roleType: { merchantId, roleType } },
      });
      if (!role) {
        role = await tx.role.create({
          data: { merchantId, roleType, description: `${roleType} role` },
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

    return this.toResponse(actor);
  }

  async findOne(id: string): Promise<ActorResponseDto> {
    const actor = await this.prisma.actor.findUnique({ where: { id } });
    if (!actor) throw new NotFoundException('Actor not found');
    return this.toResponse(actor);
  }

  async findAllByMerchant(merchantId: string): Promise<ActorResponseDto[]> {
    const actors = await this.prisma.actor.findMany({
      where: { merchantId },
      orderBy: { createdAt: 'desc' },
    });
    return actors.map(this.toResponse);
  }

  async findEmployeesByMerchant(
    merchantId: string,
  ): Promise<ActorResponseDto[]> {
    const actors = await this.prisma.actor.findMany({
      where: {
        merchantId,
        actorRoles: { some: { role: { roleType: RoleType.employee } } },
      },
      orderBy: { createdAt: 'desc' },
    });
    return actors.map(this.toResponse);
  }

  private toResponse(a: any): ActorResponseDto {
    return {
      uid: a.id,
      merchant_id: a.merchantId,
      email: a.email,
      full_name: `${a.firstName} ${a.lastName}`,
      is_active: a.isActive,
      last_login: a.lastLogin,
    };
  }
}
