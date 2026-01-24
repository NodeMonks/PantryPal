import { drizzle } from "drizzle-orm/node-postgres";
import { Client } from "pg";
import dotenv from "dotenv";
import fs from "fs";
import path from "path";

dotenv.config();

async function fixMigrations() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    await client.connect();
    console.log("Connected to database");

    // Create __drizzle_migrations table if it doesn't exist
    console.log("Ensuring __drizzle_migrations table exists...");
    await client.query(`
      CREATE TABLE IF NOT EXISTS "__drizzle_migrations" (
        id SERIAL PRIMARY KEY,
        hash text NOT NULL,
        created_at bigint
      );
    `);

    // Get all migration files
    const migrationsDir = path.join(process.cwd(), "drizzle");
    const files = fs
      .readdirSync(migrationsDir)
      .filter((f) => f.endsWith(".sql"))
      .sort();

    console.log(`Found ${files.length} migration files`);

    // Check what's already applied
    const applied = await client.query("SELECT hash FROM __drizzle_migrations");
    const appliedHashes = new Set(applied.rows.map((r) => r.hash));

    console.log(`${appliedHashes.size} migrations already marked as applied`);

    // Mark all as applied without running them
    for (const file of files) {
      const hash = file.replace(".sql", "");
      if (!appliedHashes.has(hash)) {
        await client.query(
          "INSERT INTO __drizzle_migrations (hash, created_at) VALUES ($1, $2)",
          [hash, Date.now()]
        );
        console.log(`✓ Marked ${file} as applied`);
      } else {
        console.log(`- ${file} already marked`);
      }
    }

    console.log("\n✅ All migrations marked as applied!");
  } catch (error) {
    console.error("Error:", error);
    throw error;
  } finally {
    await client.end();
  }
}

fixMigrations();
