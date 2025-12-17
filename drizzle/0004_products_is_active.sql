-- Add is_active flag to products for soft deletion / archival
ALTER TABLE "products" ADD COLUMN
IF NOT EXISTS "is_active" boolean NOT NULL DEFAULT true;

-- Helpful index for org + active filter
CREATE INDEX
IF NOT EXISTS "products_org_active_idx" ON "products"
("org_id", "is_active");
