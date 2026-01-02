import { beforeAll, afterAll } from "vitest";
import { Pool } from "pg";
import dotenv from "dotenv";

dotenv.config();

// Ensure the app DB client (server/db.ts) points at the test DB.
const connectionString =
  process.env.TEST_DATABASE_URL || process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error(
    "Missing TEST_DATABASE_URL or DATABASE_URL for running tests"
  );
}

// If a separate test DB URL is provided, force DATABASE_URL to it so
// any app code importing server/db.ts uses the test DB.
if (process.env.TEST_DATABASE_URL) {
  process.env.DATABASE_URL = connectionString;
}

// Test database setup
let testDb: Pool;

async function ensureOrganizationsColumns(pool: Pool) {
  // The unit tests call `.returning()` on `organizations`, which selects columns
  // based on `shared/schema.ts`. If a CI DB is slightly behind, we can safely
  // add missing columns without trying to replay the entire migration history.
  await pool.query(
    `ALTER TABLE organizations ADD COLUMN IF NOT EXISTS gst_number text;`
  );
  await pool.query(
    `ALTER TABLE organizations ADD COLUMN IF NOT EXISTS owner_name text;`
  );
  await pool.query(
    `ALTER TABLE organizations ADD COLUMN IF NOT EXISTS owner_phone text;`
  );
  await pool.query(
    `ALTER TABLE organizations ADD COLUMN IF NOT EXISTS owner_email text;`
  );
  await pool.query(
    `ALTER TABLE organizations ADD COLUMN IF NOT EXISTS msme_number text;`
  );
  await pool.query(
    `ALTER TABLE organizations ADD COLUMN IF NOT EXISTS business_address text;`
  );
  await pool.query(
    `ALTER TABLE organizations ADD COLUMN IF NOT EXISTS business_city text;`
  );
  await pool.query(
    `ALTER TABLE organizations ADD COLUMN IF NOT EXISTS business_state text;`
  );
  await pool.query(
    `ALTER TABLE organizations ADD COLUMN IF NOT EXISTS business_pin text;`
  );
  await pool.query(
    `ALTER TABLE organizations ADD COLUMN IF NOT EXISTS kyc_status text DEFAULT 'pending';`
  );
  await pool.query(
    `ALTER TABLE organizations ADD COLUMN IF NOT EXISTS verified_at timestamp;`
  );
  await pool.query(
    `ALTER TABLE organizations ADD COLUMN IF NOT EXISTS verified_by integer;`
  );
  await pool.query(
    `ALTER TABLE organizations ADD COLUMN IF NOT EXISTS verification_notes text;`
  );
  await pool.query(
    `ALTER TABLE organizations ADD COLUMN IF NOT EXISTS payment_status text DEFAULT 'pending';`
  );
  await pool.query(
    `ALTER TABLE organizations ADD COLUMN IF NOT EXISTS subscription_id text;`
  );
  await pool.query(
    `ALTER TABLE organizations ADD COLUMN IF NOT EXISTS plan_name text DEFAULT 'starter';`
  );
}

async function ensureProductsColumns(pool: Pool) {
  // Some CI DBs can lag behind the latest schema. Drizzle selects all columns
  // defined in `shared/schema.ts`, so missing columns break tests.
  await pool.query(
    `ALTER TABLE products ADD COLUMN IF NOT EXISTS qr_code_image text;`
  );

  // These are commonly added alongside qr_code_image in newer schemas.
  await pool.query(
    `ALTER TABLE products ADD COLUMN IF NOT EXISTS is_active boolean DEFAULT true;`
  );
  await pool.query(
    `ALTER TABLE products ADD COLUMN IF NOT EXISTS description text;`
  );
}

async function ensureBillsColumns(pool: Pool) {
  // Older schemas may not have finalization metadata yet.
  await pool.query(
    `ALTER TABLE bills ADD COLUMN IF NOT EXISTS finalized_at timestamp;`
  );
  await pool.query(
    `ALTER TABLE bills ADD COLUMN IF NOT EXISTS finalized_by text;`
  );

  // Common bill fields that appear in shared/schema.ts
  await pool.query(
    `ALTER TABLE bills ADD COLUMN IF NOT EXISTS discount_amount numeric(10, 2) DEFAULT '0';`
  );
  await pool.query(
    `ALTER TABLE bills ADD COLUMN IF NOT EXISTS tax_amount numeric(10, 2) DEFAULT '0';`
  );
  await pool.query(
    `ALTER TABLE bills ADD COLUMN IF NOT EXISTS payment_method text DEFAULT 'cash';`
  );
}

async function ensureCreditNotesTable(pool: Pool) {
  // Some CI databases may be missing the credit_notes table entirely.
  // Create the minimal shape expected by `shared/schema.ts`.
  await pool.query(
    `CREATE TABLE IF NOT EXISTS credit_notes (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      org_id uuid NOT NULL,
      bill_id uuid NOT NULL,
      amount numeric(10, 2) NOT NULL,
      reason text,
      created_at timestamp NOT NULL DEFAULT now()
    );`
  );

  // If the table exists but is missing newer columns (or was created without them), patch it.
  await pool.query(
    `ALTER TABLE credit_notes ADD COLUMN IF NOT EXISTS org_id uuid;`
  );
  await pool.query(
    `ALTER TABLE credit_notes ADD COLUMN IF NOT EXISTS bill_id uuid;`
  );
  await pool.query(
    `ALTER TABLE credit_notes ADD COLUMN IF NOT EXISTS amount numeric(10, 2);`
  );
  await pool.query(
    `ALTER TABLE credit_notes ADD COLUMN IF NOT EXISTS reason text;`
  );
  await pool.query(
    `ALTER TABLE credit_notes ADD COLUMN IF NOT EXISTS created_at timestamp;`
  );
}

beforeAll(async () => {
  console.log(`🧪 Test DB Connection: ${connectionString.substring(0, 20)}...`);

  testDb = new Pool({
    connectionString,
  });

  await ensureOrganizationsColumns(testDb);
  await ensureProductsColumns(testDb);
  await ensureBillsColumns(testDb);
  await ensureCreditNotesTable(testDb);
});

afterAll(async () => {
  await testDb.end();
});

export { testDb };
