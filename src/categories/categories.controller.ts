import { Controller, Get, Post, Patch, Body, Param, Headers, ParseUUIDPipe } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiHeader } from '@nestjs/swagger';
import { RoleType } from '@prisma/client';
import { CategoriesService } from './categories.service';
import { CreateCategoryDto, UpdateCategoryDto, CategoryResponseDto } from './dto/category.dto';
import { Public } from '@/auth/decorators/public.decorator';
import { Roles } from '@/auth/decorators/roles.decorator';
import { CurrentUser } from '@/auth/decorators/current-user.decorator';
import { AuthenticatedUser } from '@/auth/auth.service';

@ApiTags('Categories')
@Controller('merchant/categories')
export class CategoriesController {
  constructor(private readonly service: CategoriesService) {}

  @Get()
  @Public()
  @ApiHeader({ name: 'x-merchant-id', required: false })
  @ApiOperation({ summary: 'List all categories' })
  findAll(
    @CurrentUser() user: AuthenticatedUser | undefined,
    @Headers('x-merchant-id') headerMerchantId?: string,
  ): Promise<CategoryResponseDto[]> {
    const merchantId = user?.merchantId || headerMerchantId;
    if (!merchantId) throw new Error('Merchant ID required');
    return this.service.findAllByMerchant(merchantId);
  }

  @Post()
  @ApiBearerAuth()
  @Roles(RoleType.admin, RoleType.merchant)
  @ApiOperation({ summary: 'Create a category' })
  create(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateCategoryDto): Promise<CategoryResponseDto> {
    return this.service.create(user.merchantId, dto);
  }

  @Patch(':categoryID')
  @ApiBearerAuth()
  @Roles(RoleType.admin, RoleType.merchant)
  @ApiOperation({ summary: 'Update category' })
  update(@Param('categoryID', ParseUUIDPipe) id: string, @Body() dto: UpdateCategoryDto): Promise<CategoryResponseDto> {
    return this.service.update(id, dto);
  }
}
