import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@/infra/config/prisma/prisma.service';
import { CreateBranchDto, BranchResponseDto, BranchAvailabilityDto } from './dto/branch.dto';

@Injectable()
export class BranchesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(merchantId: string, dto: CreateBranchDto): Promise<BranchResponseDto> {
    const branch = await this.prisma.branch.create({
      data: {
        merchantId,
        name: dto.name,
        address: dto.address,
        contactNumber: dto.contact_number,
        city: dto.city,
        openingTimeMinutes: this.timeToMinutes(dto.opening_time),
        closingTimeMinutes: this.timeToMinutes(dto.closing_time),
        is24Hours: dto.is_24_hours ?? false,
        days: dto.days ?? ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY'],
      },
    });
    return this.toResponse(branch);
  }

  async findAllByMerchant(merchantId: string): Promise<BranchResponseDto[]> {
    const branches = await this.prisma.branch.findMany({
      where: { merchantId },
      orderBy: { createdAt: 'desc' },
    });
    return branches.map((b) => this.toResponse(b));
  }

  async checkAvailability(branchId: string): Promise<BranchAvailabilityDto> {
    const branch = await this.prisma.branch.findUnique({ where: { id: branchId } });
    if (!branch) throw new NotFoundException('Branch not found');

    const now = new Date();
    const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;

    return {
      merchant_id: branch.merchantId,
      branch_id: branch.id,
      branch_name: branch.name,
      is_open: this.isOpen(branch),
      opening_time: this.minutesToTime(branch.openingTimeMinutes),
      closing_time: this.minutesToTime(branch.closingTimeMinutes),
      current_time: currentTime,
      timezone: 'Asia/Karachi',
    };
  }

  private toResponse(b: any): BranchResponseDto {
    return {
      id: b.id,
      merchant_id: b.merchantId,
      name: b.name,
      address: b.address,
      contact_number: b.contactNumber,
      city: b.city,
      opening_time: this.minutesToTime(b.openingTimeMinutes),
      closing_time: this.minutesToTime(b.closingTimeMinutes),
      is_open: this.isOpen(b),
      created_at: b.createdAt,
      updated_at: b.updatedAt,
    };
  }

  private isOpen(branch: any): boolean {
    if (branch.is24Hours) return true;
    const now = new Date();
    const day = now.toLocaleDateString('en-US', { weekday: 'long' }).toUpperCase();
    if (!branch.days.includes(day)) return false;
    const mins = now.getHours() * 60 + now.getMinutes();
    if (branch.closingTimeMinutes < branch.openingTimeMinutes) {
      return mins >= branch.openingTimeMinutes || mins < branch.closingTimeMinutes;
    }
    return mins >= branch.openingTimeMinutes && mins < branch.closingTimeMinutes;
  }

  private timeToMinutes(time: string): number {
    const [h, m] = time.split(':').map(Number);
    return h * 60 + m;
  }

  private minutesToTime(mins: number): string {
    return `${Math.floor(mins / 60).toString().padStart(2, '0')}:${(mins % 60).toString().padStart(2, '0')}`;
  }
}
