import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsArray, IsInt, IsOptional, IsUUID, Min } from 'class-validator';
import { PaymentType, CartStatus } from '@prisma/client';

export class CreateCartDto {
  @ApiProperty() @IsUUID() merchant_id: string;
  @ApiProperty() @IsUUID() branch_id: string;
}

export class AddCartItemDto {
  @ApiProperty() @IsUUID() product_id: string;
  @ApiProperty() @IsInt() @Min(1) quantity: number;
  @ApiPropertyOptional({ type: [String] }) @IsArray() @IsUUID('4', { each: true }) @IsOptional() addon_ids?: string[];
  @ApiPropertyOptional() @IsUUID() @IsOptional() discount_id?: string;
}

export class UpdateCartItemDto {
  @ApiProperty() @IsInt() @Min(1) quantity: number;
}

export class CartItemResponseDto {
  @ApiProperty() item_id: string;
  @ApiProperty() product_id: string;
  @ApiProperty() quantity: number;
}

export class CartCreatedDto {
  @ApiProperty() id: string;
  @ApiProperty() branch_id: string;
  @ApiProperty() created_at: Date;
  @ApiProperty() updated_at: Date;
}

export class CartProductDto {
  @ApiProperty() id: string;
  @ApiProperty() item_id: string;
  @ApiProperty() name: string;
  @ApiProperty() price: number;
  @ApiProperty() final_price: number;
  @ApiProperty() quantity: number;
  @ApiProperty() total_price: number;
  @ApiProperty() vat: number;
  @ApiPropertyOptional() addons?: { id: string; name: string; price: number }[];
}

export class CartResponseDto {
  @ApiProperty() cart_id: string;
  @ApiProperty({ enum: CartStatus }) status: CartStatus;
  @ApiProperty({ enum: PaymentType }) payment_method: PaymentType;
  @ApiProperty({ type: [CartProductDto] }) products: CartProductDto[];
  @ApiProperty() subtotal: number;
  @ApiProperty() total_vat: number;
  @ApiProperty() vat_rate: number;
  @ApiProperty() total_price: number;
  @ApiProperty() currency: string;
}
