/*
  Warnings:

  - A unique constraint covering the columns `[order_number]` on the table `orders` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `order_number` to the `orders` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "merchants" ADD COLUMN     "currency" TEXT NOT NULL DEFAULT 'PKR',
ADD COLUMN     "vat_rate" DECIMAL(5,2) NOT NULL DEFAULT 0.0;

-- AlterTable
ALTER TABLE "order_items" ADD COLUMN     "currency" TEXT NOT NULL DEFAULT 'PKR',
ADD COLUMN     "zone_id" TEXT;

-- AlterTable
ALTER TABLE "orders" ADD COLUMN     "currency" TEXT NOT NULL DEFAULT 'PKR',
ADD COLUMN     "order_number" TEXT,
ADD COLUMN     "zone_id" TEXT;

-- Backfill order_number for existing rows before enforcing NOT NULL.
UPDATE "orders"
SET "order_number" = 'ORD-' || REPLACE("id"::text, '-', '')
WHERE "order_number" IS NULL;

ALTER TABLE "orders" ALTER COLUMN "order_number" SET NOT NULL;

-- CreateIndex
CREATE INDEX "order_items_zone_id_idx" ON "order_items"("zone_id");

-- CreateIndex
CREATE UNIQUE INDEX "orders_order_number_key" ON "orders"("order_number");

-- CreateIndex
CREATE INDEX "orders_zone_id_idx" ON "orders"("zone_id");

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_zone_id_fkey" FOREIGN KEY ("zone_id") REFERENCES "zones"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_zone_id_fkey" FOREIGN KEY ("zone_id") REFERENCES "zones"("id") ON DELETE SET NULL ON UPDATE CASCADE;
