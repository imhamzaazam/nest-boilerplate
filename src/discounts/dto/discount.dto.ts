import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsNumber, IsOptional, IsString, IsUUID, Min } from 'class-validator';
import { DiscountType } from '@prisma/client';

export class CreateDiscountDto {
  @ApiProperty({ enum: DiscountType }) @IsEnum(DiscountType) type: DiscountType;
  @ApiProperty() @IsNumber() @Min(0) value: number;
  @ApiPropertyOptional() @IsString() @IsOptional() description?: string;
  @ApiPropertyOptional() @IsUUID() @IsOptional() product_id?: string;
  @ApiPropertyOptional() @IsUUID() @IsOptional() category_id?: string;
}

export class DiscountResponseDto {
  @ApiProperty() id: string;
  @ApiProperty() merchant_id: string;
  @ApiPropertyOptional() product_id?: string;
  @ApiPropertyOptional() category_id?: string;
  @ApiProperty({ enum: DiscountType }) type: DiscountType;
  @ApiProperty() value: number;
  @ApiPropertyOptional() description?: string;
  @ApiPropertyOptional() valid_from?: Date;
  @ApiPropertyOptional() valid_to?: Date;
  @ApiProperty() created_at: Date;
}
