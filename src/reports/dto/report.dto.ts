import { ApiProperty } from '@nestjs/swagger';
import { IsInt, Max, Min } from 'class-validator';
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
