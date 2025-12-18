-- Add bill finalization flag and credit notes table

-- Add finalized_at column to bills
ALTER TABLE bills
ADD COLUMN
IF NOT EXISTS finalized_at TIMESTAMPTZ;

-- Optional: track who finalized (text to avoid FK bloat)
ALTER TABLE bills
ADD COLUMN
IF NOT EXISTS finalized_by TEXT;

-- Index to query finalized bills per org
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
    FROM pg_indexes
    WHERE schemaname = current_schema() AND indexname = 'bills_org_finalized_idx'
    ) THEN
    CREATE INDEX bills_org_finalized_idx ON bills (org_id, finalized_at);
END
IF;
END$$;

-- Credit notes table for adjustments without mutating finalized bills
DO $$
BEGIN
    CREATE TABLE
    IF NOT EXISTS credit_notes
    (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid
    (),
        org_id UUID NOT NULL REFERENCES organizations
    (id) ON
    DELETE CASCADE,
        bill_id UUID
    NOT NULL REFERENCES bills
    (id) ON
    DELETE CASCADE,
        amount NUMERIC(10,2)
    NOT NULL CHECK
    (amount > 0),
        reason TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW
    ()
    );
END$$;

-- Ensure helpful index for lookups
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
    FROM pg_indexes
    WHERE schemaname = current_schema() AND indexname = 'credit_notes_org_bill_idx'
    ) THEN
    CREATE INDEX credit_notes_org_bill_idx ON credit_notes (org_id, bill_id, created_at DESC);
END
IF;
END$$;
