import { NestFactory } from '@nestjs/core';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { writeFileSync } from 'fs';
import { AppModule } from '../src/app.module';

async function generateSwagger() {
  const app = await NestFactory.create(AppModule, { logger: false });
  app.setGlobalPrefix('api/v1');

  const config = new DocumentBuilder()
    .setTitle('Go Delivery API')
    .setDescription('Tenant-aware delivery and commerce API with multi-merchant support')
    .setVersion('1.0')
    .setContact('API Support', '', 'support@godelivery.com')
    .addServer('http://localhost:3000', 'Development')
    .addServer('https://api.godelivery.com', 'Production')
    .addBearerAuth(
      { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
      'JWT',
    )
    .addTag('Authentication', 'Login and token management')
    .addTag('Merchants', 'Merchant registration and management')
    .addTag('Merchant', 'Current merchant operations')
    .addTag('Actors', 'User/actor management')
    .addTag('Branches', 'Branch management')
    .addTag('Categories', 'Product category management')
    .addTag('Products', 'Product and addon management')
    .addTag('Discounts', 'Discount management')
    .addTag('Inventory', 'Inventory tracking')
    .addTag('Cart', 'Shopping cart operations')
    .addTag('Orders', 'Order management')
    .addTag('Areas & Zones', 'Geographical area and zone management')
    .addTag('Service Zones', 'Merchant delivery zone management')
    .addTag('Reports', 'Sales and analytics reports')
    .build();

  const document = SwaggerModule.createDocument(app, config);

  writeFileSync('./swagger.json', JSON.stringify(document, null, 2));
  console.log('Swagger JSON generated: swagger.json');

  writeFileSync('./swagger.yaml', jsonToYaml(document));
  console.log('Swagger YAML generated: swagger.yaml');

  await app.close();
}

function jsonToYaml(obj: any, indent = 0): string {
  const spaces = '  '.repeat(indent);
  let yaml = '';

  for (const [key, value] of Object.entries(obj)) {
    if (value === null || value === undefined) {
      yaml += `${spaces}${key}: null\n`;
    } else if (Array.isArray(value)) {
      yaml += `${spaces}${key}:\n`;
      for (const item of value) {
        if (typeof item === 'object') {
          yaml += `${spaces}- \n${jsonToYaml(item, indent + 2).replace(/^/gm, '  ')}`;
        } else {
          yaml += `${spaces}- ${item}\n`;
        }
      }
    } else if (typeof value === 'object') {
      yaml += `${spaces}${key}:\n${jsonToYaml(value, indent + 1)}`;
    } else if (typeof value === 'string' && (value.includes('\n') || value.includes(':'))) {
      yaml += `${spaces}${key}: "${value.replace(/"/g, '\\"')}"\n`;
    } else {
      yaml += `${spaces}${key}: ${value}\n`;
    }
  }
  return yaml;
}

generateSwagger().catch(console.error);
