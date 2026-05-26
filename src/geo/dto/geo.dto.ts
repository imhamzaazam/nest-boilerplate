import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty, IsString } from 'class-validator';
import { CityType } from '@prisma/client';

export class CreateAreaDto {
  @ApiProperty() @IsString() @IsNotEmpty() name: string;
  @ApiProperty({ enum: CityType }) @IsEnum(CityType) city: CityType;
}

export class AreaResponseDto {
  @ApiProperty() id: string;
  @ApiProperty() name: string;
  @ApiProperty({ enum: CityType }) city: CityType;
  @ApiProperty() created_at: Date;
}

export class CreateZoneDto {
  @ApiProperty() @IsString() @IsNotEmpty() name: string;
  @ApiProperty() @IsString() @IsNotEmpty() coordinates_wkt: string;
}

export class ZoneResponseDto {
  @ApiProperty() id: string;
  @ApiProperty() area_id: string;
  @ApiProperty() name: string;
  @ApiProperty() coordinates_wkt: string;
  @ApiProperty() created_at: Date;
}
