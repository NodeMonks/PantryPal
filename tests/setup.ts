import { beforeAll, afterAll } from 'vitest';
import { Pool } from 'pg';

// Test database setup
let testDb: Pool;

beforeAll(async () => {
  // Use separate test database
  testDb = new Pool({
    connectionString: process.env.TEST_DATABASE_URL || process.env.DATABASE_URL,
  });
});

afterAll(async () => {
  await testDb.end();
});

export { testDb };
