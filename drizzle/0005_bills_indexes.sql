-- Index to support org-scoped, created_at keyset pagination
CREATE INDEX
IF NOT EXISTS "bills_org_created_idx" ON "bills"
("org_id","created_at" DESC,"id");
