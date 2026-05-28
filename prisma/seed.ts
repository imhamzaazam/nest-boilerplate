import {
  PrismaClient,
  RoleType,
  OrderStatus,
  PaymentType,
  CartStatus,
  Prisma,
} from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import * as bcrypt from 'bcryptjs';
import * as fs from 'fs';
import * as path from 'path';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

/** Prices are stored in minor units (paisa): 45000 = PKR 450.00 */
const PRICES = {
  friedRice: 45000,
  burger: 55000,
  fries: 25000,
} as const;

const VAT_RATE = 16;

const apiPublicBase = () =>
  process.env.API_PUBLIC_URL || `http://localhost:${process.env.PORT || 3000}`;

const productImageUrl = (filename: string) =>
  `${apiPublicBase()}/api/uploads/products/${filename}`;

async function flushDatabase() {
  console.log('Flushing database...');
  await prisma.orderItemAddon.deleteMany();
  await prisma.orderItem.deleteMany();
  await prisma.order.deleteMany();
  await prisma.cartItem.deleteMany();
  await prisma.cart.deleteMany();
  await prisma.productInventory.deleteMany();
  await prisma.productAddon.deleteMany();
  await prisma.merchantDiscount.deleteMany();
  await prisma.product.deleteMany();
  await prisma.productCategory.deleteMany();
  await prisma.vatRule.deleteMany();
  await prisma.session.deleteMany();
  await prisma.actorRole.deleteMany();
  await prisma.actor.deleteMany();
  await prisma.role.deleteMany();
  await prisma.merchantServiceZone.deleteMany();
  await prisma.branch.deleteMany();
  await prisma.merchant.deleteMany();
  await prisma.zone.deleteMany();
  await prisma.area.deleteMany();
  console.log('Database flushed.');
}

function calcLineTotals(unitPrice: number, quantity: number, vatRate: number) {
  const baseAmount = unitPrice * quantity;
  const taxAmount = (baseAmount * vatRate) / 100;
  const lineTotal = baseAmount + taxAmount;
  return {
    baseAmount,
    taxAmount,
    lineTotal,
    price: unitPrice,
  };
}

async function createSeededOrder(params: {
  merchantId: string;
  branchId: string;
  zoneId: string | null;
  orderNumber: string;
  customerName: string;
  customerPhone: string;
  deliveryAddress: string;
  status: OrderStatus;
  paymentType: PaymentType;
  items: { productId: string; unitPrice: number; quantity: number }[];
  createdAt?: Date;
}) {
  const vatRate = VAT_RATE;
  let subtotal = 0;
  let totalTax = 0;
  const lineRows: Array<{
    productId: string;
    quantity: number;
    price: number;
    baseAmount: number;
    addonAmount: number;
    discountAmount: number;
    taxAmount: number;
    lineTotal: number;
  }> = [];

  for (const item of params.items) {
    const line = calcLineTotals(item.unitPrice, item.quantity, vatRate);
    subtotal += line.baseAmount;
    totalTax += line.taxAmount;
    lineRows.push({
      productId: item.productId,
      quantity: item.quantity,
      price: line.price,
      baseAmount: line.baseAmount,
      addonAmount: 0,
      discountAmount: 0,
      taxAmount: line.taxAmount,
      lineTotal: line.lineTotal,
    });
  }

  const totalAmount = subtotal + totalTax;
  const createdAt = params.createdAt ?? new Date();

  const cart = await prisma.cart.create({
    data: {
      merchantId: params.merchantId,
      branchId: params.branchId,
      status: CartStatus.ordered,
      orderedAt: createdAt,
      createdAt,
      updatedAt: createdAt,
      items: {
        create: params.items.map((item) => ({
          productId: item.productId,
          quantity: item.quantity,
          addonIds: [],
        })),
      },
    },
  });

  const order = await prisma.order.create({
    data: {
      orderNumber: params.orderNumber,
      cartId: cart.id,
      merchantId: params.merchantId,
      branchId: params.branchId,
      zoneId: params.zoneId,
      paymentType: params.paymentType,
      vatRate: new Prisma.Decimal(vatRate),
      totalAmount: new Prisma.Decimal(totalAmount),
      currency: 'PKR',
      status: params.status,
      deliveryAddress: params.deliveryAddress,
      customerName: params.customerName,
      customerPhone: params.customerPhone,
      createdAt,
      updatedAt: createdAt,
      items: {
        create: lineRows.map((row) => ({
          productId: row.productId,
          quantity: row.quantity,
          price: new Prisma.Decimal(row.price),
          baseAmount: new Prisma.Decimal(row.baseAmount),
          addonAmount: new Prisma.Decimal(row.addonAmount),
          discountAmount: new Prisma.Decimal(row.discountAmount),
          taxAmount: new Prisma.Decimal(row.taxAmount),
          lineTotal: new Prisma.Decimal(row.lineTotal),
        })),
      },
    },
  });

  return order;
}

