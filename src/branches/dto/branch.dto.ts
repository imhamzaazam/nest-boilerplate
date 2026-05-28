import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { BranchStatus, CityType } from '@prisma/client';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  ValidateNested,
} from 'class-validator';

export class OperatingHourDto {
  @ApiProperty({ example: 'MONDAY' })
  @IsString()
  day: string;

  @ApiProperty()
  @IsBoolean()
  open: boolean;

  @ApiProperty({ example: '09:00' })
  @IsString()
  @Matches(/^([01]?\d|2[0-3]):[0-5]\d$/)
  opening_time: string;

  @ApiProperty({ example: '22:00' })
  @IsString()
  @Matches(/^([01]?\d|2[0-3]):[0-5]\d$/)
  closing_time: string;
}

export class CreateBranchDto {
  @ApiProperty() @IsString() @IsNotEmpty() name: string;
  @ApiProperty() @IsString() @IsNotEmpty() address: string;
  @ApiProperty() @IsString() @IsNotEmpty() contact_number: string;
  @ApiPropertyOptional() @IsString() @IsOptional() contact_name?: string;
  @ApiPropertyOptional() @IsEmail() @IsOptional() contact_email?: string;
  @ApiPropertyOptional() @IsString() @IsOptional() branch_code?: string;
  @ApiProperty({ enum: CityType }) @IsEnum(CityType) city: CityType;
  @ApiPropertyOptional({ enum: BranchStatus }) @IsEnum(BranchStatus) @IsOptional() status?: BranchStatus;
  @ApiPropertyOptional() @IsBoolean() @IsOptional() is_24_hours?: boolean;
  @ApiPropertyOptional({ type: [String] }) @IsArray() @IsOptional() days?: string[];
  @ApiPropertyOptional() @IsString() @Matches(/^([01]?\d|2[0-3]):[0-5]\d$/) @IsOptional() opening_time?: string;
  @ApiPropertyOptional() @IsString() @Matches(/^([01]?\d|2[0-3]):[0-5]\d$/) @IsOptional() closing_time?: string;
  @ApiPropertyOptional({ type: [OperatingHourDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => OperatingHourDto)
  @IsOptional()
  operating_hours?: OperatingHourDto[];
}

export class UpdateBranchDto extends CreateBranchDto {}

export class BranchResponseDto {
  @ApiProperty() id: string;
  @ApiProperty() merchant_id: string;
  @ApiPropertyOptional() branch_code?: string;
  @ApiProperty() name: string;
  @ApiProperty() address: string;
  @ApiPropertyOptional() contact_name?: string;
  @ApiPropertyOptional() contact_email?: string;
  @ApiProperty() contact_number: string;
  @ApiProperty({ enum: CityType }) city: CityType;
  @ApiProperty({ enum: BranchStatus }) status: BranchStatus;
  @ApiProperty() opening_time: string;
  @ApiProperty() closing_time: string;
  @ApiProperty() is_24_hours: boolean;
  @ApiProperty({ type: [String] }) days: string[];
  @ApiProperty({ type: [OperatingHourDto] }) operating_hours: OperatingHourDto[];
  @ApiProperty() is_open: boolean;
  @ApiProperty() delivery_zones_count: number;
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
