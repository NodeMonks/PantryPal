import { Client } from "pg";
import dotenv from "dotenv";

dotenv.config();

async function checkTableStructure() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    await client.connect();

    const result = await client.query(`
      SELECT column_name, data_type, column_default
      FROM information_schema.columns 
      WHERE table_name = '__drizzle_migrations' 
      ORDER BY ordinal_position
    `);

    console.log("__drizzle_migrations table structure:");
    result.rows.forEach((row) => {
      console.log(
        `  ${row.column_name}: ${row.data_type}${
          row.column_default ? ` DEFAULT ${row.column_default}` : ""
        }`
      );
    });
  } finally {
    await client.end();
  }
}

checkTableStructure();