async function main() {
  await flushDatabase();
  console.log('Seeding database...');

  const merchant = await prisma.merchant.create({
    data: {
      name: 'Demo Restaurant',
      ntn: 'NTN12345',
      slug: 'demo-merchant',
      address: '12 Food Street, Clifton, Karachi',
      category: 'restaurant',
      contactNumber: '+922112345678',
      currency: 'PKR',
      vatRate: new Prisma.Decimal(VAT_RATE),
    },
  });

  const branchOperatingHours = [
    { day: 'MONDAY', open: true, opening_time: '09:00', closing_time: '22:00' },
    {
      day: 'TUESDAY',
      open: true,
      opening_time: '09:00',
      closing_time: '22:00',
    },
    {
      day: 'WEDNESDAY',
      open: true,
      opening_time: '09:00',
      closing_time: '22:00',
    },
    {
      day: 'THURSDAY',
      open: true,
      opening_time: '09:00',
      closing_time: '23:00',
    },
    { day: 'FRIDAY', open: true, opening_time: '09:00', closing_time: '23:00' },
    {
      day: 'SATURDAY',
      open: true,
      opening_time: '10:00',
      closing_time: '23:00',
    },
    {
      day: 'SUNDAY',
      open: false,
      opening_time: '09:00',
      closing_time: '22:00',
    },
  ];

  const branch = await prisma.branch.create({
    data: {
      merchantId: merchant.id,
      branchCode: 'BR-1001',
      name: 'Clifton Branch',
      address: '12 Food Street, Clifton, Karachi',
      contactName: 'Sarah Jenkins',
      contactEmail: 's.jenkins@demo.com',
      contactNumber: '+922112345678',
      city: 'Karachi',
      status: 'active',
      operatingHours: branchOperatingHours,
      openingTimeMinutes: 540,
      closingTimeMinutes: 1320,
      days: [
        'MONDAY',
        'TUESDAY',
        'WEDNESDAY',
        'THURSDAY',
        'FRIDAY',
        'SATURDAY',
      ],
    },
  });

  const passwordHash = await bcrypt.hash('password123', 10);

  const adminActor = await prisma.actor.create({
    data: {
      merchantId: merchant.id,
      email: 'admin@demo.com',
      passwordHash,
      firstName: 'Demo',
      lastName: 'Admin',
    },
  });

  const adminRole = await prisma.role.create({
    data: {
      merchantId: merchant.id,
      roleType: RoleType.admin,
      description: 'Administrator',
    },
  });

  await prisma.actorRole.create({
    data: {
      merchantId: merchant.id,
      actorId: adminActor.id,
      roleId: adminRole.id,
    },
  });

  const employeeActor = await prisma.actor.create({
    data: {
      merchantId: merchant.id,
      email: 'employee@demo.com',
      passwordHash,
      firstName: 'Demo',
      lastName: 'Employee',
    },
  });

  const employeeRole = await prisma.role.create({
    data: {
      merchantId: merchant.id,
      roleType: RoleType.employee,
      description: 'POS employee',
    },
  });

  await prisma.actorRole.create({
    data: {
      merchantId: merchant.id,
      actorId: employeeActor.id,
      roleId: employeeRole.id,
    },
  });

  await prisma.vatRule.create({
    data: {
      merchantId: merchant.id,
      paymentType: PaymentType.cash,
      rate: new Prisma.Decimal(VAT_RATE),
    },
  });

  await prisma.vatRule.create({
    data: {
      merchantId: merchant.id,
      paymentType: PaymentType.card,
      rate: new Prisma.Decimal(VAT_RATE),
    },
  });

  const area = await prisma.area.create({
    data: {
      name: 'Clifton',
      city: 'Karachi',
    },
  });

  const zone = await prisma.zone.create({
    data: {
      areaId: area.id,
      name: 'Clifton Block 5',
      coordinatesWkt:
        'POLYGON((67.0 24.0,67.1 24.0,67.1 24.1,67.0 24.1,67.0 24.0))',
    },
  });

  await prisma.merchantServiceZone.create({
    data: {
      merchantId: merchant.id,
      zoneId: zone.id,
      branchId: branch.id,
    },
  });

  const chineseCategory = await prisma.productCategory.create({
    data: {
      merchantId: merchant.id,
      name: 'Chinese',
      description: 'Chinese cuisine and rice dishes',
      isAvailable: true,
    },
  });

  const fastFoodCategory = await prisma.productCategory.create({
    data: {
      merchantId: merchant.id,
      name: 'Fast Food',
      description: 'Burgers, fries, and quick bites',
      isAvailable: true,
    },
  });

  const friedRice = await prisma.product.create({
    data: {
      merchantId: merchant.id,
      categoryId: chineseCategory.id,
      name: 'Fried Rice',
      description: 'Wok-fried jasmine rice with vegetables and soy sauce',
      basePrice: new Prisma.Decimal(PRICES.friedRice),
      imageUrl: productImageUrl('fried-rice.png'),
      trackInventory: false,
      isActive: true,
    },
  });

  const burger = await prisma.product.create({
    data: {
      merchantId: merchant.id,
      categoryId: fastFoodCategory.id,
      name: 'Classic Burger',
      description: 'Beef patty, cheddar, lettuce, tomato, and house sauce',
      basePrice: new Prisma.Decimal(PRICES.burger),
      imageUrl: productImageUrl('classic-burger.png'),
      trackInventory: false,
      isActive: true,
    },
  });

  await prisma.product.create({
    data: {
      merchantId: merchant.id,
      categoryId: fastFoodCategory.id,
      name: 'Crispy Fries',
      description: 'Golden fries with seasoned salt',
      basePrice: new Prisma.Decimal(PRICES.fries),
      imageUrl: productImageUrl('crispy-fries.png'),
      trackInventory: false,
      isActive: true,
    },
  });

  await prisma.merchant.update({
    where: { id: merchant.id },
    data: {
      featuredProductIds: [friedRice.id, burger.id],
    },
  });

  const hoursAgo = (h: number) => new Date(Date.now() - h * 60 * 60 * 1000);

  await createSeededOrder({
    merchantId: merchant.id,
    branchId: branch.id,
    zoneId: zone.id,
    orderNumber: 'ORD-1001',
    customerName: 'Ahmed Khan',
    customerPhone: '+923211234567',
    deliveryAddress: 'House 24, Street 7, Clifton Block 5, Karachi',
    status: OrderStatus.pending,
    paymentType: PaymentType.cash,
    items: [
      { productId: friedRice.id, unitPrice: PRICES.friedRice, quantity: 2 },
    ],
    createdAt: hoursAgo(1),
  });

  await createSeededOrder({
    merchantId: merchant.id,
    branchId: branch.id,
    zoneId: zone.id,
    orderNumber: 'ORD-1002',
    customerName: 'Sara Ali',
    customerPhone: '+923301987654',
    deliveryAddress: 'Apartment 3B, Ocean Towers, DHA Phase 5, Karachi',
    status: OrderStatus.accepted,
    paymentType: PaymentType.card,
    items: [{ productId: burger.id, unitPrice: PRICES.burger, quantity: 1 }],
    createdAt: hoursAgo(3),
  });

  await createSeededOrder({
    merchantId: merchant.id,
    branchId: branch.id,
    zoneId: zone.id,
    orderNumber: 'ORD-1003',
    customerName: 'Hassan Rizvi',
    customerPhone: '+923451112233',
    deliveryAddress: 'Shop 12, Zamzama Lane, Karachi',
    status: OrderStatus.out_for_delivery,
    paymentType: PaymentType.cash,
    items: [
      { productId: friedRice.id, unitPrice: PRICES.friedRice, quantity: 1 },
      { productId: burger.id, unitPrice: PRICES.burger, quantity: 1 },
    ],
    createdAt: hoursAgo(5),
  });

  await createSeededOrder({
    merchantId: merchant.id,
    branchId: branch.id,
    zoneId: zone.id,
    orderNumber: 'ORD-1004',
    customerName: 'Fatima Noor',
    customerPhone: '+923009876543',
    deliveryAddress: 'Plot 88, Khayaban-e-Shaheen, Karachi',
    status: OrderStatus.delivered,
    paymentType: PaymentType.card,
    items: [
      { productId: friedRice.id, unitPrice: PRICES.friedRice, quantity: 1 },
    ],
    createdAt: hoursAgo(24),
  });

  const e2eDir = path.resolve(__dirname, '../../e2e');
  fs.mkdirSync(e2eDir, { recursive: true });
  fs.writeFileSync(
    path.join(e2eDir, 'test-data.json'),
    JSON.stringify(
      {
        merchantId: merchant.id,
        branchId: branch.id,
        adminEmail: 'admin@demo.com',
        adminPassword: 'password123',
        employeeEmail: 'employee@demo.com',
        employeePassword: 'password123',
        categoryId: fastFoodCategory.id,
        categoryName: 'Fast Food',
        productId: burger.id,
        productName: 'Classic Burger',
        friedRiceProductId: friedRice.id,
        friedRiceProductName: 'Fried Rice',
        chineseCategoryId: chineseCategory.id,
        chineseCategoryName: 'Chinese',
      },
      null,
      2,
    ),
  );

  console.log('Seeding complete');
  console.log('');
  console.log('Catalog:');
  console.log('  Chinese  → Fried Rice (PKR 450.00)');
  console.log(
    '  Fast Food → Classic Burger (PKR 550.00), Crispy Fries (PKR 250.00)',
  );
  console.log('');
  console.log('Sample orders: ORD-1001 … ORD-1004');
  console.log('  ORD-1001  Ahmed Khan      +923211234567  (pending)');
  console.log('  ORD-1002  Sara Ali        +923301987654  (accepted)');
  console.log('  ORD-1003  Hassan Rizvi    +923451112233  (out for delivery)');
  console.log('  ORD-1004  Fatima Noor     +923009876543  (delivered)');
  console.log('');
  console.log('POS employee login: employee@demo.com / password123');
  console.log(
    `E2E test data written to ${path.join(e2eDir, 'test-data.json')}`,
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
