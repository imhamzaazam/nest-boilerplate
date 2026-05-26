import {
  Injectable,
  UnauthorizedException,
  NotFoundException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcryptjs';
import { randomBytes } from 'crypto';
import { PrismaService } from '@/infra/config/prisma/prisma.service';
import { RoleType } from '@prisma/client';
import { LoginDto, LoginResponseDto } from './dto/login.dto';
import { RenewTokenDto, RenewTokenResponseDto } from './dto/renew-token.dto';

export interface JwtPayload {
  sub: string;
  merchant_id: string;
  role: RoleType;
  email: string;
}

export interface AuthenticatedUser {
  id: string;
  merchantId: string;
  email: string;
  role: RoleType;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async login(
    dto: LoginDto,
    userAgent?: string,
    clientIp?: string,
  ): Promise<LoginResponseDto> {
    const actor = await this.prisma.actor.findUnique({
      where: {
        merchantId_email: {
          merchantId: dto.merchant_id,
          email: dto.email,
        },
      },
      include: {
        actorRoles: {
          include: { role: true },
        },
      },
    });

    if (!actor) {
      throw new NotFoundException('Invalid credentials');
    }

    if (!actor.isActive) {
      throw new UnauthorizedException('Account is deactivated');
    }

    const isPasswordValid = await bcrypt.compare(
      dto.password,
      actor.passwordHash,
    );
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const role = actor.actorRoles[0]?.role?.roleType || RoleType.customer;

    const payload: JwtPayload = {
      sub: actor.id,
      merchant_id: actor.merchantId,
      role,
      email: actor.email,
    };

    const accessToken = this.jwtService.sign(payload);
    const accessTokenExpiresAt = this.calculateExpiration(
      this.configService.get<string>('jwt.expiration', '15m'),
    );

    const refreshToken = randomBytes(64).toString('hex');
    const refreshTokenExpiresAt = this.calculateExpiration(
      this.configService.get<string>('jwt.refreshExpiration', '30d'),
    );

    await this.prisma.session.deleteMany({
      where: {
        actorId: actor.id,
        OR: [{ expiresAt: { lt: new Date() } }, { isBlocked: true }],
      },
    });

    await this.prisma.session.create({
      data: {
        merchantId: actor.merchantId,
        actorId: actor.id,
        refreshToken,
        userAgent,
        clientIp,
        expiresAt: refreshTokenExpiresAt,
      },
    });

    await this.prisma.actor.update({
      where: { id: actor.id },
      data: { lastLogin: new Date() },
    });

    return {
      uid: actor.id,
      merchant_id: actor.merchantId,
      email: actor.email,
      access_token: accessToken,
      access_token_expires_at: accessTokenExpiresAt,
      refresh_token: refreshToken,
      refresh_token_expires_at: refreshTokenExpiresAt,
    };
  }

  async renewToken(dto: RenewTokenDto): Promise<RenewTokenResponseDto> {
    const session = await this.prisma.session.findUnique({
      where: { refreshToken: dto.refresh_token },
    });

    if (!session || session.isBlocked || session.expiresAt < new Date()) {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    const actor = await this.prisma.actor.findUnique({
      where: { id: session.actorId },
      include: {
        actorRoles: {
          include: { role: true },
        },
      },
    });

    if (!actor || !actor.isActive) {
      throw new UnauthorizedException('Account is not active');
    }

    const role = actor.actorRoles[0]?.role?.roleType || RoleType.customer;

    const payload: JwtPayload = {
      sub: actor.id,
      merchant_id: actor.merchantId,
      role,
      email: actor.email,
    };

    const accessToken = this.jwtService.sign(payload);
    const accessTokenExpiresAt = this.calculateExpiration(
      this.configService.get<string>('jwt.expiration', '15m'),
    );

    return {
      access_token: accessToken,
      access_token_expires_at: accessTokenExpiresAt,
    };
  }

  async validateUser(payload: JwtPayload): Promise<AuthenticatedUser> {
    const actor = await this.prisma.actor.findUnique({
      where: { id: payload.sub },
    });

    if (!actor || !actor.isActive) {
      throw new UnauthorizedException('Invalid token or account deactivated');
    }

    return {
      id: payload.sub,
      merchantId: payload.merchant_id,
      email: payload.email,
      role: payload.role,
    };
  }

  private calculateExpiration(duration: string): Date {
    const now = new Date();
    const match = duration.match(/^(\d+)([smhd])$/);
    if (!match) return new Date(now.getTime() + 15 * 60 * 1000);

    const value = parseInt(match[1], 10);
    const unit = match[2];
    const multipliers: Record<string, number> = {
      s: 1000,
      m: 60 * 1000,
      h: 60 * 60 * 1000,
      d: 24 * 60 * 60 * 1000,
    };

    return new Date(now.getTime() + value * (multipliers[unit] || 60 * 1000));
  }
}
