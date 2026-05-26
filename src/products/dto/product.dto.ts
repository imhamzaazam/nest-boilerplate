import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsNotEmpty, IsNumber, IsOptional, IsString, IsUUID, Min } from 'class-validator';

export class CreateProductDto {
  @ApiProperty() @IsUUID() category_id: string;
  @ApiProperty() @IsString() @IsNotEmpty() name: string;
  @ApiPropertyOptional() @IsString() @IsOptional() description?: string;
  @ApiProperty() @IsNumber() @Min(0) base_price: number;
  @ApiPropertyOptional() @IsString() @IsOptional() image_url?: string;
  @ApiPropertyOptional() @IsBoolean() @IsOptional() track_inventory?: boolean;
}

export class CreateAddonDto {
  @ApiProperty() @IsString() @IsNotEmpty() name: string;
  @ApiProperty() @IsNumber() @Min(0) price: number;
}

export class ProductResponseDto {
  @ApiProperty() id: string;
  @ApiProperty() merchant_id: string;
  @ApiProperty() category_id: string;
  @ApiPropertyOptional() category_name?: string;
  @ApiProperty() name: string;
  @ApiPropertyOptional() description?: string;
  @ApiProperty() base_price: number;
  @ApiPropertyOptional() image_url?: string;
  @ApiProperty() track_inventory: boolean;
  @ApiProperty() is_active: boolean;
  @ApiProperty() created_at: Date;
  @ApiProperty() updated_at: Date;
}

export class AddonResponseDto {
  @ApiProperty() id: string;
  @ApiProperty() product_id: string;
  @ApiProperty() name: string;
  @ApiProperty() price: number;
  @ApiProperty() created_at: Date;
}
