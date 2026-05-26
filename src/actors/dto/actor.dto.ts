import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsEnum, IsNotEmpty, IsOptional, IsString, MinLength } from 'class-validator';
import { RoleType } from '@prisma/client';

export class CreateActorDto {
  @ApiProperty() @IsEmail() @IsNotEmpty() email: string;
  @ApiProperty() @IsString() @IsNotEmpty() full_name: string;
  @ApiPropertyOptional() @IsString() @IsOptional() @MinLength(8) password?: string;
  @ApiPropertyOptional({ enum: RoleType }) @IsEnum(RoleType) @IsOptional() role?: RoleType;
}

export class ActorResponseDto {
  @ApiProperty() uid: string;
  @ApiProperty() merchant_id: string;
  @ApiProperty() email: string;
  @ApiProperty() full_name: string;
  @ApiProperty() is_active: boolean;
  @ApiProperty({ nullable: true }) last_login: Date | null;
}
