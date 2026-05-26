import { Controller, Post, Body, Req } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { Request } from 'express';
import { AuthService } from './auth.service';
import { LoginDto, LoginResponseDto } from './dto/login.dto';
import { RenewTokenDto, RenewTokenResponseDto } from './dto/renew-token.dto';
import { Public } from './decorators/public.decorator';

@ApiTags('Authentication')
@Controller()
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post('login')
  @ApiOperation({ summary: 'Login as an actor' })
  @ApiResponse({ status: 200, type: LoginResponseDto })
  async login(@Body() dto: LoginDto, @Req() req: Request): Promise<LoginResponseDto> {
    return this.authService.login(dto, req.headers['user-agent'], req.ip);
  }

  @Public()
  @Post('renew-token')
  @ApiOperation({ summary: 'Renew access token' })
  @ApiResponse({ status: 200, type: RenewTokenResponseDto })
  async renewToken(@Body() dto: RenewTokenDto): Promise<RenewTokenResponseDto> {
    return this.authService.renewToken(dto);
  }
}
