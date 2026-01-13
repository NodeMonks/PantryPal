import { Client } from "pg";
import dotenv from "dotenv";

dotenv.config();

async function cleanupMigrations() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    await client.connect();
    console.log("Connected to database\n");

    // Remove the manual migration entries that aren't in the journal
    const manualMigrations = [
      "0003_add_missing_org_store_ids",
      "0004_products_is_active",
    ];

    for (const hash of manualMigrations) {
      const result = await client.query(
        "DELETE FROM __drizzle_migrations WHERE hash = $1 RETURNING *",
        [hash]
      );
      if (result.rowCount > 0) {
        console.log(`✓ Removed manual migration: ${hash}`);
      }
    }

    console.log("\nRemaining migrations:");
    const remaining = await client.query(
      "SELECT hash FROM __drizzle_migrations ORDER BY id"
    );
    remaining.rows.forEach((row) => {
      console.log(`  - ${row.hash}`);
    });

    console.log("\n✅ Cleanup complete!");
  } catch (error) {
    console.error("Error:", error);
  } finally {
    await client.end();
  }
}

cleanupMigrations();
