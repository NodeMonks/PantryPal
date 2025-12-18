-- Add org_id to bill_items with backfill and indexes
ALTER TABLE bill_items ADD COLUMN
IF NOT EXISTS org_id uuid;

-- Backfill org_id from parent bill
UPDATE bill_items bi
SET org_id
= b.org_id FROM bills b WHERE bi.bill_id = b.id AND bi.org_id IS NULL;

-- Enforce not null and FK
ALTER TABLE bill_items ALTER COLUMN org_id
SET
NOT NULL;

ALTER TABLE bill_items ADD CONSTRAINT
IF NOT EXISTS bill_items_org_fk FOREIGN KEY
(org_id) REFERENCES organizations
(id) ON
DELETE CASCADE;

-- Helpful indexes for tenancy + lookups
CREATE INDEX
IF NOT EXISTS bill_items_org_idx ON bill_items
(org_id);
CREATE INDEX
IF NOT EXISTS bill_items_org_bill_idx ON bill_items
(org_id, bill_id);
