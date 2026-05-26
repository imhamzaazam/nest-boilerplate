import { Controller, Get, Post, Body, Param, ParseUUIDPipe } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { RoleType } from '@prisma/client';
import { GeoService } from './geo.service';
import { CreateAreaDto, AreaResponseDto, CreateZoneDto, ZoneResponseDto } from './dto/geo.dto';
import { Roles } from '@/auth/decorators/roles.decorator';

@ApiTags('Areas & Zones')
@Controller('areas')
@ApiBearerAuth()
export class GeoController {
  constructor(private readonly service: GeoService) {}

  @Get()
  @ApiOperation({ summary: 'List areas' })
  findAllAreas(): Promise<AreaResponseDto[]> {
    return this.service.findAllAreas();
  }

  @Post()
  @Roles(RoleType.admin)
  @ApiOperation({ summary: 'Create area' })
  createArea(@Body() dto: CreateAreaDto): Promise<AreaResponseDto> {
    return this.service.createArea(dto);
  }

  @Get(':area_id/zones')
  @ApiOperation({ summary: 'List zones in area' })
  findZones(@Param('area_id', ParseUUIDPipe) id: string): Promise<ZoneResponseDto[]> {
    return this.service.findZonesByArea(id);
  }

  @Post(':area_id/zones')
  @Roles(RoleType.admin)
  @ApiOperation({ summary: 'Create zone' })
  createZone(@Param('area_id', ParseUUIDPipe) id: string, @Body() dto: CreateZoneDto): Promise<ZoneResponseDto> {
    return this.service.createZone(id, dto);
  }
}
