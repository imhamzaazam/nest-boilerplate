import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsString, IsUUID } from 'class-validator';

export class LoginDto {
  @ApiProperty()
  @IsUUID()
  @IsNotEmpty()
  merchant_id: string;

  @ApiProperty()
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  password: string;
}

export class LoginResponseDto {
  @ApiProperty()
  uid: string;

  @ApiProperty()
  merchant_id: string;

  @ApiProperty()
  email: string;

  @ApiProperty()
  access_token: string;

  @ApiProperty()
  access_token_expires_at: Date;

  @ApiProperty()
  refresh_token: string;

  @ApiProperty()
  refresh_token_expires_at: Date;
}
