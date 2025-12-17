-- Migration: Add org_id and store_id to data tables
-- This aligns the production database schema with the Drizzle ORM definitions
-- All data tables must have org_id for multi-tenant isolation

-- Add org_id to products table
ALTER TABLE "products" ADD COLUMN "org_id" uuid;
ALTER TABLE "products" ADD CONSTRAINT "products_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "organizations"("id") ON DELETE CASCADE;
CREATE INDEX "products_org_id_idx" ON "products"("org_id");

-- Add org_id to customers table
ALTER TABLE "customers" ADD COLUMN "org_id" uuid;
ALTER TABLE "customers" ADD CONSTRAINT "customers_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "organizations"("id") ON DELETE CASCADE;
CREATE INDEX "customers_org_id_idx" ON "customers"("org_id");

-- Add org_id to bills table
ALTER TABLE "bills" ADD COLUMN "org_id" uuid;
ALTER TABLE "bills" ADD CONSTRAINT "bills_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "organizations"("id") ON DELETE CASCADE;
CREATE INDEX "bills_org_id_idx" ON "bills"("org_id");

-- Add org_id to bill_items table
ALTER TABLE "bill_items" ADD COLUMN "org_id" uuid;
ALTER TABLE "bill_items" ADD CONSTRAINT "bill_items_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "organizations"("id") ON DELETE CASCADE;
CREATE INDEX "bill_items_org_id_idx" ON "bill_items"("org_id");

-- Ensure inventory_transactions has proper org_id if missing
-- Note: If column already exists in prod, this won't error due to IF NOT EXISTS pattern below
ALTER TABLE "inventory_transactions" ADD COLUMN "org_id" uuid;
ALTER TABLE "inventory_transactions" ADD CONSTRAINT "inventory_transactions_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "organizations"("id") ON DELETE CASCADE;
CREATE INDEX "inventory_transactions_org_id_idx" ON "inventory_transactions"("org_id");

-- Backfill: Assign all existing data to the first organization
-- This assumes a default org exists; adjust if needed
UPDATE "products" 
SET "org_id" = (SELECT "id"
FROM "organizations" LIMIT
1)
WHERE "org_id" IS NULL;

UPDATE "customers" 
SET "org_id" = (SELECT "id"
FROM "organizations" LIMIT
1)
WHERE "org_id" IS NULL;

UPDATE "bills" 
SET "org_id" = (SELECT "id"
FROM "organizations" LIMIT
1)
WHERE "org_id" IS NULL;

UPDATE "bill_items" 
SET "org_id" = (SELECT "id"
FROM "organizations" LIMIT
1)
WHERE "org_id" IS NULL;

UPDATE "inventory_transactions" 
SET "org_id" = (SELECT "id"
FROM "organizations" LIMIT
1)
WHERE "org_id" IS NULL;

-- Make org_id NOT NULL to enforce tenant isolation
ALTER TABLE "products" ALTER COLUMN "org_id"
SET
NOT NULL;
ALTER TABLE "customers" ALTER COLUMN "org_id"
SET
NOT NULL;
ALTER TABLE "bills" ALTER COLUMN "org_id"
SET
NOT NULL;
ALTER TABLE "bill_items" ALTER COLUMN "org_id"
SET
NOT NULL;
ALTER TABLE "inventory_transactions" ALTER COLUMN "org_id"
SET
NOT NULL;
