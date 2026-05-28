import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsOptional, Max, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class SalesReportQueryDto {
  @ApiProperty() @Type(() => Number) @IsInt() @Min(1) @Max(12) month: number;
  @ApiProperty() @Type(() => Number) @IsInt() @Min(2020) year: number;
}

export class SalesReportResponseDto {
  @ApiProperty() month: number;
  @ApiProperty() year: number;
  @ApiProperty() total_sales: number;
  @ApiProperty() total_discount: number;
  @ApiProperty() total_tax: number;
  @ApiProperty() profit_estimate: number;
}

export class DashboardMetricDto {
  @ApiProperty() label: string;
  @ApiProperty() value: string;
  @ApiPropertyOptional() change?: string;
  @ApiPropertyOptional() trend?: 'up' | 'down' | 'neutral';
}

export class DashboardMetricsResponseDto {
  @ApiProperty({ type: [DashboardMetricDto] }) metrics: DashboardMetricDto[];
  @ApiProperty() currency: string;
}

export class TopSellingItemDto {
  @ApiProperty() id: string;
  @ApiProperty() name: string;
  @ApiProperty() orders_count: number;
  @ApiProperty() revenue: number;
  @ApiPropertyOptional() change_percent?: number;
}

export class RevenueDataPointDto {
  @ApiProperty() date: string;
  @ApiProperty() revenue: number;
  @ApiProperty() orders: number;
}

export class AnalyticsQueryDto {
  @ApiPropertyOptional() @Type(() => Number) @IsInt() @IsOptional() days?: number;
}

export class AnalyticsResponseDto {
  @ApiProperty({ type: [DashboardMetricDto] }) metrics: DashboardMetricDto[];
  @ApiProperty({ type: [TopSellingItemDto] }) top_selling: TopSellingItemDto[];
  @ApiProperty({ type: [RevenueDataPointDto] }) revenue_trend: RevenueDataPointDto[];
  @ApiProperty() currency: string;
}
