import { Client } from "pg";
import dotenv from "dotenv";

dotenv.config();

async function checkMigrations() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    await client.connect();
    console.log("Connected to database\n");

    // Check __drizzle_migrations table
    try {
      const result = await client.query(
        "SELECT * FROM __drizzle_migrations ORDER BY created_at"
      );
      console.log(
        `Migrations in __drizzle_migrations table: ${result.rows.length}`
      );
      result.rows.forEach((row) => {
        console.log(
          `  - ${row.hash} (created: ${new Date(
            Number(row.created_at)
          ).toISOString()})`
        );
      });
    } catch (error: any) {
      console.log("Error reading __drizzle_migrations:", error.message);
    }

    console.log("\n");

    // Check if audit_logs table exists
    const tablesResult = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name
    `);
    console.log(`\nTables in database: ${tablesResult.rows.length}`);
    tablesResult.rows.forEach((row) => {
      console.log(`  - ${row.table_name}`);
    });
  } catch (error) {
    console.error("Error:", error);
  } finally {
    await client.end();
  }
}

checkMigrations();
