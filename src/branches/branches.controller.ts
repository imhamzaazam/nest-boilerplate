import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  ParseUUIDPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { RoleType } from '@prisma/client';
import { BranchesService } from './branches.service';
import {
  CreateBranchDto,
  BranchResponseDto,
  BranchAvailabilityDto,
  UpdateBranchDto,
} from './dto/branch.dto';
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

  @Get(':branch_id')
  @ApiOperation({ summary: 'Get branch by id' })
  findOne(
    @CurrentUser() user: AuthenticatedUser,
    @Param('branch_id', ParseUUIDPipe) id: string,
  ): Promise<BranchResponseDto> {
    return this.service.findOne(user.merchantId, id);
  }

  @Post()
  @Roles(RoleType.admin, RoleType.merchant)
  @ApiOperation({ summary: 'Create a new branch' })
  create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateBranchDto,
  ): Promise<BranchResponseDto> {
    return this.service.create(user.merchantId, dto);
  }

  @Patch(':branch_id')
  @Roles(RoleType.admin, RoleType.merchant)
  @ApiOperation({ summary: 'Update branch' })
  update(
    @CurrentUser() user: AuthenticatedUser,
    @Param('branch_id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateBranchDto,
  ): Promise<BranchResponseDto> {
    return this.service.update(user.merchantId, id, dto);
  }

  @Delete(':branch_id')
  @Roles(RoleType.admin, RoleType.merchant)
  @ApiOperation({ summary: 'Delete branch' })
  delete(
    @CurrentUser() user: AuthenticatedUser,
    @Param('branch_id', ParseUUIDPipe) id: string,
  ): Promise<void> {
    return this.service.delete(user.merchantId, id);
  }

  @Get(':branch_id/availability')
  @ApiOperation({ summary: 'Check branch availability' })
  checkAvailability(
    @CurrentUser() user: AuthenticatedUser,
    @Param('branch_id', ParseUUIDPipe) id: string,
  ): Promise<BranchAvailabilityDto> {
    return this.service.checkAvailability(user.merchantId, id);
  }
}
