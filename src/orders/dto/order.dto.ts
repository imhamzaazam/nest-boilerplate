import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
} from 'class-validator';
import { PaymentType, OrderStatus } from '@prisma/client';

export class CreateOrderDto {
  @ApiProperty() @IsUUID() cart_id: string;
  @ApiProperty({ enum: PaymentType })
  @IsEnum(PaymentType)
  payment_type: PaymentType;
  @ApiProperty() @IsString() @IsNotEmpty() delivery_address: string;
  @ApiProperty() @IsString() @IsNotEmpty() customer_name: string;
  @ApiProperty()
  @IsString()
  @Matches(/^\+?[0-9]{10,15}$/)
  customer_phone: string;
  @ApiPropertyOptional({ type: String }) zone_id?: string;
}

export class UpdateOrderDto {
  @ApiPropertyOptional() @IsString() @IsOptional() delivery_address?: string;
  @ApiPropertyOptional() @IsString() @IsOptional() customer_name?: string;
  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  @Matches(/^\+?[0-9]{10,15}$/)
  customer_phone?: string;
  @ApiPropertyOptional({ enum: OrderStatus })
  @IsEnum(OrderStatus)
  @IsOptional()
  status?: OrderStatus;
}

export class UpdateOrderStatusDto {
  @ApiProperty({ enum: OrderStatus }) @IsEnum(OrderStatus) status: OrderStatus;
}

export class OrderStatusOptionDto {
  @ApiProperty({ enum: OrderStatus }) value: OrderStatus;
  @ApiProperty() label: string;
  @ApiProperty() description: string;
  @ApiProperty() sort_order: number;
  @ApiProperty() is_terminal: boolean;
}

export class OrderStatusesResponseDto {
  @ApiProperty({ type: [OrderStatusOptionDto] })
  statuses: OrderStatusOptionDto[];
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
  @ApiProperty() order_number: string;
  @ApiProperty() currency: string;
  @ApiProperty() total: number;
}

export class OrderResponseDto {
  @ApiProperty() id: string;
  @ApiProperty() order_number: string;
  @ApiProperty() cart_id: string;
  @ApiProperty() merchant_id: string;
  @ApiProperty() branch_id: string;
  @ApiPropertyOptional() actor_id?: string;
  @ApiProperty({ enum: PaymentType }) payment_type: PaymentType;
  @ApiProperty() vat_rate: number;
  @ApiProperty() total_amount: number;
  @ApiProperty() currency: string;
  @ApiProperty({ enum: OrderStatus }) status: OrderStatus;
  @ApiProperty() delivery_address: string;
  @ApiProperty() customer_name: string;
  @ApiProperty() customer_phone: string;
  @ApiProperty() created_at: Date;
  @ApiProperty() updated_at: Date;
  @ApiPropertyOptional() items_count?: number;
  @ApiPropertyOptional() items?: any[];
  @ApiPropertyOptional() zone_id?: string;
  @ApiPropertyOptional() merchant?: any;
  @ApiPropertyOptional() branch?: any;
  @ApiPropertyOptional() actor?: any;
  @ApiPropertyOptional() zone?: any;
  @ApiPropertyOptional() cart?: any;
}

export class ListOrdersResponseDto {
  @ApiProperty({ type: [OrderResponseDto] }) items: OrderResponseDto[];
  @ApiProperty() total: number;
  @ApiPropertyOptional() limit?: number;
  @ApiPropertyOptional() skip?: number;
  @ApiPropertyOptional() page?: number;
}
