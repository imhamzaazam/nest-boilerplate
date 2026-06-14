import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsDateString,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Min,
  ValidateIf,
} from 'class-validator';
import { DiscountType } from '@prisma/client';

export type DiscountScope = 'store' | 'product' | 'category';
export type DiscountStatus = 'active' | 'scheduled' | 'expired';

export class DiscountTargetDto {
  @ApiProperty() id: string;
  @ApiProperty() name: string;
}

export class CreateDiscountDto {
  @ApiProperty({ enum: DiscountType }) @IsEnum(DiscountType) type: DiscountType;
  @ApiProperty() @IsNumber() @Min(0) value: number;
  @ApiPropertyOptional() @IsString() @IsOptional() description?: string;
  @ApiPropertyOptional() @IsUUID() @IsOptional() product_id?: string;
  @ApiPropertyOptional() @IsUUID() @IsOptional() category_id?: string;
  @ApiPropertyOptional() @IsDateString() @IsOptional() valid_from?: string;
  @ApiPropertyOptional() @IsDateString() @IsOptional() valid_to?: string;
}

export class UpdateDiscountDto {
  @ApiPropertyOptional({ enum: DiscountType })
  @IsEnum(DiscountType)
  @IsOptional()
  type?: DiscountType;

  @ApiPropertyOptional()
  @IsNumber()
  @Min(0)
  @IsOptional()
  value?: number;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({ nullable: true })
  @ValidateIf((_, value) => value != null)
  @IsUUID()
  @IsOptional()
  product_id?: string | null;

  @ApiPropertyOptional({ nullable: true })
  @ValidateIf((_, value) => value != null)
  @IsUUID()
  @IsOptional()
  category_id?: string | null;

  @ApiPropertyOptional()
  @IsDateString()
  @IsOptional()
  valid_from?: string;

  @ApiPropertyOptional()
  @IsDateString()
  @IsOptional()
  valid_to?: string;
}

export class DiscountResponseDto {
  @ApiProperty() id: string;
  @ApiProperty() merchant_id: string;
  @ApiPropertyOptional() product_id?: string;
  @ApiPropertyOptional() category_id?: string;
  @ApiProperty({ enum: ['store', 'product', 'category'] }) scope: DiscountScope;
  @ApiPropertyOptional({ type: () => DiscountTargetDto })
  product?: DiscountTargetDto;
  @ApiPropertyOptional({ type: () => DiscountTargetDto })
  category?: DiscountTargetDto;
  @ApiProperty({ enum: DiscountType }) type: DiscountType;
  @ApiProperty() value: number;
  @ApiPropertyOptional() description?: string;
  @ApiPropertyOptional() valid_from?: Date;
  @ApiPropertyOptional() valid_to?: Date;
  @ApiProperty({ enum: ['active', 'scheduled', 'expired'] })
  status: DiscountStatus;
  @ApiProperty() created_at: Date;
}
