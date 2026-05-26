import { Controller, Get, Post, Body, Param, ParseUUIDPipe } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { RoleType } from '@prisma/client';
import { BranchesService } from './branches.service';
import { CreateBranchDto, BranchResponseDto, BranchAvailabilityDto } from './dto/branch.dto';
import { CurrentUser } from '@/auth/decorators/current-user.decorator';
import { Roles } from '@/auth/decorators/roles.decorator';
import { AuthenticatedUser } from '@/auth/auth.service';

@ApiTags('Branches')
@Controller('merchant/branches')
@ApiBearerAuth()
export class BranchesController {
  constructor(private readonly service: BranchesService) {}

  @Get()
  @ApiOperation({ summary: 'List all branches' })
  findAll(@CurrentUser() user: AuthenticatedUser): Promise<BranchResponseDto[]> {
    return this.service.findAllByMerchant(user.merchantId);
  }

  @Post()
  @Roles(RoleType.admin, RoleType.merchant)
  @ApiOperation({ summary: 'Create a new branch' })
  create(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateBranchDto): Promise<BranchResponseDto> {
    return this.service.create(user.merchantId, dto);
  }

  @Get(':branch_id/availability')
  @ApiOperation({ summary: 'Check branch availability' })
  checkAvailability(@Param('branch_id', ParseUUIDPipe) id: string): Promise<BranchAvailabilityDto> {
    return this.service.checkAvailability(id);
  }
}
