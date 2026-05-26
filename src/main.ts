import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { GlobalExceptionFilter } from './infra/filters/http-exception.filter';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.setGlobalPrefix('api/v1');

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  app.useGlobalFilters(new GlobalExceptionFilter());

  app.enableCors();

  const config = new DocumentBuilder()
    .setTitle('Go Delivery API')
    .setDescription(`
## Overview
Tenant-aware delivery and commerce API with multi-merchant support.

## Authentication
Most endpoints require a Bearer JWT token. Get one via \`POST /api/v1/login\`.

Public endpoints (no auth required):
- \`POST /login\` - Login
- \`POST /renew-token\` - Refresh token
- \`POST /merchants\` - Register merchant
- \`GET /merchant/categories\` - List categories (with x-merchant-id header)
- \`GET /merchant/products\` - List products (with x-merchant-id header)
- \`GET /products/:id\` - Get product details
- Cart operations (\`/carts/*\`)
- \`POST /orders\` - Place order

## Multi-tenancy
Data is isolated per merchant. The \`merchant_id\` is extracted from the JWT token.
For public endpoints, pass \`x-merchant-id\` header.
    `)
    .setVersion('1.0')
    .setContact('API Support', '', 'support@godelivery.com')
    .addBearerAuth({ type: 'http', scheme: 'bearer', bearerFormat: 'JWT' }, 'JWT')
    .addGlobalParameters({ name: 'x-merchant-id', in: 'header', required: false, description: 'Merchant ID for public endpoints' })
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('docs', app, document);

  const PORT = process.env.PORT || 3000;
  await app.listen(PORT, () => {
    console.log(`Server started at port ${PORT}`);
    console.log(`Swagger docs available at http://localhost:${PORT}/docs`);
  });
}
bootstrap();
