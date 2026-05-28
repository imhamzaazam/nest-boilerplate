import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { MerchantsService } from './merchants.service';
import { PrismaService } from '@/infra/config/prisma/prisma.service';
import { MerchantCategory } from '@prisma/client';

describe('MerchantsService', () => {
  let service: MerchantsService;

  const mockPrisma: {
    merchant: {
      findUnique: jest.Mock;
      findMany: jest.Mock;
      create: jest.Mock;
      update: jest.Mock;
    };
    actor: { findUnique: jest.Mock };
    role: { findUnique: jest.Mock; create: jest.Mock };
    actorRole: { create: jest.Mock };
    $transaction: jest.Mock;
  } = {
    merchant: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    actor: {
      findUnique: jest.fn(),
    },
    role: {
      findUnique: jest.fn(),
      create: jest.fn(),
    },
    actorRole: {
      create: jest.fn(),
    },
    $transaction: jest.fn((fn: (tx: typeof mockPrisma) => unknown) => fn(mockPrisma)),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MerchantsService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<MerchantsService>(MerchantsService);
    jest.clearAllMocks();
  });

  describe('create', () => {
    const createDto = {
      name: 'Test Restaurant',
      ntn: 'NTN-123',
      address: '123 Test St',
      category: MerchantCategory.restaurant,
      contact_number: '+923001234567',
    };

    it('should create a merchant', async () => {
      mockPrisma.merchant.findUnique.mockResolvedValue(null);
      mockPrisma.merchant.create.mockResolvedValue({
        id: 'merchant-123',
        ...createDto,
        slug: 'test-restaurant-abc',
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const result = await service.create(createDto);

      expect(result).toHaveProperty('id');
      expect(result.name).toBe(createDto.name);
      expect(mockPrisma.merchant.create).toHaveBeenCalled();
    });

    it('should throw ConflictException for duplicate NTN', async () => {
      mockPrisma.merchant.findUnique.mockResolvedValue({ id: 'existing' });

      await expect(service.create(createDto)).rejects.toThrow(ConflictException);
    });
  });

  describe('findAll', () => {
    it('should return all merchants', async () => {
      const merchants = [
        { id: '1', name: 'Merchant 1', createdAt: new Date(), updatedAt: new Date() },
        { id: '2', name: 'Merchant 2', createdAt: new Date(), updatedAt: new Date() },
      ];
      mockPrisma.merchant.findMany.mockResolvedValue(merchants);

      const result = await service.findAll();

      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBe(2);
    });
  });

  describe('findOne', () => {
    it('should return a merchant by id', async () => {
      const merchant = {
        id: 'merchant-123',
        name: 'Test',
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      mockPrisma.merchant.findUnique.mockResolvedValue(merchant);

      const result = await service.findOne('merchant-123');

      expect(result.id).toBe('merchant-123');
    });

    it('should throw NotFoundException for non-existent merchant', async () => {
      mockPrisma.merchant.findUnique.mockResolvedValue(null);

      await expect(service.findOne('non-existent')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('update', () => {
    it('should update a merchant', async () => {
      const merchant = {
        id: 'merchant-123',
        name: 'Old Name',
        ntn: 'NTN-123',
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      mockPrisma.merchant.findUnique.mockResolvedValue(merchant);
      mockPrisma.merchant.update.mockResolvedValue({
        ...merchant,
        name: 'New Name',
      });

      const result = await service.update('merchant-123', { name: 'New Name' });

      expect(result.name).toBe('New Name');
    });

    it('should throw ConflictException for duplicate NTN on update', async () => {
      mockPrisma.merchant.findUnique
        .mockResolvedValueOnce({ id: 'merchant-123', ntn: 'NTN-OLD' })
        .mockResolvedValueOnce({ id: 'other', ntn: 'NTN-NEW' });

      await expect(
        service.update('merchant-123', { ntn: 'NTN-NEW' }),
      ).rejects.toThrow(ConflictException);
    });
  });
});
