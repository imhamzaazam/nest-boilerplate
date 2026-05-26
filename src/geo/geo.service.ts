import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@/infra/config/prisma/prisma.service';
import { CreateAreaDto, AreaResponseDto, CreateZoneDto, ZoneResponseDto } from './dto/geo.dto';

@Injectable()
export class GeoService {
  constructor(private readonly prisma: PrismaService) {}

  async createArea(dto: CreateAreaDto): Promise<AreaResponseDto> {
    const area = await this.prisma.area.create({ data: { name: dto.name, city: dto.city } });
    return { id: area.id, name: area.name, city: area.city, created_at: area.createdAt };
  }

  async findAllAreas(): Promise<AreaResponseDto[]> {
    const areas = await this.prisma.area.findMany({ orderBy: { createdAt: 'desc' } });
    return areas.map((a) => ({ id: a.id, name: a.name, city: a.city, created_at: a.createdAt }));
  }

  async createZone(areaId: string, dto: CreateZoneDto): Promise<ZoneResponseDto> {
    const area = await this.prisma.area.findUnique({ where: { id: areaId } });
    if (!area) throw new NotFoundException('Area not found');

    const zone = await this.prisma.$queryRaw<any[]>`
      INSERT INTO zones (id, area_id, name, coordinates_wkt, coordinates, created_at)
      VALUES (gen_random_uuid(), ${areaId}::uuid, ${dto.name}, ${dto.coordinates_wkt}, ST_GeomFromText(${dto.coordinates_wkt}, 4326), NOW())
      RETURNING id, area_id as "areaId", name, coordinates_wkt as "coordinatesWkt", created_at as "createdAt"
    `;

    return {
      id: zone[0].id,
      area_id: zone[0].areaId,
      name: zone[0].name,
      coordinates_wkt: zone[0].coordinatesWkt,
      created_at: zone[0].createdAt,
    };
  }

  async findZonesByArea(areaId: string): Promise<ZoneResponseDto[]> {
    const zones = await this.prisma.zone.findMany({ where: { areaId }, orderBy: { createdAt: 'desc' } });
    return zones.map((z) => ({
      id: z.id,
      area_id: z.areaId,
      name: z.name,
      coordinates_wkt: z.coordinatesWkt ?? '',
      created_at: z.createdAt,
    }));
  }
}
