import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNumber, IsUUID } from 'class-validator';
import { CityType } from '@prisma/client';

export class CreateServiceZoneDto {
  @ApiProperty() @IsUUID() zone_id: string;
  @ApiProperty() @IsUUID() branch_id: string;
}

export class CheckCoverageDto {
  @ApiProperty() @IsNumber() latitude: number;
  @ApiProperty() @IsNumber() longitude: number;
}

export class ServiceZoneResponseDto {
  @ApiProperty() id: string;
  @ApiProperty() merchant_id: string;
  @ApiProperty() zone_id: string;
  @ApiProperty() zone_name: string;
  @ApiProperty() zone_coordinates_wkt: string;
  @ApiProperty() area_id: string;
  @ApiProperty() area_name: string;
  @ApiProperty({ enum: CityType }) area_city: CityType;
  @ApiProperty() branch_id: string;
  @ApiProperty() branch_name: string;
  @ApiProperty() created_at: Date;
}

export class CoverageCheckResponseDto {
  @ApiProperty() covered: boolean;
  @ApiPropertyOptional() merchant_id?: string;
  @ApiPropertyOptional() zone_id?: string;
  @ApiPropertyOptional() zone_name?: string;
  @ApiPropertyOptional() area_id?: string;
  @ApiPropertyOptional() area_name?: string;
  @ApiPropertyOptional({ enum: CityType }) area_city?: CityType;
  @ApiPropertyOptional() branch_id?: string;
  @ApiPropertyOptional() branch_name?: string;
}
