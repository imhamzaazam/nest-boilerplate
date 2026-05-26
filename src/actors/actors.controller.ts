import { Controller, Get, Post, Body, Param, ParseUUIDPipe } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { RoleType } from '@prisma/client';
import { ActorsService } from './actors.service';
import { CreateActorDto, ActorResponseDto } from './dto/actor.dto';
import { CurrentUser } from '@/auth/decorators/current-user.decorator';
import { Roles } from '@/auth/decorators/roles.decorator';
import { AuthenticatedUser } from '@/auth/auth.service';

@ApiTags('Actors')
@Controller('actors')
@ApiBearerAuth()
export class ActorsController {
  constructor(private readonly service: ActorsService) {}

  @Get('me')
  @ApiOperation({ summary: 'Get current actor' })
  getMe(@CurrentUser() user: AuthenticatedUser): Promise<ActorResponseDto> {
    return this.service.findOne(user.id);
  }

  @Get(':uid')
  @ApiOperation({ summary: 'Get actor by UID' })
  findOne(@Param('uid', ParseUUIDPipe) uid: string): Promise<ActorResponseDto> {
    return this.service.findOne(uid);
  }

  @Post()
  @Roles(RoleType.admin, RoleType.merchant)
  @ApiOperation({ summary: 'Create a new actor' })
  create(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateActorDto): Promise<ActorResponseDto> {
    return this.service.create(user.merchantId, dto);
  }
}

@ApiTags('Merchant')
@Controller('merchant')
@ApiBearerAuth()
export class MerchantActorsController {
  constructor(private readonly service: ActorsService) {}

  @Get('actors')
  @ApiOperation({ summary: 'List all actors' })
  findAll(@CurrentUser() user: AuthenticatedUser): Promise<ActorResponseDto[]> {
    return this.service.findAllByMerchant(user.merchantId);
  }

  @Get('employees')
  @ApiOperation({ summary: 'List all employees' })
  findEmployees(@CurrentUser() user: AuthenticatedUser): Promise<ActorResponseDto[]> {
    return this.service.findEmployeesByMerchant(user.merchantId);
  }
}
