import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '@/app.module';
import { PrismaService } from '@/infra/config/prisma/prisma.service';
import { GlobalExceptionFilter } from '@/infra/filters/http-exception.filter';

describe('Go Delivery API (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  // Test data holders
  let merchantId: string;
  let actorId: string;
  let accessToken: string;
  let branchId: string;
  let categoryId: string;
  let productId: string;
  let cartId: string;
  let discountId: string;

  const testEmail = `test-${Date.now()}@example.com`;
  const testPassword = 'TestPass123!';

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api/v1');
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        transform: true,
        forbidNonWhitelisted: true,
        transformOptions: { enableImplicitConversion: true },
      }),
    );
    app.useGlobalFilters(new GlobalExceptionFilter());

    prisma = app.get(PrismaService);
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('Authentication Flow', () => {
    it('POST /merchants - should create a merchant', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/merchants')
        .send({
          name: 'Test Restaurant',
          ntn: `NTN-${Date.now()}`,
          address: '123 Test Street',
          category: 'restaurant',
          contact_number: '+923001234567',
        })
        .expect(201);

      expect(res.body).toHaveProperty('id');
      expect(res.body.name).toBe('Test Restaurant');
      merchantId = res.body.id;
    });

    it('POST /merchants/:id/bootstrap-actor - should create first actor', async () => {
      const res = await request(app.getHttpServer())
        .post(`/api/v1/merchants/${merchantId}/bootstrap-actor`)
        .send({
          email: testEmail,
          full_name: 'Test Admin',
          password: testPassword,
          role: 'merchant',
        })
        .expect(201);

      expect(res.body).toHaveProperty('uid');
      expect(res.body.email).toBe(testEmail);
      actorId = res.body.uid;
    });

    it('POST /login - should authenticate and return tokens', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/login')
        .send({
          merchant_id: merchantId,
          email: testEmail,
          password: testPassword,
        })
        .expect(201);

      expect(res.body).toHaveProperty('access_token');
      expect(res.body).toHaveProperty('refresh_token');
      expect(res.body.uid).toBe(actorId);
      accessToken = res.body.access_token;
    });

    it('POST /login - should reject invalid credentials', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/login')
        .send({
          merchant_id: merchantId,
          email: testEmail,
          password: 'wrongpassword',
        })
        .expect(401);
    });

    it('POST /renew-token - should renew access token', async () => {
      const loginRes = await request(app.getHttpServer())
        .post('/api/v1/login')
        .send({
          merchant_id: merchantId,
          email: testEmail,
          password: testPassword,
        });

      const res = await request(app.getHttpServer())
        .post('/api/v1/renew-token')
        .send({ refresh_token: loginRes.body.refresh_token })
        .expect(201);

      expect(res.body).toHaveProperty('access_token');
    });
  });

  describe('Merchant & Actor Management', () => {
    it('GET /merchant - should get current merchant', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/merchant')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(res.body.id).toBe(merchantId);
    });

    it('GET /actors/me - should get current actor profile', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/actors/me')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(res.body.uid).toBe(actorId);
      expect(res.body.email).toBe(testEmail);
    });

    it('GET /merchant/actors - should list merchant actors', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/merchant/actors')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBeGreaterThan(0);
    });
  });

  describe('Branch Management', () => {
    it('POST /merchant/branches - should create a branch', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/merchant/branches')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          name: 'Main Branch',
          address: '456 Branch Ave',
          contact_number: '+923009876543',
          city: 'lahore',
          opening_time: '09:00',
          closing_time: '22:00',
        })
        .expect(201);

      expect(res.body).toHaveProperty('id');
      expect(res.body.name).toBe('Main Branch');
      branchId = res.body.id;
    });

    it('GET /merchant/branches - should list branches', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/merchant/branches')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.some((b: any) => b.id === branchId)).toBe(true);
    });

    it('GET /merchant/branches/:id/availability - should check availability', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/v1/merchant/branches/${branchId}/availability`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(res.body).toHaveProperty('is_open');
      expect(res.body.branch_id).toBe(branchId);
    });
  });

  describe('Product Catalog', () => {
    it('POST /merchant/categories - should create a category', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/merchant/categories')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          name: 'Burgers',
          description: 'Delicious burgers',
        })
        .expect(201);

      expect(res.body).toHaveProperty('id');
      expect(res.body.name).toBe('Burgers');
      categoryId = res.body.id;
    });

    it('GET /merchant/categories - should list categories', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/merchant/categories')
        .set('x-merchant-id', merchantId)
        .expect(200);

      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.some((c: any) => c.id === categoryId)).toBe(true);
    });

    it('POST /merchant/products - should create a product', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/merchant/products')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          category_id: categoryId,
          name: 'Classic Burger',
          description: 'Beef patty with lettuce and tomato',
          base_price: 599,
          track_inventory: true,
        })
        .expect(201);

      expect(res.body).toHaveProperty('id');
      expect(res.body.name).toBe('Classic Burger');
      expect(res.body.base_price).toBe(599);
      productId = res.body.id;
    });

    it('GET /merchant/products - should list products', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/merchant/products')
        .set('x-merchant-id', merchantId)
        .expect(200);

      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.some((p: any) => p.id === productId)).toBe(true);
    });

    it('GET /products/:id - should get product details', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/v1/products/${productId}`)
        .expect(200);

      expect(res.body.id).toBe(productId);
      expect(res.body.category_name).toBe('Burgers');
    });

    it('POST /products/:id/addons - should add an addon', async () => {
      const res = await request(app.getHttpServer())
        .post(`/api/v1/products/${productId}/addons`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          name: 'Extra Cheese',
          price: 50,
        })
        .expect(201);

      expect(res.body).toHaveProperty('id');
      expect(res.body.name).toBe('Extra Cheese');
    });
  });

  describe('Inventory Management', () => {
    it('POST /merchant/inventory - should set inventory', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/merchant/inventory')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          product_id: productId,
          branch_id: branchId,
          quantity: 100,
        })
        .expect(201);

      expect(res.body.quantity).toBe(100);
    });

    it('GET /merchant/inventory - should list inventory', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/merchant/inventory')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(Array.isArray(res.body)).toBe(true);
    });
  });

  describe('Cart & Order Flow', () => {
    it('POST /carts - should create a cart and return generated ID', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/carts')
        .send({
          merchant_id: merchantId,
          branch_id: branchId,
        })
        .expect(201);

      expect(res.body).toHaveProperty('id');
      expect(res.body.id).toMatch(/^[0-9a-f-]{36}$/); // UUID format
      cartId = res.body.id; // Frontend stores this in localStorage/cookie
    });

    it('POST /carts/:id/items - should add item to cart', async () => {
      const res = await request(app.getHttpServer())
        .post(`/api/v1/carts/${cartId}/items`)
        .send({
          product_id: productId,
          quantity: 2,
        })
        .expect(201);

      expect(res.body).toHaveProperty('item_id');
      expect(res.body.quantity).toBe(2);
    });

    it('GET /carts/:id - should get cart with pricing', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/v1/carts/${cartId}`)
        .expect(200);

      expect(res.body.cart_id).toBe(cartId);
      expect(res.body).toHaveProperty('subtotal');
      expect(res.body).toHaveProperty('total_price');
      expect(res.body.products.length).toBeGreaterThan(0);
    });

    it('POST /orders - should place an order', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/orders')
        .send({
          cart_id: cartId,
          payment_type: 'cash',
          delivery_address: '789 Delivery Lane',
          customer_name: 'John Doe',
          customer_phone: '+923001112222',
        })
        .expect(201);

      expect(res.body).toHaveProperty('order_id');
      expect(res.body).toHaveProperty('total');
      expect(res.body.line_items.length).toBeGreaterThan(0);
    });

    it('GET /merchant/orders - should list merchant orders', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/merchant/orders')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBeGreaterThan(0);
    });

    it('GET /carts/:id - should show cart as ordered', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/v1/carts/${cartId}`)
        .expect(200);

      expect(res.body.status).toBe('ordered');
    });

    it('POST /carts/:id/items - should reject adding items to ordered cart', async () => {
      const res = await request(app.getHttpServer())
        .post(`/api/v1/carts/${cartId}/items`)
        .send({
          product_id: productId,
          quantity: 1,
        })
        .expect(400);

      expect(res.body.errors).toContain('no longer active');
    });

    it('PATCH /carts/:id/items - should reject updating items in ordered cart', async () => {
      await request(app.getHttpServer())
        .patch(`/api/v1/carts/${cartId}/items/any-item-id`)
        .send({ quantity: 5 })
        .expect(400);
    });
  });

  describe('Discounts', () => {
    it('POST /merchant/discounts - should create a discount', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/merchant/discounts')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          type: 'percentage',
          value: 10,
          description: '10% off',
          product_id: productId,
        })
        .expect(201);

      expect(res.body).toHaveProperty('id');
      expect(res.body.value).toBe(10);
      expect(res.body.scope).toBe('product');
      expect(res.body.status).toBe('active');
      discountId = res.body.id;
    });

    it('GET /merchant/discounts - should list discounts', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/merchant/discounts')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBeGreaterThan(0);
      expect(res.body[0]).toHaveProperty('scope');
      expect(res.body[0]).toHaveProperty('status');
    });

    it('GET /merchant/discounts/:id - should get discount by id', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/v1/merchant/discounts/${discountId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(res.body.id).toBe(discountId);
      expect(res.body.description).toBe('10% off');
    });

    it('PATCH /merchant/discounts/:id - should update a discount', async () => {
      const res = await request(app.getHttpServer())
        .patch(`/api/v1/merchant/discounts/${discountId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ description: '15% off updated', value: 15 })
        .expect(200);

      expect(res.body.description).toBe('15% off updated');
      expect(res.body.value).toBe(15);
    });

    it('DELETE /merchant/discounts/:id - should delete a discount', async () => {
      await request(app.getHttpServer())
        .delete(`/api/v1/merchant/discounts/${discountId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      await request(app.getHttpServer())
        .get(`/api/v1/merchant/discounts/${discountId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(404);
    });
  });

  describe('Reports', () => {
    it('GET /merchant/reports/sales - should get sales report', async () => {
      const now = new Date();
      const res = await request(app.getHttpServer())
        .get('/api/v1/merchant/reports/sales')
        .query({ month: now.getMonth() + 1, year: now.getFullYear() })
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(res.body).toHaveProperty('total_sales');
      expect(res.body).toHaveProperty('total_discount');
      expect(res.body).toHaveProperty('total_tax');
    });
  });

  describe('Validation & Error Handling', () => {
    it('should return 400 for invalid request body', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/merchants')
        .send({
          name: '', // empty name
        })
        .expect(400);

      expect(res.body).toHaveProperty('code', 'VALIDATION_ERROR');
    });

    it('should return 401 for missing auth token', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/merchant')
        .expect(401);
    });

    it('should return 401 for invalid auth token', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/merchant')
        .set('Authorization', 'Bearer invalid-token')
        .expect(401);
    });

    it('should return 404 for non-existent resource', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/products/00000000-0000-0000-0000-000000000000')
        .expect(404);
    });
  });
});
