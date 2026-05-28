import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PaymentType } from '@prisma/client';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  Min,
  ValidateNested,
} from 'class-validator';
import { MAX_FEATURED_PRODUCTS } from '../featured-products.util';

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

export class VatRuleSettingDto {
  @ApiProperty({ enum: PaymentType })
  @IsEnum(PaymentType)
  payment_type: PaymentType;

  @ApiProperty({ example: 16 })
  @IsNumber()
  @Min(0)
  rate: number;

  @ApiPropertyOptional({ example: 'Cash' })
  @IsString()
  @IsOptional()
  label?: string;
}

export class MerchantSettingsResponseDto {
  @ApiProperty() currency: string;
  @ApiProperty({ type: [VatRuleSettingDto] })
  vat_rules: VatRuleSettingDto[];
  @ApiProperty({ type: [String] })
  featured_product_ids: string[];
}

export class UpdateMerchantSettingsDto {
  @ApiPropertyOptional({ example: 'PKR' })
  @IsString()
  @IsOptional()
  currency?: string;

  @ApiPropertyOptional({ type: [VatRuleSettingDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => VatRuleSettingDto)
  @IsOptional()
  vat_rules?: VatRuleSettingDto[];

  @ApiPropertyOptional({ type: [String], maxItems: MAX_FEATURED_PRODUCTS })
  @IsArray()
  @ArrayMaxSize(MAX_FEATURED_PRODUCTS)
  @IsUUID('4', { each: true })
  @IsOptional()
  featured_product_ids?: string[];
}
