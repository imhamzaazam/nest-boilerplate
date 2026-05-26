# Go Delivery API

A tenant-aware delivery and commerce API with multi-merchant support built with NestJS, Prisma, and PostgreSQL with PostGIS.

## Features

- **Multi-tenant Architecture**: Row-level isolation via `merchant_id` on all tenant tables
- **JWT Authentication**: Access tokens with refresh token rotation
- **Role-based Access Control**: Admin, Merchant, Employee, and Customer roles
- **Product Management**: Categories, products, and addons with inventory tracking
- **Order Management**: Cart → Order flow with VAT and discount calculations
- **Geo Features**: PostGIS-based delivery zone management with point-in-polygon checks

## Tech Stack

- **Framework**: NestJS 10
- **ORM**: Prisma 5
- **Database**: PostgreSQL 16 with PostGIS
- **Authentication**: Passport JWT
- **Documentation**: Swagger/OpenAPI

## Prerequisites

- Node.js 20+
- Docker & Docker Compose
- PostgreSQL 16 with PostGIS (provided via Docker)

## Getting Started

### 1. Clone and Install

```bash
git clone <repository-url>
cd nest-boilerplate
npm install
```

### 2. Environment Setup

Copy the example environment file:

```bash
cp .env.example .env
```

Configure your environment variables:

```env
DATABASE_URL=postgresql://prisma:topsecret@localhost:5432/godelivery?schema=public
JWT_SECRET=your-super-secret-jwt-key-change-in-production
JWT_EXPIRATION=15m
REFRESH_TOKEN_EXPIRATION=30d
```

### 3. Start Database

```bash
docker-compose up -d postgres
```

### 4. Run Migrations

```bash
npx prisma migrate dev
```

### 5. Start Development Server

```bash
npm run start:dev
```

The API will be available at `http://localhost:3000/api/v1`

Swagger documentation: `http://localhost:3000/docs`

## Project Structure

```
src/
├── main.ts                 # Application entry point
├── app.module.ts           # Root module
├── infra/                  # Infrastructure layer
│   ├── config/             # Configuration modules
│   │   ├── app.config.ts
│   │   ├── config.module.ts
│   │   └── prisma/
│   └── filters/            # Exception filters
├── auth/                   # Authentication module
├── merchants/              # Merchants module
├── actors/                 # Actors (users) module
├── branches/               # Branches module
├── categories/             # Product categories module
├── products/               # Products and addons module
├── discounts/              # Discounts module
├── inventory/              # Inventory tracking module
├── cart/                   # Shopping cart module
├── orders/                 # Orders module
├── geo/                    # Areas and zones module
├── service-zones/          # Merchant service zones module
└── reports/                # Reports module
```

Each feature module follows a simple NestJS convention:

```
module/
├── module.module.ts        # NestJS module definition
├── module.controller.ts    # HTTP endpoints
├── module.service.ts       # Business logic + data access
└── dto/
    └── module.dto.ts       # Request/response DTOs
```

## API Endpoints

### Authentication
- `POST /api/v1/login` - Login
- `POST /api/v1/renew-token` - Refresh access token

### Merchants
- `GET /api/v1/merchants` - List all merchants (admin)
- `POST /api/v1/merchants` - Create merchant
- `POST /api/v1/merchants/:id/bootstrap-actor` - Create first actor
- `GET /api/v1/merchant` - Get current merchant
- `PATCH /api/v1/merchant` - Update current merchant

### Actors
- `GET /api/v1/actors/me` - Get current actor
- `GET /api/v1/actors/:uid` - Get actor by ID
- `POST /api/v1/actors` - Create actor
- `GET /api/v1/merchant/actors` - List merchant actors
- `GET /api/v1/merchant/employees` - List merchant employees

### Branches
- `GET /api/v1/merchant/branches` - List branches
- `POST /api/v1/merchant/branches` - Create branch
- `GET /api/v1/merchant/branches/:id/availability` - Check availability

### Products
- `GET /api/v1/merchant/categories` - List categories
- `POST /api/v1/merchant/categories` - Create category
- `PATCH /api/v1/merchant/categories/:id` - Update category
- `GET /api/v1/merchant/products` - List products
- `POST /api/v1/merchant/products` - Create product
- `GET /api/v1/products/:id` - Get product details
- `GET /api/v1/products/:id/addons` - List product addons
- `POST /api/v1/products/:id/addons` - Add addon

### Cart & Orders
- `POST /api/v1/carts` - Create cart
- `GET /api/v1/carts/:id` - Get cart with pricing
- `POST /api/v1/carts/:id/items` - Add item
- `PATCH /api/v1/carts/:id/items/:itemId` - Update item
- `DELETE /api/v1/carts/:id/items/:itemId` - Remove item
- `POST /api/v1/orders` - Place order
- `GET /api/v1/orders/:id` - Get order details
- `PATCH /api/v1/orders/:id` - Update order status
- `GET /api/v1/merchant/orders` - List merchant orders

### Geo & Service Zones
- `GET /api/v1/areas` - List areas
- `POST /api/v1/areas` - Create area
- `GET /api/v1/areas/:id/zones` - List zones in area
- `POST /api/v1/areas/:id/zones` - Create zone
- `GET /api/v1/merchant/service-zones` - List service zones
- `POST /api/v1/merchant/service-zones` - Assign zone to branch
- `POST /api/v1/merchant/service-zones/check` - Check delivery coverage

### Reports
- `GET /api/v1/merchant/reports/sales` - Get sales report

## Scripts

```bash
npm run start:dev     # Development with hot-reload
npm run start:prod    # Production mode
npm run build         # Build for production
npm run lint          # Lint code
npm run test          # Run tests
npm run prisma:generate  # Generate Prisma client
npm run prisma:migrate   # Run migrations
npm run prisma:studio    # Open Prisma Studio
```

## Docker

Build and run with Docker Compose:

```bash
docker-compose up --build
```

This starts:
- API on port 3000
- PostgreSQL with PostGIS on port 5432

## License

UNLICENSED
