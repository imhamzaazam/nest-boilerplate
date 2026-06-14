import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/infra/config/prisma/prisma.service';
import { OrderStatus } from '@prisma/client';
import {
  SalesReportQueryDto,
  SalesReportResponseDto,
  DashboardMetricsResponseDto,
  AnalyticsQueryDto,
  AnalyticsResponseDto,
  StoreBreakdownItemDto,
} from './dto/report.dto';

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

  async getDashboardMetrics(merchantId: string): Promise<DashboardMetricsResponseDto> {
    const now = new Date();
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const twoWeeksAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);

    const merchant = await this.prisma.merchant.findUnique({
      where: { id: merchantId },
      select: { currency: true },
    });
    const currency = merchant?.currency || 'PKR';

    const [currentWeekOrders, previousWeekOrders, activeDeliveries] = await Promise.all([
      this.prisma.order.findMany({
        where: {
          merchantId,
          createdAt: { gte: weekAgo },
          status: { notIn: [OrderStatus.cancelled, OrderStatus.refunded] },
        },
      }),
      this.prisma.order.findMany({
        where: {
          merchantId,
          createdAt: { gte: twoWeeksAgo, lt: weekAgo },
          status: { notIn: [OrderStatus.cancelled, OrderStatus.refunded] },
        },
      }),
      this.prisma.order.count({
        where: {
          merchantId,
          status: OrderStatus.out_for_delivery,
        },
      }),
    ]);

    const currentRevenue = currentWeekOrders.reduce((sum, o) => sum + o.totalAmount.toNumber(), 0);
    const previousRevenue = previousWeekOrders.reduce((sum, o) => sum + o.totalAmount.toNumber(), 0);
    const revenueChange = previousRevenue > 0
      ? ((currentRevenue - previousRevenue) / previousRevenue) * 100
      : 0;

    const orderChange = previousWeekOrders.length > 0
      ? ((currentWeekOrders.length - previousWeekOrders.length) / previousWeekOrders.length) * 100
      : 0;

    return {
      metrics: [
        {
          label: 'Total Revenue',
          value: this.formatCurrency(currentRevenue, currency),
          change: `${revenueChange >= 0 ? '+' : ''}${revenueChange.toFixed(1)}% vs last week`,
          trend: revenueChange >= 0 ? 'up' : 'down',
        },
        {
          label: 'Total Orders',
          value: currentWeekOrders.length.toString(),
          change: `${orderChange >= 0 ? '+' : ''}${orderChange.toFixed(1)}% vs last week`,
          trend: orderChange >= 0 ? 'up' : 'down',
        },
        {
          label: 'Active Deliveries',
          value: activeDeliveries.toString(),
          change: 'Real-time update',
          trend: 'neutral',
        },
      ],
      currency,
    };
  }

  async getMenuMetrics(merchantId: string): Promise<DashboardMetricsResponseDto> {
    const merchant = await this.prisma.merchant.findUnique({
      where: { id: merchantId },
      select: { currency: true },
    });
    const currency = merchant?.currency || 'PKR';

    const [total, active, soldOut, avgPriceResult] = await Promise.all([
      this.prisma.product.count({ where: { merchantId } }),
      this.prisma.product.count({ where: { merchantId, isActive: true } }),
      this.prisma.product.count({ where: { merchantId, isActive: false } }),
      this.prisma.product.aggregate({
        where: { merchantId },
        _avg: { basePrice: true },
      }),
    ]);

    const avgPrice = avgPriceResult._avg.basePrice?.toNumber() ?? 0;

    return {
      metrics: [
        {
          label: 'Total Items',
          value: total.toString(),
        },
        {
          label: 'Active',
          value: active.toString(),
          change: 'currently sellable',
          trend: 'up',
        },
        {
          label: 'Sold Out',
          value: soldOut.toString(),
          change: soldOut > 0 ? 'requires restock' : 'all items available',
          trend: soldOut > 0 ? 'down' : 'neutral',
        },
        {
          label: 'Avg. Price',
          value: total > 0 ? this.formatCurrency(avgPrice, currency) : this.formatCurrency(0, currency),
        },
      ],
      currency,
    };
  }

  async getStoreBreakdown(
    merchantId: string,
    query: AnalyticsQueryDto,
  ): Promise<StoreBreakdownItemDto[]> {
    const days = query.days || 30;
    const now = new Date();
    const startDate = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);

    const [orders, branches] = await Promise.all([
      this.prisma.order.findMany({
        where: {
          merchantId,
          createdAt: { gte: startDate },
          status: { notIn: [OrderStatus.cancelled, OrderStatus.refunded] },
        },
        include: { items: true },
      }),
      this.prisma.branch.findMany({
        where: { merchantId },
        select: { id: true, name: true, city: true, status: true },
      }),
    ]);

    return this.buildStoreBreakdown(branches, orders);
  }

  async getAnalytics(merchantId: string, query: AnalyticsQueryDto): Promise<AnalyticsResponseDto> {
    const days = query.days || 30;
    const now = new Date();
    const startDate = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
    const previousStartDate = new Date(startDate.getTime() - days * 24 * 60 * 60 * 1000);

    const merchant = await this.prisma.merchant.findUnique({
      where: { id: merchantId },
      select: { currency: true },
    });
    const currency = merchant?.currency || 'PKR';

    const [currentOrders, previousOrders, branches] = await Promise.all([
      this.prisma.order.findMany({
        where: {
          merchantId,
          createdAt: { gte: startDate },
          status: { notIn: [OrderStatus.cancelled, OrderStatus.refunded] },
        },
        include: { items: { include: { product: true } } },
      }),
      this.prisma.order.findMany({
        where: {
          merchantId,
          createdAt: { gte: previousStartDate, lt: startDate },
          status: { notIn: [OrderStatus.cancelled, OrderStatus.refunded] },
        },
      }),
      this.prisma.branch.findMany({
        where: { merchantId },
        select: { id: true, name: true, city: true, status: true },
      }),
    ]);

    const currentRevenue = currentOrders.reduce((sum, o) => sum + o.totalAmount.toNumber(), 0);
    const previousRevenue = previousOrders.reduce((sum, o) => sum + o.totalAmount.toNumber(), 0);
    const revenueChange = previousRevenue > 0
      ? ((currentRevenue - previousRevenue) / previousRevenue) * 100
      : 0;

    const avgOrderValue = currentOrders.length > 0 ? currentRevenue / currentOrders.length : 0;
    const prevAvgOrderValue = previousOrders.length > 0
      ? previousOrders.reduce((sum, o) => sum + o.totalAmount.toNumber(), 0) / previousOrders.length
      : 0;
    const avgChange = prevAvgOrderValue > 0
      ? ((avgOrderValue - prevAvgOrderValue) / prevAvgOrderValue) * 100
      : 0;

    const customerCount = new Set(currentOrders.map(o => o.customerPhone)).size;
    const prevCustomerCount = new Set(previousOrders.map(o => o.customerPhone)).size;
    const customerChange = prevCustomerCount > 0
      ? ((customerCount - prevCustomerCount) / prevCustomerCount) * 100
      : 0;

    const productSales = new Map<string, { name: string; count: number; revenue: number }>();
    for (const order of currentOrders) {
      for (const item of order.items) {
        const existing = productSales.get(item.productId) || {
          name: item.product.name,
          count: 0,
          revenue: 0,
        };
        existing.count += item.quantity;
        existing.revenue += item.lineTotal.toNumber();
        productSales.set(item.productId, existing);
      }
    }

    const topSelling = Array.from(productSales.entries())
      .sort((a, b) => b[1].count - a[1].count)
      .slice(0, 5)
      .map(([id, data]) => ({
        id,
        name: data.name,
        orders_count: data.count,
        revenue: Math.round(data.revenue * 100) / 100,
      }));

    const revenueTrend: { date: string; revenue: number; orders: number }[] = [];
    const dateMap = new Map<string, { revenue: number; orders: number }>();
    
    for (const order of currentOrders) {
      const dateStr = order.createdAt.toISOString().split('T')[0];
      const existing = dateMap.get(dateStr) || { revenue: 0, orders: 0 };
      existing.revenue += order.totalAmount.toNumber();
      existing.orders += 1;
      dateMap.set(dateStr, existing);
    }

    const sortedDates = Array.from(dateMap.keys()).sort();
    for (const date of sortedDates) {
      const data = dateMap.get(date)!;
      revenueTrend.push({
        date,
        revenue: Math.round(data.revenue * 100) / 100,
        orders: data.orders,
      });
    }

    const storeBreakdown = this.buildStoreBreakdown(branches, currentOrders);

    return {
      metrics: [
        {
          label: 'Total Revenue',
          value: this.formatCurrency(currentRevenue, currency),
          change: `${revenueChange >= 0 ? '+' : ''}${revenueChange.toFixed(1)}% vs last period`,
          trend: revenueChange >= 0 ? 'up' : 'down',
        },
        {
          label: 'Average Order Value',
          value: this.formatCurrency(avgOrderValue, currency),
          change: `${avgChange >= 0 ? '+' : ''}${avgChange.toFixed(1)}% vs last period`,
          trend: avgChange >= 0 ? 'up' : 'down',
        },
        {
          label: 'Total Customers',
          value: customerCount.toString(),
          change: `${customerChange >= 0 ? '+' : ''}${customerChange.toFixed(1)}% vs last period`,
          trend: customerChange >= 0 ? 'up' : 'down',
        },
      ],
      top_selling: topSelling,
      revenue_trend: revenueTrend,
      store_breakdown: storeBreakdown,
      currency,
    };
  }

  private buildStoreBreakdown(
    branches: { id: string; name: string; city: string; status: string }[],
    orders: {
      branchId: string;
      totalAmount: { toNumber: () => number };
      items: { discountAmount: { toNumber: () => number } }[];
    }[],
  ): StoreBreakdownItemDto[] {
    const branchStats = new Map<
      string,
      { orders: number; revenue: number; discountedOrders: number }
    >();

    for (const order of orders) {
      const stats = branchStats.get(order.branchId) ?? {
        orders: 0,
        revenue: 0,
        discountedOrders: 0,
      };
      stats.orders += 1;
      stats.revenue += order.totalAmount.toNumber();
      if (order.items.some((item) => item.discountAmount.toNumber() > 0)) {
        stats.discountedOrders += 1;
      }
      branchStats.set(order.branchId, stats);
    }

    const maxRevenue = Math.max(
      ...Array.from(branchStats.values()).map((stats) => stats.revenue),
      0,
    );

    return branches
      .map((branch) => {
        const stats = branchStats.get(branch.id) ?? {
          orders: 0,
          revenue: 0,
          discountedOrders: 0,
        };

        return {
          id: branch.id,
          name: branch.name,
          location: `${branch.name} · ${branch.city}`,
          city: branch.city,
          orders_count: stats.orders,
          revenue: stats.revenue,
          discounted_orders: stats.discountedOrders,
          branch_status: branch.status,
          performance_status: this.deriveBranchPerformanceStatus(
            stats.orders,
            stats.revenue,
            maxRevenue,
          ),
        };
      })
      .sort((a, b) => b.revenue - a.revenue);
  }

  private deriveBranchPerformanceStatus(
    ordersCount: number,
    revenue: number,
    maxRevenue: number,
  ): string {
    if (ordersCount === 0) return 'Inactive';
    if (maxRevenue <= 0) return 'Steady';
    const ratio = revenue / maxRevenue;
    if (ratio >= 0.75) return 'Optimal';
    if (ratio >= 0.4) return 'Steady';
    return 'Low';
  }

  private formatCurrency(amount: number, currency: string): string {
    const formatted = (amount / 100).toFixed(2);
    if (currency === 'PKR') {
      return `Rs ${formatted}`;
    }
    return `${currency} ${formatted}`;
  }
}
