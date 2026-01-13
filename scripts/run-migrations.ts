import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { Client } from "pg";
import dotenv from "dotenv";
import path from "path";

dotenv.config();

async function runMigrations() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    await client.connect();
    console.log("🔌 Connected to database");

    // First, let's check what migrations are already tracked
    const tracked = await client.query("SELECT * FROM __drizzle_migrations ORDER BY id");
    console.log(`\n📋 Currently tracked migrations: ${tracked.rows.length}`);
    tracked.rows.forEach(row => {
      console.log(`  - ${row.hash}`);
    });

    const db = drizzle(client);

    console.log("\n🚀 Running migrations...");
    await migrate(db, {
      migrationsFolder: path.join(process.cwd(), "drizzle"),
    });

    console.log("✅ Migrations completed successfully!");
  } catch (error) {
    console.error("❌ Migration failed:", error);
    process.exit(1);
  } finally {
    await client.end();
    console.log("🔌 Disconnected from database");
  }
}

runMigrations();
