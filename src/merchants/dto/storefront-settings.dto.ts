import { ApiProperty } from '@nestjs/swagger';

export class StorefrontSettingsResponseDto {
  @ApiProperty() currency: string;
  @ApiProperty({ type: [String] })
  featured_product_ids: string[];
  @ApiProperty({ description: 'Default branch for customer carts' })
  branch_id: string;
}
