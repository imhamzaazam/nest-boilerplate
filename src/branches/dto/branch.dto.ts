import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsArray, IsBoolean, IsEnum, IsNotEmpty, IsOptional, IsString, Matches } from 'class-validator';
import { CityType } from '@prisma/client';

export class CreateBranchDto {
  @ApiProperty() @IsString() @IsNotEmpty() name: string;
  @ApiProperty() @IsString() @IsNotEmpty() address: string;
  @ApiProperty() @IsString() @IsNotEmpty() contact_number: string;
  @ApiProperty({ enum: CityType }) @IsEnum(CityType) city: CityType;
  @ApiPropertyOptional() @IsBoolean() @IsOptional() is_24_hours?: boolean;
  @ApiPropertyOptional({ type: [String] }) @IsArray() @IsOptional() days?: string[];
  @ApiProperty() @IsString() @Matches(/^([01]?\d|2[0-3]):[0-5]\d$/) opening_time: string;
  @ApiProperty() @IsString() @Matches(/^([01]?\d|2[0-3]):[0-5]\d$/) closing_time: string;
}

export class BranchResponseDto {
  @ApiProperty() id: string;
  @ApiProperty() merchant_id: string;
  @ApiProperty() name: string;
  @ApiProperty() address: string;
  @ApiProperty() contact_number: string;
  @ApiProperty({ enum: CityType }) city: CityType;
  @ApiProperty() opening_time: string;
  @ApiProperty() closing_time: string;
  @ApiProperty() is_open: boolean;
  @ApiProperty() created_at: Date;
  @ApiProperty() updated_at: Date;
}

export class BranchAvailabilityDto {
  @ApiProperty() merchant_id: string;
  @ApiProperty() branch_id: string;
  @ApiProperty() branch_name: string;
  @ApiProperty() is_open: boolean;
  @ApiProperty() opening_time: string;
  @ApiProperty() closing_time: string;
  @ApiProperty() current_time: string;
  @ApiProperty() timezone: string;
}
