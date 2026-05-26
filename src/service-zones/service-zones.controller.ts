import { Controller, Get, Post, Body, Headers } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiHeader } from '@nestjs/swagger';
import { RoleType } from '@prisma/client';
import { ServiceZonesService } from './service-zones.service';
import { CreateServiceZoneDto, ServiceZoneResponseDto, CheckCoverageDto, CoverageCheckResponseDto } from './dto/service-zone.dto';
import { Public } from '@/auth/decorators/public.decorator';
import { CurrentUser } from '@/auth/decorators/current-user.decorator';
import { Roles } from '@/auth/decorators/roles.decorator';
import { AuthenticatedUser } from '@/auth/auth.service';

@ApiTags('Service Zones')
@Controller('merchant/service-zones')
export class ServiceZonesController {
  constructor(private readonly service: ServiceZonesService) {}

  @Get()
  @Public()
  @ApiHeader({ name: 'x-merchant-id', required: false })
  @ApiOperation({ summary: 'List service zones' })
  findAll(
    @CurrentUser() user: AuthenticatedUser | undefined,
    @Headers('x-merchant-id') headerMerchantId?: string,
  ): Promise<ServiceZoneResponseDto[]> {
    const merchantId = user?.merchantId || headerMerchantId;
    if (!merchantId) throw new Error('Merchant ID required');
    return this.service.findAllByMerchant(merchantId);
  }

  @Post()
  @ApiBearerAuth()
  @Roles(RoleType.admin, RoleType.merchant)
  @ApiOperation({ summary: 'Create service zone' })
  create(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateServiceZoneDto): Promise<ServiceZoneResponseDto> {
    return this.service.create(user.merchantId, dto);
  }

  @Post('check')
  @Public()
  @ApiHeader({ name: 'x-merchant-id', required: false })
  @ApiOperation({ summary: 'Check delivery coverage' })
  checkCoverage(
    @Body() dto: CheckCoverageDto,
    @CurrentUser() user: AuthenticatedUser | undefined,
    @Headers('x-merchant-id') headerMerchantId?: string,
  ): Promise<CoverageCheckResponseDto> {
    const merchantId = user?.merchantId || headerMerchantId;
    if (!merchantId) throw new Error('Merchant ID required');
    return this.service.checkCoverage(merchantId, dto);
  }
}
