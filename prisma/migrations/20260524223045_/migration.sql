/*
  Warnings:

  - You are about to drop the `User` table. If the table is not empty, all the data it contains will be lost.

*/
-- CreateExtension
CREATE EXTENSION IF NOT EXISTS "postgis";

-- CreateEnum
CREATE TYPE "merchant_category" AS ENUM ('restaurant', 'pharma', 'bakery');

-- CreateEnum
CREATE TYPE "payment_type" AS ENUM ('card', 'cash');

-- CreateEnum
CREATE TYPE "discount_type" AS ENUM ('flat', 'percentage');

-- CreateEnum
CREATE TYPE "order_status_type" AS ENUM ('pending', 'accepted', 'out_for_delivery', 'delivered', 'refunded', 'cancelled');

-- CreateEnum
CREATE TYPE "role_type" AS ENUM ('admin', 'merchant', 'employee', 'customer');

-- CreateEnum
CREATE TYPE "city_type" AS ENUM ('Karachi', 'Lahore');

-- CreateEnum
CREATE TYPE "cart_status_type" AS ENUM ('active', 'ordered');

-- DropTable
DROP TABLE "User";

-- CreateTable
CREATE TABLE "merchants" (
    "id" TEXT NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "ntn" VARCHAR(50) NOT NULL,
    "slug" VARCHAR(255) NOT NULL,
    "address" TEXT NOT NULL,
    "logo" TEXT,
    "category" "merchant_category" NOT NULL,
    "contact_number" VARCHAR(20) NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "merchants_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "branches" (
    "id" TEXT NOT NULL,
    "merchant_id" TEXT NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "address" TEXT NOT NULL,
    "contact_number" VARCHAR(20) NOT NULL,
    "city" "city_type" NOT NULL,
    "opening_time_minutes" SMALLINT NOT NULL,
    "closing_time_minutes" SMALLINT NOT NULL,
    "is_24_hours" BOOLEAN NOT NULL DEFAULT false,
    "days" TEXT[] DEFAULT ARRAY['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY']::TEXT[],
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "branches_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "actors" (
    "id" TEXT NOT NULL,
    "merchant_id" TEXT NOT NULL,
    "email" VARCHAR(255) NOT NULL,
    "password_hash" TEXT NOT NULL,
    "first_name" VARCHAR(100) NOT NULL,
    "last_name" VARCHAR(100) NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "last_login" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "modified_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "actors_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "roles" (
    "id" TEXT NOT NULL,
    "merchant_id" TEXT NOT NULL,
    "role_type" "role_type" NOT NULL,
    "description" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "roles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "actor_roles" (
    "merchant_id" TEXT NOT NULL,
    "actor_id" TEXT NOT NULL,
    "role_id" TEXT NOT NULL,
    "assigned_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "actor_roles_pkey" PRIMARY KEY ("merchant_id","actor_id")
);

-- CreateTable
CREATE TABLE "sessions" (
    "id" TEXT NOT NULL,
    "merchant_id" TEXT NOT NULL,
    "actor_id" TEXT NOT NULL,
    "refresh_token" TEXT NOT NULL,
    "user_agent" VARCHAR(500),
    "client_ip" VARCHAR(50),
    "is_blocked" BOOLEAN NOT NULL DEFAULT false,
    "expires_at" TIMESTAMPTZ NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "product_categories" (
    "id" TEXT NOT NULL,
    "merchant_id" TEXT NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "description" TEXT,
    "is_available" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "product_categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "products" (
    "id" TEXT NOT NULL,
    "merchant_id" TEXT NOT NULL,
    "category_id" TEXT NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "description" TEXT,
    "base_price" DECIMAL(10,2) NOT NULL,
    "image_url" TEXT,
    "track_inventory" BOOLEAN NOT NULL DEFAULT false,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "products_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "product_addons" (
    "id" TEXT NOT NULL,
    "product_id" TEXT NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "price" DECIMAL(10,2) NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "product_addons_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "product_inventory" (
    "id" TEXT NOT NULL,
    "product_id" TEXT NOT NULL,
    "branch_id" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "product_inventory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "merchant_discounts" (
    "id" TEXT NOT NULL,
    "merchant_id" TEXT NOT NULL,
    "product_id" TEXT,
    "category_id" TEXT,
    "type" "discount_type" NOT NULL,
    "value" DECIMAL(10,2) NOT NULL,
    "description" TEXT,
    "valid_from" TIMESTAMPTZ,
    "valid_to" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "merchant_discounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vat_rules" (
    "id" TEXT NOT NULL,
    "merchant_id" TEXT NOT NULL,
    "payment_type" "payment_type" NOT NULL,
    "rate" DECIMAL(5,2) NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "vat_rules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "carts" (
    "id" TEXT NOT NULL,
    "merchant_id" TEXT NOT NULL,
    "branch_id" TEXT NOT NULL,
    "actor_id" TEXT,
    "status" "cart_status_type" NOT NULL DEFAULT 'active',
    "ordered_at" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "carts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cart_items" (
    "id" TEXT NOT NULL,
    "cart_id" TEXT NOT NULL,
    "product_id" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "addon_ids" TEXT[],
    "applied_discount_id" TEXT,
    "applied_discount_amount" DECIMAL(10,2),

    CONSTRAINT "cart_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "orders" (
    "id" TEXT NOT NULL,
    "cart_id" TEXT NOT NULL,
    "merchant_id" TEXT NOT NULL,
    "branch_id" TEXT NOT NULL,
    "actor_id" TEXT,
    "payment_type" "payment_type" NOT NULL,
    "vat_rate" DECIMAL(5,2) NOT NULL,
    "total_amount" DECIMAL(10,2) NOT NULL,
    "status" "order_status_type" NOT NULL DEFAULT 'pending',
    "delivery_address" TEXT NOT NULL,
    "customer_name" VARCHAR(255) NOT NULL,
    "customer_phone" VARCHAR(20) NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "orders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "order_items" (
    "order_id" TEXT NOT NULL,
    "product_id" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "price" DECIMAL(10,2) NOT NULL,
    "base_amount" DECIMAL(10,2) NOT NULL,
    "addon_amount" DECIMAL(10,2) NOT NULL,
    "discount_amount" DECIMAL(10,2) NOT NULL,
    "tax_amount" DECIMAL(10,2) NOT NULL,
    "line_total" DECIMAL(10,2) NOT NULL,

    CONSTRAINT "order_items_pkey" PRIMARY KEY ("order_id","product_id")
);

-- CreateTable
CREATE TABLE "order_item_addons" (
    "order_id" TEXT NOT NULL,
    "product_id" TEXT NOT NULL,
    "addon_id" TEXT NOT NULL,
    "addon_name" VARCHAR(255) NOT NULL,
    "addon_price" DECIMAL(10,2) NOT NULL,
    "quantity" INTEGER NOT NULL,
    "line_addon_total" DECIMAL(10,2) NOT NULL,

    CONSTRAINT "order_item_addons_pkey" PRIMARY KEY ("order_id","product_id","addon_id")
);

-- CreateTable
CREATE TABLE "areas" (
    "id" TEXT NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "city" "city_type" NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "areas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "zones" (
    "id" TEXT NOT NULL,
    "area_id" TEXT NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "coordinates" geometry(Polygon, 4326),
    "coordinates_wkt" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "zones_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "merchant_service_zones" (
    "id" TEXT NOT NULL,
    "merchant_id" TEXT NOT NULL,
    "zone_id" TEXT NOT NULL,
    "branch_id" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "merchant_service_zones_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "merchants_ntn_key" ON "merchants"("ntn");

-- CreateIndex
CREATE UNIQUE INDEX "merchants_slug_key" ON "merchants"("slug");

-- CreateIndex
CREATE INDEX "branches_merchant_id_idx" ON "branches"("merchant_id");

-- CreateIndex
CREATE INDEX "actors_merchant_id_idx" ON "actors"("merchant_id");

-- CreateIndex
CREATE UNIQUE INDEX "actors_merchant_id_email_key" ON "actors"("merchant_id", "email");

-- CreateIndex
CREATE INDEX "roles_merchant_id_idx" ON "roles"("merchant_id");

-- CreateIndex
CREATE UNIQUE INDEX "roles_merchant_id_role_type_key" ON "roles"("merchant_id", "role_type");

-- CreateIndex
CREATE INDEX "actor_roles_actor_id_idx" ON "actor_roles"("actor_id");

-- CreateIndex
CREATE INDEX "actor_roles_role_id_idx" ON "actor_roles"("role_id");

-- CreateIndex
CREATE UNIQUE INDEX "sessions_refresh_token_key" ON "sessions"("refresh_token");

-- CreateIndex
CREATE INDEX "sessions_merchant_id_idx" ON "sessions"("merchant_id");

-- CreateIndex
CREATE INDEX "sessions_actor_id_idx" ON "sessions"("actor_id");

-- CreateIndex
CREATE INDEX "product_categories_merchant_id_idx" ON "product_categories"("merchant_id");

-- CreateIndex
CREATE UNIQUE INDEX "product_categories_merchant_id_name_key" ON "product_categories"("merchant_id", "name");

-- CreateIndex
CREATE INDEX "products_merchant_id_idx" ON "products"("merchant_id");

-- CreateIndex
CREATE INDEX "products_category_id_idx" ON "products"("category_id");

-- CreateIndex
CREATE UNIQUE INDEX "products_merchant_id_category_id_name_key" ON "products"("merchant_id", "category_id", "name");

-- CreateIndex
CREATE INDEX "product_addons_product_id_idx" ON "product_addons"("product_id");

-- CreateIndex
CREATE UNIQUE INDEX "product_addons_product_id_name_key" ON "product_addons"("product_id", "name");

-- CreateIndex
CREATE INDEX "product_inventory_product_id_idx" ON "product_inventory"("product_id");

-- CreateIndex
CREATE INDEX "product_inventory_branch_id_idx" ON "product_inventory"("branch_id");

-- CreateIndex
CREATE UNIQUE INDEX "product_inventory_product_id_branch_id_key" ON "product_inventory"("product_id", "branch_id");

-- CreateIndex
CREATE INDEX "merchant_discounts_merchant_id_idx" ON "merchant_discounts"("merchant_id");

-- CreateIndex
CREATE INDEX "merchant_discounts_product_id_idx" ON "merchant_discounts"("product_id");

-- CreateIndex
CREATE INDEX "merchant_discounts_category_id_idx" ON "merchant_discounts"("category_id");

-- CreateIndex
CREATE INDEX "vat_rules_merchant_id_idx" ON "vat_rules"("merchant_id");

-- CreateIndex
CREATE UNIQUE INDEX "vat_rules_merchant_id_payment_type_key" ON "vat_rules"("merchant_id", "payment_type");

-- CreateIndex
CREATE INDEX "carts_merchant_id_idx" ON "carts"("merchant_id");

-- CreateIndex
CREATE INDEX "carts_branch_id_idx" ON "carts"("branch_id");

-- CreateIndex
CREATE INDEX "carts_actor_id_idx" ON "carts"("actor_id");

-- CreateIndex
CREATE INDEX "cart_items_cart_id_idx" ON "cart_items"("cart_id");

-- CreateIndex
CREATE INDEX "cart_items_product_id_idx" ON "cart_items"("product_id");

-- CreateIndex
CREATE UNIQUE INDEX "orders_cart_id_key" ON "orders"("cart_id");

-- CreateIndex
CREATE INDEX "orders_merchant_id_idx" ON "orders"("merchant_id");

-- CreateIndex
CREATE INDEX "orders_branch_id_idx" ON "orders"("branch_id");

-- CreateIndex
CREATE INDEX "orders_actor_id_idx" ON "orders"("actor_id");

-- CreateIndex
CREATE INDEX "orders_status_idx" ON "orders"("status");

-- CreateIndex
CREATE INDEX "orders_created_at_idx" ON "orders"("created_at");

-- CreateIndex
CREATE INDEX "order_items_order_id_idx" ON "order_items"("order_id");

-- CreateIndex
CREATE INDEX "order_items_product_id_idx" ON "order_items"("product_id");

-- CreateIndex
CREATE INDEX "order_item_addons_addon_id_idx" ON "order_item_addons"("addon_id");

-- CreateIndex
CREATE UNIQUE INDEX "areas_name_city_key" ON "areas"("name", "city");

-- CreateIndex
CREATE INDEX "zones_area_id_idx" ON "zones"("area_id");

-- CreateIndex
CREATE UNIQUE INDEX "zones_area_id_name_key" ON "zones"("area_id", "name");

-- CreateIndex
CREATE INDEX "merchant_service_zones_merchant_id_idx" ON "merchant_service_zones"("merchant_id");

-- CreateIndex
CREATE INDEX "merchant_service_zones_zone_id_idx" ON "merchant_service_zones"("zone_id");

-- CreateIndex
CREATE INDEX "merchant_service_zones_branch_id_idx" ON "merchant_service_zones"("branch_id");

-- CreateIndex
CREATE UNIQUE INDEX "merchant_service_zones_merchant_id_zone_id_key" ON "merchant_service_zones"("merchant_id", "zone_id");

-- AddForeignKey
ALTER TABLE "branches" ADD CONSTRAINT "branches_merchant_id_fkey" FOREIGN KEY ("merchant_id") REFERENCES "merchants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "actors" ADD CONSTRAINT "actors_merchant_id_fkey" FOREIGN KEY ("merchant_id") REFERENCES "merchants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "roles" ADD CONSTRAINT "roles_merchant_id_fkey" FOREIGN KEY ("merchant_id") REFERENCES "merchants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "actor_roles" ADD CONSTRAINT "actor_roles_actor_id_fkey" FOREIGN KEY ("actor_id") REFERENCES "actors"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "actor_roles" ADD CONSTRAINT "actor_roles_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "roles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_merchant_id_fkey" FOREIGN KEY ("merchant_id") REFERENCES "merchants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_actor_id_fkey" FOREIGN KEY ("actor_id") REFERENCES "actors"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_categories" ADD CONSTRAINT "product_categories_merchant_id_fkey" FOREIGN KEY ("merchant_id") REFERENCES "merchants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "products" ADD CONSTRAINT "products_merchant_id_fkey" FOREIGN KEY ("merchant_id") REFERENCES "merchants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "products" ADD CONSTRAINT "products_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "product_categories"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_addons" ADD CONSTRAINT "product_addons_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_inventory" ADD CONSTRAINT "product_inventory_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_inventory" ADD CONSTRAINT "product_inventory_branch_id_fkey" FOREIGN KEY ("branch_id") REFERENCES "branches"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "merchant_discounts" ADD CONSTRAINT "merchant_discounts_merchant_id_fkey" FOREIGN KEY ("merchant_id") REFERENCES "merchants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "merchant_discounts" ADD CONSTRAINT "merchant_discounts_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "merchant_discounts" ADD CONSTRAINT "merchant_discounts_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "product_categories"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vat_rules" ADD CONSTRAINT "vat_rules_merchant_id_fkey" FOREIGN KEY ("merchant_id") REFERENCES "merchants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "carts" ADD CONSTRAINT "carts_merchant_id_fkey" FOREIGN KEY ("merchant_id") REFERENCES "merchants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "carts" ADD CONSTRAINT "carts_branch_id_fkey" FOREIGN KEY ("branch_id") REFERENCES "branches"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "carts" ADD CONSTRAINT "carts_actor_id_fkey" FOREIGN KEY ("actor_id") REFERENCES "actors"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cart_items" ADD CONSTRAINT "cart_items_cart_id_fkey" FOREIGN KEY ("cart_id") REFERENCES "carts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cart_items" ADD CONSTRAINT "cart_items_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cart_items" ADD CONSTRAINT "cart_items_applied_discount_id_fkey" FOREIGN KEY ("applied_discount_id") REFERENCES "merchant_discounts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_cart_id_fkey" FOREIGN KEY ("cart_id") REFERENCES "carts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_merchant_id_fkey" FOREIGN KEY ("merchant_id") REFERENCES "merchants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_branch_id_fkey" FOREIGN KEY ("branch_id") REFERENCES "branches"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_actor_id_fkey" FOREIGN KEY ("actor_id") REFERENCES "actors"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_item_addons" ADD CONSTRAINT "order_item_addons_order_id_product_id_fkey" FOREIGN KEY ("order_id", "product_id") REFERENCES "order_items"("order_id", "product_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_item_addons" ADD CONSTRAINT "order_item_addons_addon_id_fkey" FOREIGN KEY ("addon_id") REFERENCES "product_addons"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "zones" ADD CONSTRAINT "zones_area_id_fkey" FOREIGN KEY ("area_id") REFERENCES "areas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "merchant_service_zones" ADD CONSTRAINT "merchant_service_zones_merchant_id_fkey" FOREIGN KEY ("merchant_id") REFERENCES "merchants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "merchant_service_zones" ADD CONSTRAINT "merchant_service_zones_zone_id_fkey" FOREIGN KEY ("zone_id") REFERENCES "zones"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "merchant_service_zones" ADD CONSTRAINT "merchant_service_zones_branch_id_fkey" FOREIGN KEY ("branch_id") REFERENCES "branches"("id") ON DELETE CASCADE ON UPDATE CASCADE;
