import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '@/infra/config/prisma/prisma.service';
import { CartStatus, OrderStatus, DiscountType, Prisma } from '@prisma/client';
import {
  CreateOrderDto,
  UpdateOrderDto,
  UpdateOrderStatusDto,
  OrderResponseDto,
  CreateOrderResponseDto,
  OrderStatusesResponseDto,
  ListOrdersResponseDto,
} from './dto/order.dto';
import { ListOrdersQueryDto } from './dto/list-orders-query.dto';
import { ORDER_STATUS_META, ORDER_STATUSES } from './order-statuses';
import { DEFAULT_CURRENCY } from '@/common/currency.util';

@Injectable()
export class OrdersService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateOrderDto): Promise<CreateOrderResponseDto> {
    const cart = await this.prisma.cart.findUnique({
      where: { id: dto.cart_id },
      include: {
        items: {
          include: { product: { include: { addons: true } }, discount: true },
        },
      },
    });
    if (!cart) throw new NotFoundException('Cart not found');
    if (cart.status !== CartStatus.active)
      throw new BadRequestException('Cart already ordered');
    if (cart.items.length === 0) throw new BadRequestException('Cart is empty');

    const merchant = await this.prisma.merchant.findUnique({
      where: { id: cart.merchantId },
      select: { currency: true },
    });
    const orderCurrency = merchant?.currency ?? DEFAULT_CURRENCY;

    const vatRule = await this.prisma.vatRule.findUnique({
      where: {
        merchantId_paymentType: {
          merchantId: cart.merchantId,
          paymentType: dto.payment_type,
        },
      },
    });
    const vatRate = vatRule?.rate.toNumber() ?? 0;

    let subtotal = 0,
      totalTax = 0;
    const lineItems: any[] = [];
    const orderItems: any[] = [];
    const orderAddons: any[] = [];

    for (const item of cart.items) {
      const basePrice = item.product.basePrice.toNumber();
      const baseAmount = basePrice * item.quantity;
      const addons = item.product.addons.filter((a) =>
        item.addonIds.includes(a.id),
      );
      const addonAmount = addons.reduce(
        (s, a) => s + a.price.toNumber() * item.quantity,
        0,
      );

      for (const a of addons) {
        orderAddons.push({
          productId: item.productId,
          addonId: a.id,
          addonName: a.name,
          addonPrice: a.price.toNumber(),
          quantity: item.quantity,
          lineAddonTotal: a.price.toNumber() * item.quantity,
        });
      }

      const itemSubtotal = baseAmount + addonAmount;
      let discountAmount = 0;
      if (item.discount) {
        discountAmount =
          item.discount.type === DiscountType.flat
            ? Math.min(item.discount.value.toNumber(), itemSubtotal)
            : (itemSubtotal * item.discount.value.toNumber()) / 100;
      }

      const afterDiscount = itemSubtotal - discountAmount;
      const taxAmount = (afterDiscount * vatRate) / 100;
      const lineTotal = afterDiscount + taxAmount;
      subtotal += afterDiscount;
      totalTax += taxAmount;

      orderItems.push({
        productId: item.productId,
        quantity: item.quantity,
        price: basePrice,
        baseAmount,
        addonAmount,
        discountAmount,
        taxAmount,
        lineTotal,
      });

      lineItems.push({
        product_id: item.productId,
        name: item.product.name,
        quantity: item.quantity,
        base_price: basePrice,
        base_amount: baseAmount,
        addon_amount: addonAmount,
        discount_amount: discountAmount,
        tax_amount: taxAmount,
        final_price: lineTotal / item.quantity,
        line_total: lineTotal,
        vat: taxAmount,
      });

      if (item.product.trackInventory) {
        await this.prisma.productInventory.update({
          where: {
            productId_branchId: {
              productId: item.productId,
              branchId: cart.branchId,
            },
          },
          data: { quantity: { decrement: item.quantity } },
        });
      }
    }

    const totalAmount = subtotal + totalTax;

