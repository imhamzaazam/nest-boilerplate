import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '@/infra/config/prisma/prisma.service';
import { CartStatus, PaymentType, DiscountType, Prisma } from '@prisma/client';
import {
  CreateCartDto,
  AddCartItemDto,
  UpdateCartItemDto,
  CartResponseDto,
  CartItemResponseDto,
  CartCreatedDto,
} from './dto/cart.dto';

@Injectable()
export class CartService {
  constructor(private readonly prisma: PrismaService) {}

  private async getActiveCart(cartId: string) {
    const cart = await this.prisma.cart.findUnique({ where: { id: cartId } });
    if (!cart) throw new NotFoundException('Cart not found');
    if (cart.status !== CartStatus.active) {
      throw new BadRequestException('Cart is no longer active and cannot be modified');
    }
    return cart;
  }

  async create(dto: CreateCartDto, actorId?: string): Promise<CartCreatedDto> {
    const cart = await this.prisma.cart.create({
      data: {
        merchantId: dto.merchant_id,
        branchId: dto.branch_id,
        actorId,
        status: CartStatus.active,
      },
    });
    return { id: cart.id, branch_id: cart.branchId, created_at: cart.createdAt, updated_at: cart.updatedAt };
  }

  async findOne(cartId: string, paymentMethod: PaymentType = PaymentType.card): Promise<CartResponseDto> {
    const cart = await this.prisma.cart.findUnique({
      where: { id: cartId },
      include: {
        items: { include: { product: { include: { addons: true } }, discount: true } },
      },
    });
    if (!cart) throw new NotFoundException('Cart not found');

    const vatRule = await this.prisma.vatRule.findUnique({
      where: { merchantId_paymentType: { merchantId: cart.merchantId, paymentType: paymentMethod } },
    });
    const vatRate = vatRule?.rate.toNumber() ?? 0;

    let subtotal = 0, totalVat = 0;
    const products = cart.items.map((item) => {
      const basePrice = item.product.basePrice.toNumber();
      const addons = item.product.addons.filter((a) => item.addonIds.includes(a.id));
      const addonsTotal = addons.reduce((s, a) => s + a.price.toNumber(), 0);
      const itemSubtotal = (basePrice + addonsTotal) * item.quantity;

      let discount = 0;
      if (item.discount) {
        discount = item.discount.type === DiscountType.flat
          ? Math.min(item.discount.value.toNumber(), itemSubtotal)
          : (itemSubtotal * item.discount.value.toNumber()) / 100;
      }

      const afterDiscount = itemSubtotal - discount;
      const vat = (afterDiscount * vatRate) / 100;
      subtotal += afterDiscount;
      totalVat += vat;

      return {
        id: item.product.id,
        item_id: item.id,
        name: item.product.name,
        price: basePrice,
        final_price: (afterDiscount + vat) / item.quantity,
        quantity: item.quantity,
        total_price: afterDiscount + vat,
        vat,
        addons: addons.map((a) => ({ id: a.id, name: a.name, price: a.price.toNumber() })),
      };
    });

    return {
      cart_id: cart.id,
      status: cart.status,
      payment_method: paymentMethod,
      products,
      subtotal: Math.round(subtotal * 100) / 100,
      total_vat: Math.round(totalVat * 100) / 100,
      vat_rate: vatRate,
      total_price: Math.round((subtotal + totalVat) * 100) / 100,
    };
  }

  async addItem(cartId: string, dto: AddCartItemDto): Promise<CartItemResponseDto> {
    const cart = await this.getActiveCart(cartId);

    const product = await this.prisma.product.findUnique({ where: { id: dto.product_id } });
    if (!product?.isActive) throw new NotFoundException('Product not found');

    if (product.trackInventory) {
      const inv = await this.prisma.productInventory.findUnique({
        where: { productId_branchId: { productId: dto.product_id, branchId: cart.branchId } },
      });
      if (!inv || inv.quantity < dto.quantity) throw new BadRequestException('Insufficient inventory');
    }

    let discountAmount: number | undefined;
    if (dto.discount_id) {
      const d = await this.prisma.merchantDiscount.findUnique({ where: { id: dto.discount_id } });
      if (d) {
        const base = product.basePrice.toNumber() * dto.quantity;
        discountAmount = d.type === DiscountType.flat ? Math.min(d.value.toNumber(), base) : (base * d.value.toNumber()) / 100;
      }
    }

    const item = await this.prisma.cartItem.create({
      data: {
        cartId,
        productId: dto.product_id,
        quantity: dto.quantity,
        addonIds: dto.addon_ids ?? [],
        appliedDiscountId: dto.discount_id,
        appliedDiscountAmount: discountAmount ? new Prisma.Decimal(discountAmount) : null,
      },
    });
    return { item_id: item.id, product_id: item.productId, quantity: item.quantity };
  }

  async updateItem(cartId: string, itemId: string, dto: UpdateCartItemDto): Promise<CartItemResponseDto> {
    await this.getActiveCart(cartId);

    const item = await this.prisma.cartItem.findUnique({ where: { id: itemId } });
    if (!item || item.cartId !== cartId) throw new NotFoundException('Item not found');

    const updated = await this.prisma.cartItem.update({
      where: { id: itemId },
      data: { quantity: dto.quantity },
    });
    return { item_id: updated.id, product_id: updated.productId, quantity: updated.quantity };
  }

  async removeItem(cartId: string, itemId: string): Promise<void> {
    await this.getActiveCart(cartId);

    const item = await this.prisma.cartItem.findUnique({ where: { id: itemId } });
    if (!item || item.cartId !== cartId) throw new NotFoundException('Item not found');
    await this.prisma.cartItem.delete({ where: { id: itemId } });
  }
}
