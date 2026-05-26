import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/infra/config/prisma/prisma.service';
import { OrderStatus } from '@prisma/client';
import { SalesReportQueryDto, SalesReportResponseDto } from './dto/report.dto';

@Injectable()
export class ReportsService {
  constructor(private readonly prisma: PrismaService) {}

  async getSalesReport(merchantId: string, query: SalesReportQueryDto): Promise<SalesReportResponseDto> {
    const startDate = new Date(query.year, query.month - 1, 1);
    const endDate = new Date(query.year, query.month, 0, 23, 59, 59, 999);

    const orders = await this.prisma.order.findMany({
      where: {
        merchantId,
        createdAt: { gte: startDate, lte: endDate },
        status: { notIn: [OrderStatus.cancelled, OrderStatus.refunded] },
      },
      include: { items: true },
    });

    let totalSales = 0, totalDiscount = 0, totalTax = 0;
    for (const order of orders) {
      for (const item of order.items) {
        totalSales += item.lineTotal.toNumber();
        totalDiscount += item.discountAmount.toNumber();
        totalTax += item.taxAmount.toNumber();
      }
    }

    return {
      month: query.month,
      year: query.year,
      total_sales: Math.round(totalSales * 100) / 100,
      total_discount: Math.round(totalDiscount * 100) / 100,
      total_tax: Math.round(totalTax * 100) / 100,
      profit_estimate: Math.round((totalSales - totalDiscount - totalTax) * 100) / 100,
    };
  }
}
