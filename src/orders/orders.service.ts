import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '@/infra/config/prisma/prisma.service';
import { CartStatus, OrderStatus, DiscountType, Prisma } from '@prisma/client';
import { CreateOrderDto, UpdateOrderStatusDto, OrderResponseDto, CreateOrderResponseDto } from './dto/order.dto';

@Injectable()
export class OrdersService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateOrderDto): Promise<CreateOrderResponseDto> {
    const cart = await this.prisma.cart.findUnique({
      where: { id: dto.cart_id },
      include: { items: { include: { product: { include: { addons: true } }, discount: true } } },
    });
    if (!cart) throw new NotFoundException('Cart not found');
    if (cart.status !== CartStatus.active) throw new BadRequestException('Cart already ordered');
    if (cart.items.length === 0) throw new BadRequestException('Cart is empty');

    const vatRule = await this.prisma.vatRule.findUnique({
      where: { merchantId_paymentType: { merchantId: cart.merchantId, paymentType: dto.payment_type } },
    });
    const vatRate = vatRule?.rate.toNumber() ?? 0;

    let subtotal = 0, totalTax = 0;
    const lineItems: any[] = [];
    const orderItems: any[] = [];
    const orderAddons: any[] = [];

    for (const item of cart.items) {
      const basePrice = item.product.basePrice.toNumber();
      const baseAmount = basePrice * item.quantity;
      const addons = item.product.addons.filter((a) => item.addonIds.includes(a.id));
      const addonAmount = addons.reduce((s, a) => s + a.price.toNumber() * item.quantity, 0);

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
        discountAmount = item.discount.type === DiscountType.flat
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
          where: { productId_branchId: { productId: item.productId, branchId: cart.branchId } },
          data: { quantity: { decrement: item.quantity } },
        });
      }
    }

    const totalAmount = subtotal + totalTax;

    const order = await this.prisma.$transaction(async (tx) => {
      const newOrder = await tx.order.create({
        data: {
          cartId: cart.id,
          merchantId: cart.merchantId,
          branchId: cart.branchId,
          actorId: cart.actorId,
          paymentType: dto.payment_type,
          vatRate: new Prisma.Decimal(vatRate),
          totalAmount: new Prisma.Decimal(totalAmount),
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

      await tx.cart.update({ where: { id: cart.id }, data: { status: CartStatus.ordered, orderedAt: new Date() } });
      return newOrder;
    });

    return {
      order_id: order.id,
      payment_method: dto.payment_type,
      line_items: lineItems,
      subtotal: Math.round(subtotal * 100) / 100,
      total_tax: Math.round(totalTax * 100) / 100,
      vat_rate: vatRate,
      total: Math.round(totalAmount * 100) / 100,
    };
  }

  async findOne(id: string): Promise<OrderResponseDto> {
    const order = await this.prisma.order.findUnique({
      where: { id },
      include: { items: { include: { product: true, addons: true } } },
    });
    if (!order) throw new NotFoundException('Order not found');
    return this.toResponse(order);
  }

  async findAllByMerchant(merchantId: string): Promise<OrderResponseDto[]> {
    const orders = await this.prisma.order.findMany({
      where: { merchantId },
      orderBy: { createdAt: 'desc' },
    });
    return orders.map((o) => this.toResponse(o));
  }

  async updateStatus(id: string, dto: UpdateOrderStatusDto): Promise<OrderResponseDto> {
    const order = await this.prisma.order.findUnique({ where: { id } });
    if (!order) throw new NotFoundException('Order not found');
    const updated = await this.prisma.order.update({ where: { id }, data: { status: dto.status } });
    return this.toResponse(updated);
  }

  private toResponse(o: any): OrderResponseDto {
    return {
      id: o.id,
      cart_id: o.cartId,
      merchant_id: o.merchantId,
      branch_id: o.branchId,
      actor_id: o.actorId,
      payment_type: o.paymentType,
      vat_rate: o.vatRate?.toNumber?.() ?? o.vatRate,
      total_amount: o.totalAmount?.toNumber?.() ?? o.totalAmount,
      status: o.status,
      delivery_address: o.deliveryAddress,
      customer_name: o.customerName,
      customer_phone: o.customerPhone,
      created_at: o.createdAt,
      updated_at: o.updatedAt,
      items: o.items?.map((i: any) => ({
        order_id: i.orderId,
        product_id: i.productId,
        quantity: i.quantity,
        price: i.price?.toNumber?.() ?? i.price,
        base_amount: i.baseAmount?.toNumber?.() ?? i.baseAmount,
        addon_amount: i.addonAmount?.toNumber?.() ?? i.addonAmount,
        discount_amount: i.discountAmount?.toNumber?.() ?? i.discountAmount,
        tax_amount: i.taxAmount?.toNumber?.() ?? i.taxAmount,
        line_total: i.lineTotal?.toNumber?.() ?? i.lineTotal,
        product: i.product ? { id: i.product.id, name: i.product.name, base_price: i.product.basePrice?.toNumber?.() } : undefined,
        addons: i.addons?.map((a: any) => ({
          addon_id: a.addonId,
          addon_name: a.addonName,
          addon_price: a.addonPrice?.toNumber?.() ?? a.addonPrice,
          quantity: a.quantity,
          line_addon_total: a.lineAddonTotal?.toNumber?.() ?? a.lineAddonTotal,
        })),
      })),
    };
  }
}