    const order = await this.prisma.$transaction(async (tx) => {
      // Get zone if provided
      let zoneId: string | null = null;
      if (dto.zone_id && dto.delivery_address) {
        const zone = await tx.zone.findUnique({ where: { id: dto.zone_id } });
        if (zone) {
          zoneId = zone.id;
        }
      }

      const orderNumber = await this.getOrderNumber(tx);

      const newOrder = await tx.order.create({
        data: {
          cartId: cart.id,
          merchantId: cart.merchantId,
          branchId: cart.branchId,
          actorId: cart.actorId,
          zoneId,
          orderNumber: orderNumber,
          paymentType: dto.payment_type,
          vatRate: new Prisma.Decimal(vatRate),
          totalAmount: new Prisma.Decimal(totalAmount),
          currency: orderCurrency,
          deliveryAddress: dto.delivery_address,
          customerName: dto.customer_name,
          customerPhone: dto.customer_phone,
          status: OrderStatus.pending,
        },
      });

      for (const i of orderItems) {
        await tx.orderItem.create({
          data: {
            orderId: newOrder.id,
            productId: i.productId,
            quantity: i.quantity,
            price: new Prisma.Decimal(i.price),
            baseAmount: new Prisma.Decimal(i.baseAmount),
            addonAmount: new Prisma.Decimal(i.addonAmount),
            discountAmount: new Prisma.Decimal(i.discountAmount),
            taxAmount: new Prisma.Decimal(i.taxAmount),
            lineTotal: new Prisma.Decimal(i.lineTotal),
          },
        });
      }

      for (const a of orderAddons) {
        await tx.orderItemAddon.create({
          data: {
            orderId: newOrder.id,
            productId: a.productId,
            addonId: a.addonId,
            addonName: a.addonName,
            addonPrice: new Prisma.Decimal(a.addonPrice),
            quantity: a.quantity,
            lineAddonTotal: new Prisma.Decimal(a.lineAddonTotal),
          },
        });
      }

      await tx.cart.update({
        where: { id: cart.id },
        data: { status: CartStatus.ordered, orderedAt: new Date() },
      });
      return newOrder;
    });

