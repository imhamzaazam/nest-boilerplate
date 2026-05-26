import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class RenewTokenDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  refresh_token: string;
}

export class RenewTokenResponseDto {
  @ApiProperty()
  access_token: string;

  @ApiProperty()
  access_token_expires_at: Date;
}
