import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@/infra/config/prisma/prisma.service';
import { CityType } from '@prisma/client';
import { CreateServiceZoneDto, ServiceZoneResponseDto, CheckCoverageDto, CoverageCheckResponseDto } from './dto/service-zone.dto';

@Injectable()
export class ServiceZonesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(merchantId: string, dto: CreateServiceZoneDto): Promise<ServiceZoneResponseDto> {
    const zone = await this.prisma.zone.findUnique({ where: { id: dto.zone_id }, include: { area: true } });
    if (!zone) throw new NotFoundException('Zone not found');

    const branch = await this.prisma.branch.findUnique({ where: { id: dto.branch_id } });
    if (!branch || branch.merchantId !== merchantId) throw new NotFoundException('Branch not found');

    const sz = await this.prisma.merchantServiceZone.create({
      data: { merchantId, zoneId: dto.zone_id, branchId: dto.branch_id },
    });

    return {
      id: sz.id,
      merchant_id: sz.merchantId,
      zone_id: zone.id,
      zone_name: zone.name,
      zone_coordinates_wkt: zone.coordinatesWkt ?? '',
      area_id: zone.area.id,
      area_name: zone.area.name,
      area_city: zone.area.city,
      branch_id: branch.id,
      branch_name: branch.name,
      created_at: sz.createdAt,
    };
  }

  async findAllByMerchant(merchantId: string): Promise<ServiceZoneResponseDto[]> {
    const szs = await this.prisma.merchantServiceZone.findMany({
      where: { merchantId },
      include: { zone: { include: { area: true } }, branch: true },
      orderBy: { createdAt: 'desc' },
    });

    return szs.map((sz) => ({
      id: sz.id,
      merchant_id: sz.merchantId,
      zone_id: sz.zone.id,
      zone_name: sz.zone.name,
      zone_coordinates_wkt: sz.zone.coordinatesWkt ?? '',
      area_id: sz.zone.area.id,
      area_name: sz.zone.area.name,
      area_city: sz.zone.area.city,
      branch_id: sz.branch.id,
      branch_name: sz.branch.name,
      created_at: sz.createdAt,
    }));
  }

  async checkCoverage(merchantId: string, dto: CheckCoverageDto): Promise<CoverageCheckResponseDto> {
    const result = await this.prisma.$queryRaw<any[]>`
      SELECT msz.id, msz.merchant_id, z.id as zone_id, z.name as zone_name,
             a.id as area_id, a.name as area_name, a.city as area_city,
             b.id as branch_id, b.name as branch_name
      FROM merchant_service_zones msz
      JOIN zones z ON msz.zone_id = z.id
      JOIN areas a ON z.area_id = a.id
      JOIN branches b ON msz.branch_id = b.id
      WHERE msz.merchant_id = ${merchantId}::uuid
        AND ST_Contains(z.coordinates, ST_SetSRID(ST_MakePoint(${dto.longitude}, ${dto.latitude}), 4326))
      LIMIT 1
    `;

    if (result.length === 0) return { covered: false };

    const r = result[0];
    return {
      covered: true,
      merchant_id: r.merchant_id,
      zone_id: r.zone_id,
      zone_name: r.zone_name,
      area_id: r.area_id,
      area_name: r.area_name,
      area_city: r.area_city as CityType,
      branch_id: r.branch_id,
      branch_name: r.branch_name,
    };
  }
}
