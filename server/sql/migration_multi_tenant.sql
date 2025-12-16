-- Migration: Add multi-tenant columns to products, customers, bills, and inventory_transactions
-- Run this before deploying the new code

-- Add org_id and store_id to products table
ALTER TABLE products 
ADD COLUMN org_id uuid,
ADD COLUMN store_id uuid;

-- Make foreign key constraints
ALTER TABLE products 
ADD CONSTRAINT products_org_id_fkey 
  FOREIGN KEY (org_id) REFERENCES organizations(id) ON DELETE CASCADE
,
ADD CONSTRAINT products_store_id_fkey 
  FOREIGN KEY
(store_id) REFERENCES stores
(id) ON
DELETE CASCADE;

-- Remove unique constraints on barcode and qr_code (allow duplicates across stores)
ALTER TABLE products DROP CONSTRAINT IF EXISTS products_barcode_key;
ALTER TABLE products DROP CONSTRAINT IF EXISTS products_qr_code_key;

-- Add org_id and store_id to customers table
ALTER TABLE customers 
ADD COLUMN org_id uuid,
ADD COLUMN store_id uuid;

ALTER TABLE customers 
ADD CONSTRAINT customers_org_id_fkey 
  FOREIGN KEY (org_id) REFERENCES organizations(id) ON DELETE CASCADE
,
ADD CONSTRAINT customers_store_id_fkey 
  FOREIGN KEY
(store_id) REFERENCES stores
(id) ON
DELETE CASCADE;

-- Add org_id and store_id to bills table
ALTER TABLE bills 
ADD COLUMN org_id uuid,
ADD COLUMN store_id uuid;

ALTER TABLE bills 
ADD CONSTRAINT bills_org_id_fkey 
  FOREIGN KEY (org_id) REFERENCES organizations(id) ON DELETE CASCADE
,
ADD CONSTRAINT bills_store_id_fkey 
  FOREIGN KEY
(store_id) REFERENCES stores
(id) ON
DELETE CASCADE;

-- Add org_id and store_id to inventory_transactions table
ALTER TABLE inventory_transactions 
ADD COLUMN org_id uuid,
ADD COLUMN store_id uuid;

ALTER TABLE inventory_transactions 
ADD CONSTRAINT inventory_transactions_org_id_fkey 
  FOREIGN KEY (org_id) REFERENCES organizations(id) ON DELETE CASCADE
,
ADD CONSTRAINT inventory_transactions_store_id_fkey 
  FOREIGN KEY
(store_id) REFERENCES stores
(id) ON
DELETE CASCADE;

ALTER TABLE products ADD CONSTRAINT products_check_stock CHECK (quantity_in_stock >= 0);
ALTER TABLE products ADD CONSTRAINT products_check_price CHECK (mrp > 0 AND buying_cost > 0);
ALTER TABLE bills ADD CONSTRAINT bills_check_amount CHECK (total_amount >= 0);

-- Enforce uniqueness per org/store for identifiers
ALTER TABLE products
  ADD CONSTRAINT products_unique_barcode
    UNIQUE (org_id, store_id, barcode)
WHERE barcode IS NOT NULL;

ALTER TABLE customers
  ADD CONSTRAINT customers_unique_phone
    UNIQUE (org_id, store_id, phone)
WHERE phone IS NOT NULL;

-- Optional: If you have existing data, you'll need to populate these columns
-- Example for a single org/store setup:
-- UPDATE products SET org_id = (SELECT id FROM organizations LIMIT 1), store_id = (SELECT id FROM stores LIMIT 1);
-- UPDATE customers SET org_id = (SELECT id FROM organizations LIMIT 1), store_id = (SELECT id FROM stores LIMIT 1);
-- UPDATE bills SET org_id = (SELECT id FROM organizations LIMIT 1), store_id = (SELECT id FROM stores LIMIT 1);
-- UPDATE inventory_transactions SET org_id = (SELECT id FROM organizations LIMIT 1), store_id = (SELECT id FROM stores LIMIT 1);

-- After populating, make columns NOT NULL
-- ALTER TABLE products ALTER COLUMN org_id SET NOT NULL;
-- ALTER TABLE products ALTER COLUMN store_id SET NOT NULL;
-- ALTER TABLE customers ALTER COLUMN org_id SET NOT NULL;
-- ALTER TABLE customers ALTER COLUMN store_id SET NOT NULL;
-- ALTER TABLE bills ALTER COLUMN org_id SET NOT NULL;
-- ALTER TABLE bills ALTER COLUMN store_id SET NOT NULL;
-- ALTER TABLE inventory_transactions ALTER COLUMN org_id SET NOT NULL;
-- ALTER TABLE inventory_transactions ALTER COLUMN store_id SET NOT NULL;
