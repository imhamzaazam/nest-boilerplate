import { Controller, Get, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { ReportsService } from './reports.service';
import { SalesReportQueryDto, SalesReportResponseDto } from './dto/report.dto';
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
}
