import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty, IsOptional, IsString, MinLength, IsEmail } from 'class-validator';
import { MerchantCategory, RoleType } from '@prisma/client';

export class CreateMerchantDto {
  @ApiProperty() @IsString() @IsNotEmpty() name: string;
  @ApiProperty() @IsString() @IsNotEmpty() ntn: string;
  @ApiProperty() @IsString() @IsNotEmpty() address: string;
  @ApiProperty({ enum: MerchantCategory }) @IsEnum(MerchantCategory) category: MerchantCategory;
  @ApiProperty() @IsString() @IsNotEmpty() contact_number: string;
  @ApiPropertyOptional() @IsString() @IsOptional() currency?: string;
  @ApiPropertyOptional() @MinLength(0) @IsOptional() vat_rate?: number;
}

export class UpdateMerchantDto {
  @ApiPropertyOptional() @IsString() @IsOptional() name?: string;
  @ApiPropertyOptional() @IsString() @IsOptional() ntn?: string;
  @ApiPropertyOptional() @IsString() @IsOptional() address?: string;
  @ApiPropertyOptional({ enum: MerchantCategory }) @IsEnum(MerchantCategory) @IsOptional() category?: MerchantCategory;
  @ApiPropertyOptional() @IsString() @IsOptional() contact_number?: string;
  @ApiPropertyOptional() @IsString() @IsOptional() currency?: string;
}

export class BootstrapActorDto {
  @ApiProperty() @IsEmail() @IsNotEmpty() email: string;
  @ApiProperty() @IsString() @IsNotEmpty() full_name: string;
  @ApiProperty() @IsString() @MinLength(8) password: string;
  @ApiProperty({ enum: RoleType }) @IsEnum(RoleType) role: RoleType;
}

export class MerchantResponseDto {
  @ApiProperty() id: string;
  @ApiProperty() name: string;
  @ApiProperty() ntn: string;
  @ApiProperty() address: string;
  @ApiPropertyOptional() logo?: string;
  @ApiProperty({ enum: MerchantCategory }) category: MerchantCategory;
  @ApiProperty() contact_number: string;
  @ApiProperty() currency: string;
  @ApiProperty() created_at: Date;
  @ApiProperty() updated_at: Date;
}

export class ActorResponseDto {
  @ApiProperty() uid: string;
  @ApiProperty() merchant_id: string;
  @ApiProperty() email: string;
  @ApiProperty() full_name: string;
  @ApiProperty() is_active: boolean;
  @ApiProperty({ nullable: true }) last_login: Date | null;
}
