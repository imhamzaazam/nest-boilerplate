import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Min,
} from 'class-validator';

export class CreateProductDto {
  @ApiProperty() @IsUUID() category_id: string;
  @ApiProperty() @IsString() @IsNotEmpty() name: string;
  @ApiPropertyOptional() @IsString() @IsOptional() description?: string;
  @ApiProperty() @IsNumber() @Min(0) base_price: number;
  @ApiPropertyOptional() @IsString() @IsOptional() image_url?: string;
  @ApiPropertyOptional() @IsBoolean() @IsOptional() track_inventory?: boolean;
}

export class UpdateProductDto {
  @ApiPropertyOptional() @IsUUID() @IsOptional() category_id?: string;
  @ApiPropertyOptional() @IsString() @IsOptional() name?: string;
  @ApiPropertyOptional() @IsString() @IsOptional() description?: string;
  @ApiPropertyOptional() @IsNumber() @Min(0) @IsOptional() base_price?: number;
  @ApiPropertyOptional() @IsString() @IsOptional() image_url?: string;
  @ApiPropertyOptional() @IsBoolean() @IsOptional() track_inventory?: boolean;
  @ApiPropertyOptional() @IsBoolean() @IsOptional() is_active?: boolean;
}

export class CreateAddonDto {
  @ApiProperty() @IsString() @IsNotEmpty() name: string;
  @ApiProperty() @IsNumber() @Min(0) price: number;
}

export class UpdateAddonDto {
  @ApiPropertyOptional() @IsString() @IsOptional() name?: string;
  @ApiPropertyOptional() @IsNumber() @Min(0) @IsOptional() price?: number;
}

export class ProductCategoryDto {
  @ApiProperty() id: string;
  @ApiProperty() name: string;
}

export class ProductResponseDto {
  @ApiProperty() id: string;
  @ApiProperty() merchant_id: string;
  @ApiProperty() category_id: string;
  @ApiPropertyOptional({ type: () => ProductCategoryDto })
  category?: ProductCategoryDto;
  @ApiProperty() name: string;
  @ApiPropertyOptional() description?: string;
  @ApiProperty() base_price: number;
  @ApiPropertyOptional() image_url?: string;
  @ApiProperty() track_inventory: boolean;
  @ApiProperty() is_active: boolean;
  @ApiProperty() created_at: Date;
  @ApiProperty() updated_at: Date;
  @ApiProperty() currency: string;
  @ApiProperty() is_featured: boolean;
}

export class PosProductResponseDto extends ProductResponseDto {
  @ApiProperty({
    description: 'Whether the product can be added to a POS cart',
  })
  is_available: boolean;

  @ApiPropertyOptional({
    description: 'Display tag when the product is unavailable (e.g. "Unavailable")',
    nullable: true,
  })
  availability_tag: string | null;
}

export class PosProductsListResponseDto {
  @ApiProperty({ type: [PosProductResponseDto] })
  items: PosProductResponseDto[];

  @ApiProperty()
  total: number;

  @ApiProperty()
  currency: string;
}

export class AddonResponseDto {
  @ApiProperty() id: string;
  @ApiProperty() product_id: string;
  @ApiProperty() name: string;
  @ApiProperty() price: number;
  @ApiProperty() created_at: Date;
}
