import { Client } from "pg";
import dotenv from "dotenv";
import fs from "fs";
import path from "path";

dotenv.config();

async function debugMigrations() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    await client.connect();

    // Get migrations from database
    const dbMigrations = await client.query(
      "SELECT * FROM __drizzle_migrations ORDER BY id"
    );

    console.log("Database migrations:");
    dbMigrations.rows.forEach((row) => {
      console.log(`  ID: ${row.id}, Hash: "${row.hash}"`);
    });

    // Get journal entries
    const journalPath = path.join(process.cwd(), "drizzle", "meta", "_journal.json");
    const journal = JSON.parse(fs.readFileSync(journalPath, "utf8"));

    console.log("\nJournal entries:");
    journal.entries.forEach((entry: any) => {
      console.log(`  IDX: ${entry.idx}, Tag: "${entry.tag}"`);
    });

    console.log("\n\nComparing hashes:");
    journal.entries.forEach((entry: any, idx: number) => {
      const dbRow = dbMigrations.rows.find(r => r.hash === entry.tag);
      console.log(`${entry.tag}: ${dbRow ? '✓ Found' : '✗ Not found'}`);
    });
  } catch (error) {
    console.error("Error:", error);
  } finally {
    await client.end();
  }
}

debugMigrations();
