import { Test, TestingModule } from '@nestjs/testing';
import { UnauthorizedException, NotFoundException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcryptjs';
import { AuthService } from './auth.service';
import { PrismaService } from '@/infra/config/prisma/prisma.service';
import { RoleType } from '@prisma/client';

describe('AuthService', () => {
  let service: AuthService;
  let prisma: PrismaService;
  let jwtService: JwtService;

  const mockPrisma = {
    actor: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    session: {
      findUnique: jest.fn(),
      create: jest.fn(),
      deleteMany: jest.fn(),
    },
  };

  const mockJwtService = {
    sign: jest.fn().mockReturnValue('mock-token'),
  };

  const mockConfigService = {
    get: jest.fn((key: string, defaultValue?: string) => {
      const config: Record<string, string> = {
        'jwt.secret': 'test-secret',
        'jwt.expiration': '15m',
        'jwt.refreshExpiration': '30d',
      };
      return config[key] || defaultValue;
    }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: JwtService, useValue: mockJwtService },
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    prisma = module.get<PrismaService>(PrismaService);
    jwtService = module.get<JwtService>(JwtService);

    jest.clearAllMocks();
  });

  describe('login', () => {
    const loginDto = {
      merchant_id: 'merchant-123',
      email: 'test@example.com',
      password: 'password123',
    };

    const mockActor = {
      id: 'actor-123',
      merchantId: 'merchant-123',
      email: 'test@example.com',
      passwordHash: '',
      isActive: true,
      actorRoles: [{ role: { roleType: RoleType.merchant } }],
    };

    beforeEach(async () => {
      mockActor.passwordHash = await bcrypt.hash('password123', 10);
    });

    it('should return tokens on successful login', async () => {
      mockPrisma.actor.findUnique.mockResolvedValue(mockActor);
      mockPrisma.session.deleteMany.mockResolvedValue({ count: 0 });
      mockPrisma.session.create.mockResolvedValue({});
      mockPrisma.actor.update.mockResolvedValue(mockActor);

      const result = await service.login(loginDto);

      expect(result).toHaveProperty('access_token');
      expect(result).toHaveProperty('refresh_token');
      expect(result.uid).toBe(mockActor.id);
      expect(result.email).toBe(mockActor.email);
    });

    it('should throw NotFoundException for non-existent actor', async () => {
      mockPrisma.actor.findUnique.mockResolvedValue(null);

      await expect(service.login(loginDto)).rejects.toThrow(NotFoundException);
    });

    it('should throw UnauthorizedException for inactive actor', async () => {
      mockPrisma.actor.findUnique.mockResolvedValue({
        ...mockActor,
        isActive: false,
      });

      await expect(service.login(loginDto)).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should throw UnauthorizedException for wrong password', async () => {
      mockPrisma.actor.findUnique.mockResolvedValue(mockActor);

      await expect(
        service.login({ ...loginDto, password: 'wrong-password' }),
      ).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('renewToken', () => {
    const mockSession = {
      id: 'session-123',
      actorId: 'actor-123',
      refreshToken: 'valid-refresh-token',
      isBlocked: false,
      expiresAt: new Date(Date.now() + 86400000),
    };

    const mockActor = {
      id: 'actor-123',
      merchantId: 'merchant-123',
      email: 'test@example.com',
      isActive: true,
      actorRoles: [{ role: { roleType: RoleType.merchant } }],
    };

    it('should return new access token', async () => {
      mockPrisma.session.findUnique.mockResolvedValue(mockSession);
      mockPrisma.actor.findUnique.mockResolvedValue(mockActor);

      const result = await service.renewToken({
        refresh_token: 'valid-refresh-token',
      });

      expect(result).toHaveProperty('access_token');
      expect(jwtService.sign).toHaveBeenCalled();
    });

    it('should throw UnauthorizedException for invalid token', async () => {
      mockPrisma.session.findUnique.mockResolvedValue(null);

      await expect(
        service.renewToken({ refresh_token: 'invalid-token' }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException for blocked session', async () => {
      mockPrisma.session.findUnique.mockResolvedValue({
        ...mockSession,
        isBlocked: true,
      });

      await expect(
        service.renewToken({ refresh_token: 'blocked-token' }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException for expired token', async () => {
      mockPrisma.session.findUnique.mockResolvedValue({
        ...mockSession,
        expiresAt: new Date(Date.now() - 86400000),
      });

      await expect(
        service.renewToken({ refresh_token: 'expired-token' }),
      ).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('validateUser', () => {
    const payload = {
      sub: 'actor-123',
      merchant_id: 'merchant-123',
      role: RoleType.merchant,
      email: 'test@example.com',
    };

    it('should return authenticated user', async () => {
      mockPrisma.actor.findUnique.mockResolvedValue({
        id: 'actor-123',
        isActive: true,
      });

      const result = await service.validateUser(payload);

      expect(result.id).toBe(payload.sub);
      expect(result.merchantId).toBe(payload.merchant_id);
      expect(result.role).toBe(payload.role);
    });

    it('should throw UnauthorizedException for inactive user', async () => {
      mockPrisma.actor.findUnique.mockResolvedValue({
        id: 'actor-123',
        isActive: false,
      });

      await expect(service.validateUser(payload)).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });
});
