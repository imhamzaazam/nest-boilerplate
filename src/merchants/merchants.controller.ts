import { Controller, Get, Post, Patch, Body, Param, ParseUUIDPipe } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { RoleType } from '@prisma/client';
import { MerchantsService } from './merchants.service';
import {
  CreateMerchantDto,
  UpdateMerchantDto,
  MerchantResponseDto,
  BootstrapActorDto,
  ActorResponseDto,
} from './dto/merchant.dto';
import { Public } from '@/auth/decorators/public.decorator';
import { Roles } from '@/auth/decorators/roles.decorator';
import { CurrentUser } from '@/auth/decorators/current-user.decorator';
import { AuthenticatedUser } from '@/auth/auth.service';

@ApiTags('Merchants')
@Controller('merchants')
export class MerchantsController {
  constructor(private readonly service: MerchantsService) {}

  @Get()
  @ApiBearerAuth()
  @Roles(RoleType.admin)
  @ApiOperation({ summary: 'List all merchants (admin only)' })
  findAll(): Promise<MerchantResponseDto[]> {
    return this.service.findAll();
  }

  @Post()
  @Public()
  @ApiOperation({ summary: 'Create a new merchant' })
  create(@Body() dto: CreateMerchantDto): Promise<MerchantResponseDto> {
    return this.service.create(dto);
  }

  @Post(':merchant_id/bootstrap-actor')
  @Public()
  @ApiOperation({ summary: 'Create first actor for a merchant' })
  bootstrapActor(
    @Param('merchant_id', ParseUUIDPipe) id: string,
    @Body() dto: BootstrapActorDto,
  ): Promise<ActorResponseDto> {
    return this.service.bootstrapActor(id, dto);
  }
}

@ApiTags('Merchant')
@Controller('merchant')
@ApiBearerAuth()
export class MerchantController {
  constructor(private readonly service: MerchantsService) {}

  @Get()
  @ApiOperation({ summary: 'Get current merchant' })
  findOne(@CurrentUser() user: AuthenticatedUser): Promise<MerchantResponseDto> {
    return this.service.findOne(user.merchantId);
  }

  @Patch()
  @Roles(RoleType.admin, RoleType.merchant)
  @ApiOperation({ summary: 'Update current merchant' })
  update(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: UpdateMerchantDto,
  ): Promise<MerchantResponseDto> {
    return this.service.update(user.merchantId, dto);
  }
}
