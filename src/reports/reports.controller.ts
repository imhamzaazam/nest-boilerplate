import { Controller, Get, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { ReportsService } from './reports.service';
import {
  SalesReportQueryDto,
  SalesReportResponseDto,
  DashboardMetricsResponseDto,
  AnalyticsQueryDto,
  AnalyticsResponseDto,
  StoreBreakdownItemDto,
} from './dto/report.dto';
import { CurrentUser } from '@/auth/decorators/current-user.decorator';
import { AuthenticatedUser } from '@/auth/auth.service';

@ApiTags('Reports')
@Controller('merchant/reports')
@ApiBearerAuth()
export class ReportsController {
  constructor(private readonly service: ReportsService) {}

  @Get('sales')
  @ApiOperation({ summary: 'Get sales report' })
  getSalesReport(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: SalesReportQueryDto,
  ): Promise<SalesReportResponseDto> {
    return this.service.getSalesReport(user.merchantId, query);
  }

  @Get('dashboard')
  @ApiOperation({ summary: 'Get dashboard metrics' })
  getDashboardMetrics(
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<DashboardMetricsResponseDto> {
    return this.service.getDashboardMetrics(user.merchantId);
  }

  @Get('analytics')
  @ApiOperation({ summary: 'Get analytics data' })
  getAnalytics(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: AnalyticsQueryDto,
  ): Promise<AnalyticsResponseDto> {
    return this.service.getAnalytics(user.merchantId, query);
  }

  @Get('store-breakdown')
  @ApiOperation({ summary: 'Get store performance breakdown by branch' })
  getStoreBreakdown(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: AnalyticsQueryDto,
  ): Promise<StoreBreakdownItemDto[]> {
    return this.service.getStoreBreakdown(user.merchantId, query);
  }

  @Get('menu')
  @ApiOperation({ summary: 'Get menu metrics' })
  getMenuMetrics(
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<DashboardMetricsResponseDto> {
    return this.service.getMenuMetrics(user.merchantId);
  }
}
