import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsUUID, Min } from 'class-validator';

export class CreateInventoryDto {
  @ApiProperty() @IsUUID() product_id: string;
  @ApiProperty() @IsUUID() branch_id: string;
  @ApiProperty() @IsInt() @Min(0) quantity: number;
}

export class InventoryResponseDto {
  @ApiProperty() id: string;
  @ApiProperty() product_id: string;
  @ApiProperty() branch_id: string;
  @ApiProperty() quantity: number;
  @ApiProperty() created_at: Date;
  @ApiProperty() updated_at: Date;
}

export class InventoryListDto {
  @ApiProperty() product_id: string;
  @ApiProperty() product_name: string;
  @ApiProperty() quantity: number;
}
