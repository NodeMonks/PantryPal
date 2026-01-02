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

beforeAll(async () => {
  console.log(`🧪 Test DB Connection: ${connectionString.substring(0, 20)}...`);

  testDb = new Pool({
    connectionString,
  });

  await ensureOrganizationsColumns(testDb);
});

afterAll(async () => {
  await testDb.end();
});

export { testDb };
