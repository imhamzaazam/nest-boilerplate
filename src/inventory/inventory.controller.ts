import { Controller, Get, Post, Body } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { RoleType } from '@prisma/client';
import { InventoryService } from './inventory.service';
import { CreateInventoryDto, InventoryResponseDto, InventoryListDto } from './dto/inventory.dto';
import { CurrentUser } from '@/auth/decorators/current-user.decorator';
import { Roles } from '@/auth/decorators/roles.decorator';
import { AuthenticatedUser } from '@/auth/auth.service';

@ApiTags('Inventory')
@Controller('merchant/inventory')
@ApiBearerAuth()
export class InventoryController {
  constructor(private readonly service: InventoryService) {}

  @Get()
  @ApiOperation({ summary: 'List inventory' })
  findAll(@CurrentUser() user: AuthenticatedUser): Promise<InventoryListDto[]> {
    return this.service.findAllByMerchant(user.merchantId);
  }

  @Post()
  @Roles(RoleType.admin, RoleType.merchant, RoleType.employee)
  @ApiOperation({ summary: 'Create/update inventory' })
  upsert(@Body() dto: CreateInventoryDto): Promise<InventoryResponseDto> {
    return this.service.upsert(dto);
  }
}
