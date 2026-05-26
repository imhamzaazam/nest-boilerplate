import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty, IsString, IsUUID, Matches } from 'class-validator';
import { PaymentType, OrderStatus } from '@prisma/client';

export class CreateOrderDto {
  @ApiProperty() @IsUUID() cart_id: string;
  @ApiProperty({ enum: PaymentType }) @IsEnum(PaymentType) payment_type: PaymentType;
  @ApiProperty() @IsString() @IsNotEmpty() delivery_address: string;
  @ApiProperty() @IsString() @IsNotEmpty() customer_name: string;
  @ApiProperty() @IsString() @Matches(/^\+?[0-9]{10,15}$/) customer_phone: string;
}

export class UpdateOrderStatusDto {
  @ApiProperty({ enum: OrderStatus }) @IsEnum(OrderStatus) status: OrderStatus;
}

export class OrderLineItemDto {
  @ApiProperty() product_id: string;
  @ApiProperty() name: string;
  @ApiProperty() quantity: number;
  @ApiProperty() base_price: number;
  @ApiProperty() base_amount: number;
  @ApiProperty() addon_amount: number;
  @ApiProperty() discount_amount: number;
  @ApiProperty() tax_amount: number;
  @ApiProperty() final_price: number;
  @ApiProperty() line_total: number;
  @ApiProperty() vat: number;
}

export class CreateOrderResponseDto {
  @ApiProperty() order_id: string;
  @ApiProperty({ enum: PaymentType }) payment_method: PaymentType;
  @ApiProperty({ type: [OrderLineItemDto] }) line_items: OrderLineItemDto[];
  @ApiProperty() subtotal: number;
  @ApiProperty() total_tax: number;
  @ApiProperty() vat_rate: number;
  @ApiProperty() total: number;
}

export class OrderResponseDto {
  @ApiProperty() id: string;
  @ApiProperty() cart_id: string;
  @ApiProperty() merchant_id: string;
  @ApiProperty() branch_id: string;
  @ApiPropertyOptional() actor_id?: string;
  @ApiProperty({ enum: PaymentType }) payment_type: PaymentType;
  @ApiProperty() vat_rate: number;
  @ApiProperty() total_amount: number;
  @ApiProperty({ enum: OrderStatus }) status: OrderStatus;
  @ApiProperty() delivery_address: string;
  @ApiProperty() customer_name: string;
  @ApiProperty() customer_phone: string;
  @ApiProperty() created_at: Date;
  @ApiProperty() updated_at: Date;
  @ApiPropertyOptional() items?: any[];
}
