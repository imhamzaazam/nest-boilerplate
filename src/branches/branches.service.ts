import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { BranchStatus, Prisma } from '@prisma/client';
import { PrismaService } from '@/infra/config/prisma/prisma.service';
import {
  CreateBranchDto,
  BranchResponseDto,
  BranchAvailabilityDto,
  UpdateBranchDto,
  OperatingHourDto,
} from './dto/branch.dto';
import {
  defaultOperatingHours,
  isBranchOpenNow,
  legacyFieldsFromOperatingHours,
  minutesToTime,
  resolveBranchOperatingHours,
  timeToMinutes,
} from './branch-hours.util';

@Injectable()
export class BranchesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(
    merchantId: string,
    dto: CreateBranchDto,
  ): Promise<BranchResponseDto> {
    const operatingHours = dto.operating_hours ?? defaultOperatingHours();
    const legacy = legacyFieldsFromOperatingHours(operatingHours);

    const branch = await this.prisma.branch.create({
      data: {
        merchantId,
        name: dto.name,
        address: dto.address,
        contactNumber: dto.contact_number,
        contactName: dto.contact_name,
        contactEmail: dto.contact_email,
        branchCode: dto.branch_code ?? this.generateBranchCode(),
        city: dto.city,
        status: dto.status ?? BranchStatus.active,
        operatingHours: operatingHours as unknown as Prisma.InputJsonValue,
        openingTimeMinutes: dto.opening_time
          ? timeToMinutes(dto.opening_time)
          : legacy.openingTimeMinutes,
        closingTimeMinutes: dto.closing_time
          ? timeToMinutes(dto.closing_time)
          : legacy.closingTimeMinutes,
        is24Hours: dto.is_24_hours ?? legacy.is24Hours,
        days: dto.days ?? legacy.days,
      },
      include: { _count: { select: { merchantServiceZones: true } } },
    });
    return this.toResponse(branch);
  }

  async findAllByMerchant(merchantId: string): Promise<BranchResponseDto[]> {
    const branches = await this.prisma.branch.findMany({
      where: { merchantId },
      include: { _count: { select: { merchantServiceZones: true } } },
      orderBy: { createdAt: 'desc' },
    });
    return branches.map((b) => this.toResponse(b));
  }

  async findOne(merchantId: string, branchId: string): Promise<BranchResponseDto> {
    const branch = await this.getBranchForMerchant(merchantId, branchId);
    const withCount = await this.prisma.branch.findUnique({
      where: { id: branchId },
      include: { _count: { select: { merchantServiceZones: true } } },
    });
    return this.toResponse(withCount!);
  }

  async update(
    merchantId: string,
    branchId: string,
    dto: UpdateBranchDto,
  ): Promise<BranchResponseDto> {
    await this.getBranchForMerchant(merchantId, branchId);

    const operatingHours = dto.operating_hours;
    const legacy = operatingHours
      ? legacyFieldsFromOperatingHours(operatingHours)
      : null;

    const updated = await this.prisma.branch.update({
      where: { id: branchId },
      data: {
        ...(dto.name !== undefined && { name: dto.name }),
        ...(dto.address !== undefined && { address: dto.address }),
        ...(dto.contact_number !== undefined && {
          contactNumber: dto.contact_number,
        }),
        ...(dto.contact_name !== undefined && { contactName: dto.contact_name }),
        ...(dto.contact_email !== undefined && {
          contactEmail: dto.contact_email,
        }),
        ...(dto.branch_code !== undefined && { branchCode: dto.branch_code }),
        ...(dto.city !== undefined && { city: dto.city }),
        ...(dto.status !== undefined && { status: dto.status }),
        ...(operatingHours !== undefined && {
          operatingHours: operatingHours as unknown as Prisma.InputJsonValue,
          days: legacy!.days.length > 0 ? legacy!.days : ['MONDAY'],
          openingTimeMinutes: legacy!.openingTimeMinutes,
          closingTimeMinutes: legacy!.closingTimeMinutes,
          is24Hours: dto.is_24_hours ?? legacy!.is24Hours,
        }),
        ...(dto.is_24_hours !== undefined &&
          operatingHours === undefined && { is24Hours: dto.is_24_hours }),
        ...(dto.opening_time !== undefined &&
          operatingHours === undefined && {
            openingTimeMinutes: timeToMinutes(dto.opening_time),
          }),
        ...(dto.closing_time !== undefined &&
          operatingHours === undefined && {
            closingTimeMinutes: timeToMinutes(dto.closing_time),
          }),
        ...(dto.days !== undefined &&
          operatingHours === undefined && { days: dto.days }),
      },
      include: { _count: { select: { merchantServiceZones: true } } },
    });
    return this.toResponse(updated);
  }

  async delete(merchantId: string, branchId: string): Promise<void> {
    await this.getBranchForMerchant(merchantId, branchId);
    await this.prisma.branch.delete({ where: { id: branchId } });
  }

  async checkAvailability(
    merchantId: string,
    branchId: string,
  ): Promise<BranchAvailabilityDto> {
    const branch = await this.getBranchForMerchant(merchantId, branchId);
    const now = new Date();
    const hours = resolveBranchOperatingHours(branch);
    const today = hours.find(
      (row) =>
        row.day ===
        now.toLocaleDateString('en-US', { weekday: 'long' }).toUpperCase(),
    );

    return {
      merchant_id: branch.merchantId,
      branch_id: branch.id,
      branch_name: branch.name,
      is_open: isBranchOpenNow(branch, now),
      opening_time: today?.opening_time ?? minutesToTime(branch.openingTimeMinutes),
      closing_time: today?.closing_time ?? minutesToTime(branch.closingTimeMinutes),
      current_time: `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`,
      timezone: 'Asia/Karachi',
    };
  }

  private async getBranchForMerchant(merchantId: string, branchId: string) {
    const branch = await this.prisma.branch.findUnique({ where: { id: branchId } });
    if (!branch) throw new NotFoundException('Branch not found');
    if (branch.merchantId !== merchantId) {
      throw new ForbiddenException('Branch does not belong to this merchant');
    }
    return branch;
  }

  private generateBranchCode(): string {
    return `BR-${Date.now().toString(36).toUpperCase().slice(-6)}`;
  }

  private toResponse(
    b: Prisma.BranchGetPayload<{
      include: { _count: { select: { merchantServiceZones: true } } };
    }>,
  ): BranchResponseDto {
    const operating_hours = resolveBranchOperatingHours(b);
    const firstOpen = operating_hours.find((row) => row.open);

    return {
      id: b.id,
      merchant_id: b.merchantId,
      branch_code: b.branchCode ?? undefined,
      name: b.name,
      address: b.address,
      contact_name: b.contactName ?? undefined,
      contact_email: b.contactEmail ?? undefined,
      contact_number: b.contactNumber,
      city: b.city,
      status: b.status,
      opening_time: firstOpen?.opening_time ?? minutesToTime(b.openingTimeMinutes),
      closing_time: firstOpen?.closing_time ?? minutesToTime(b.closingTimeMinutes),
      is_24_hours: b.is24Hours,
      days: b.days,
      operating_hours,
      is_open: isBranchOpenNow(b),
      delivery_zones_count: b._count?.merchantServiceZones ?? 0,
      created_at: b.createdAt,
      updated_at: b.updatedAt,
    };
  }
}