    return {
      order_id: order.id,
      order_number: order.orderNumber,
      payment_method: dto.payment_type,
      line_items: lineItems,
      subtotal: Math.round(subtotal * 100) / 100,
      total_tax: Math.round(totalTax * 100) / 100,
      vat_rate: vatRate,
      total: Math.round(totalAmount * 100) / 100,
      currency: orderCurrency,
    };
  }

  getOrderStatuses(): OrderStatusesResponseDto {
    const statuses = ORDER_STATUSES.map((value) => {
      const meta = ORDER_STATUS_META[value];
      return {
        value,
        label: meta.label,
        description: meta.description,
        sort_order: meta.sort_order,
        is_terminal: meta.is_terminal,
      };
    }).sort((a, b) => a.sort_order - b.sort_order);

    return { statuses };
  }

  async findOne(id: string): Promise<OrderResponseDto> {
    const order = await this.prisma.order.findUnique({
      where: { id },
      include: this.orderDetailInclude,
    });
    if (!order) throw new NotFoundException('Order not found');
    return this.toResponseDetailed(order);
  }

  private readonly orderDetailInclude = {
    _count: { select: { items: true } },
    items: {
      include: {
        product: { include: { category: true } },
        addons: { include: { addon: true } },
        zone: true,
      },
    },
    merchant: true,
    branch: true,
    actor: true,
    zone: { include: { area: true } },
    cart: {
      include: {
        items: { include: { product: true, discount: true } },
      },
    },
  } satisfies Prisma.OrderInclude;

  async findAllByMerchant(merchantId: string): Promise<OrderResponseDto[]> {
    const orders = await this.prisma.order.findMany({
      where: { merchantId },
      include: { _count: { select: { items: true } } },
      orderBy: { createdAt: 'desc' },
    });
    return orders.map((o) => this.toResponse(o));
  }

  async updateStatus(
    id: string,
    dto: UpdateOrderStatusDto,
  ): Promise<OrderResponseDto> {
    const order = await this.prisma.order.findUnique({ where: { id } });
    if (!order) throw new NotFoundException('Order not found');
    const updated = await this.prisma.order.update({
      where: { id },
      data: { status: dto.status },
    });
    return this.toResponse(updated);
  }

  async update(id: string, dto: UpdateOrderDto): Promise<OrderResponseDto> {
    const order = await this.prisma.order.findUnique({ where: { id } });
    if (!order) throw new NotFoundException('Order not found');
    
    const updated = await this.prisma.order.update({
      where: { id },
      data: {
        ...(dto.delivery_address !== undefined && { deliveryAddress: dto.delivery_address }),
        ...(dto.customer_name !== undefined && { customerName: dto.customer_name }),
        ...(dto.customer_phone !== undefined && { customerPhone: dto.customer_phone }),
        ...(dto.status !== undefined && { status: dto.status }),
      },
    });
    return this.toResponse(updated);
  }

  async delete(id: string): Promise<void> {
    const order = await this.prisma.order.findUnique({ where: { id } });
    if (!order) throw new NotFoundException('Order not found');
    await this.prisma.order.delete({ where: { id } });
  }

  async findAll(
    merchantId: string,
    query: ListOrdersQueryDto = {},
  ): Promise<ListOrdersResponseDto> {
    const where = this.buildOrderWhere(merchantId, query);
    const limit = query.limit ?? 10;
    const skip =
      query.page != null ? (query.page - 1) * limit : (query.skip ?? 0);
    const include: Prisma.OrderInclude = {
      _count: { select: { items: true } },
    };
    if (query.items) {
      include.items = { include: { product: true, addons: true } };
    }

    const [orders, total] = await Promise.all([
      this.prisma.order.findMany({
        where,
        include,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.order.count({ where }),
    ]);

    return {
      items: orders.map((o) =>
        query.items ? this.toResponseWithItems(o) : this.toResponse(o),
      ),
      total,
      limit,
      skip,
      page: query.page,
    };
  }

  private buildOrderWhere(
    merchantId: string,
    query: ListOrdersQueryDto,
  ): Prisma.OrderWhereInput {
    const where: Prisma.OrderWhereInput = {};
    if (merchantId) {
      where.merchantId = merchantId;
    }

    if (query.status?.length) {
      where.status =
        query.status.length === 1
          ? query.status[0]
          : { in: query.status };
    }
    if (query.branch_id) where.branchId = query.branch_id;
    if (query.zone_id) where.zoneId = query.zone_id;
    if (query.actor_id) where.actorId = query.actor_id;
    if (query.payment_type) where.paymentType = query.payment_type;

    if (query.order_number) {
      where.orderNumber = {
        contains: query.order_number,
        mode: 'insensitive',
      };
    }
    if (query.customer_name) {
      where.customerName = {
        contains: query.customer_name,
        mode: 'insensitive',
      };
    }
    if (query.customer_phone) {
      where.customerPhone = { contains: query.customer_phone };
    }
    if (query.search) {
      where.OR = [
        {
          orderNumber: { contains: query.search, mode: 'insensitive' },
        },
        {
          customerName: { contains: query.search, mode: 'insensitive' },
        },
        { customerPhone: { contains: query.search } },
      ];
    }

    if (query.from_date || query.to_date) {
      where.createdAt = {};
      if (query.from_date) {
        where.createdAt.gte = new Date(query.from_date);
      }
      if (query.to_date) {
        where.createdAt.lte = new Date(query.to_date);
      }
    }

    if (query.min_total != null || query.max_total != null) {
      where.totalAmount = {};
      if (query.min_total != null) {
        where.totalAmount.gte = query.min_total;
      }
      if (query.max_total != null) {
        where.totalAmount.lte = query.max_total;
      }
    }

    return where;
  }

  private toResponseWithItems(o: any): OrderResponseDto {
    const response = this.toResponse(o);
    response.items = this.mapOrderItems(o.items);
    return response;
  }

  private toResponseDetailed(o: any): OrderResponseDto {
    const response = this.toResponse(o);
    response.items = this.mapOrderItems(o.items);
    if (o.merchant) response.merchant = this.mapMerchant(o.merchant);
    if (o.branch) response.branch = this.mapBranch(o.branch);
    if (o.actor) response.actor = this.mapActor(o.actor);
    if (o.zone) response.zone = this.mapZone(o.zone);
    if (o.cart) response.cart = this.mapCart(o.cart);
    return response;
  }

  private mapOrderItems(items: any[] | undefined) {
    return items?.map((i: any) => ({
      order_id: i.orderId,
      product_id: i.productId,
      zone_id: i.zoneId ?? undefined,
      quantity: i.quantity,
      price: this.toNumber(i.price),
      base_amount: this.toNumber(i.baseAmount),
      addon_amount: this.toNumber(i.addonAmount),
      discount_amount: this.toNumber(i.discountAmount),
      tax_amount: this.toNumber(i.taxAmount),
      line_total: this.toNumber(i.lineTotal),
      currency: i.currency,
      product: i.product ? this.mapProduct(i.product) : undefined,
      zone: i.zone ? this.mapZone(i.zone) : undefined,
      addons: i.addons?.map((a: any) => ({
        addon_id: a.addonId,
        addon_name: a.addonName,
        addon_price: this.toNumber(a.addonPrice),
        quantity: a.quantity,
        line_addon_total: this.toNumber(a.lineAddonTotal),
        addon: a.addon ? this.mapProductAddon(a.addon) : undefined,
      })),
    }));
  }

  private mapMerchant(m: any) {
    return {
      id: m.id,
      name: m.name,
      ntn: m.ntn,
      slug: m.slug,
      address: m.address,
      logo: m.logo,
      category: m.category,
      contact_number: m.contactNumber,
      currency: m.currency,
      vat_rate: this.toNumber(m.vatRate),
      created_at: m.createdAt,
      updated_at: m.updatedAt,
    };
  }

  private mapBranch(b: any) {
    return {
      id: b.id,
      merchant_id: b.merchantId,
      name: b.name,
      address: b.address,
      contact_number: b.contactNumber,
      city: b.city,
      opening_time: this.minutesToTime(b.openingTimeMinutes),
      closing_time: this.minutesToTime(b.closingTimeMinutes),
      is_24_hours: b.is24Hours,
      days: b.days,
      created_at: b.createdAt,
      updated_at: b.updatedAt,
    };
  }

  private mapActor(a: any) {
    return {
      uid: a.id,
      merchant_id: a.merchantId,
      email: a.email,
      full_name: `${a.firstName} ${a.lastName}`,
      is_active: a.isActive,
      last_login: a.lastLogin,
      created_at: a.createdAt,
      modified_at: a.modifiedAt,
    };
  }

  private mapZone(z: any) {
    return {
      id: z.id,
      area_id: z.areaId,
      name: z.name,
      coordinates_wkt: z.coordinatesWkt,
      created_at: z.createdAt,
      area: z.area
        ? { id: z.area.id, name: z.area.name, city: z.area.city }
        : undefined,
    };
  }

  private mapCart(c: any) {
    return {
      id: c.id,
      merchant_id: c.merchantId,
      branch_id: c.branchId,
      actor_id: c.actorId ?? undefined,
      status: c.status,
      ordered_at: c.orderedAt,
      created_at: c.createdAt,
      updated_at: c.updatedAt,
      items: c.items?.map((item: any) => ({
        id: item.id,
        cart_id: item.cartId,
        product_id: item.productId,
        quantity: item.quantity,
        addon_ids: item.addonIds,
        applied_discount_id: item.appliedDiscountId ?? undefined,
        applied_discount_amount: item.appliedDiscountAmount
          ? this.toNumber(item.appliedDiscountAmount)
          : undefined,
        product: item.product ? this.mapProduct(item.product) : undefined,
        discount: item.discount
          ? {
              id: item.discount.id,
              description: item.discount.description,
              type: item.discount.type,
              value: this.toNumber(item.discount.value),
            }
          : undefined,
      })),
    };
  }

  private mapProduct(p: any) {
    return {
      id: p.id,
      merchant_id: p.merchantId,
      category_id: p.categoryId,
      category: p.category
        ? { id: p.category.id, name: p.category.name }
        : undefined,
      name: p.name,
      description: p.description,
      base_price: this.toNumber(p.basePrice),
      image_url: p.imageUrl,
      track_inventory: p.trackInventory,
      is_active: p.isActive,
      created_at: p.createdAt,
      updated_at: p.updatedAt,
    };
  }

  private mapProductAddon(a: any) {
    return {
      id: a.id,
      product_id: a.productId,
      name: a.name,
      price: this.toNumber(a.price),
      created_at: a.createdAt,
    };
  }

  private toNumber(value: any): number | undefined {
    if (value == null) return undefined;
    return typeof value === 'number' ? value : value.toNumber();
  }

  private minutesToTime(minutes: number): string {
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
  }

  private generateOrderNumber(): string {
    const date = new Date();
    const timestamp = date.getTime();
    return `ORD-${timestamp}-${Math.random().toString(36).substring(2, 9).toUpperCase()}`;
  }

  private async getOrderNumber(tx: any): Promise<string> {
    const existingCount = await tx.order.count();
    return this.generateOrderNumber();
  }

  private toResponse(o: any): OrderResponseDto {
    return {
      id: o.id,
      order_number: o.orderNumber,
      cart_id: o.cartId,
      merchant_id: o.merchantId,
      branch_id: o.branchId,
      actor_id: o.actorId,
      zone_id: o.zoneId,
      payment_type: o.paymentType,
      vat_rate: o.vatRate?.toNumber?.() ?? o.vatRate,
      total_amount: o.totalAmount?.toNumber?.() ?? o.totalAmount,
      currency: o.currency || 'PKR',
      status: o.status,
      delivery_address: o.deliveryAddress,
      customer_name: o.customerName,
      customer_phone: o.customerPhone,
      created_at: o.createdAt,
      updated_at: o.updatedAt,
      items_count: o._count?.items,
    };
  }
}
