// server/db.ts
import { drizzle } from "drizzle-orm/neon-http";
import { neon } from "@neondatabase/serverless";
import * as schema from "../shared/schema";
import dotenv from "dotenv";

dotenv.config();

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is not set in environment variables");
}

const SLOW_QUERY_THRESHOLD = parseInt(
  process.env.SLOW_QUERY_THRESHOLD_MS || "300",
  10
);
const DB_LOGGING = process.env.DB_LOGGING === "true";

// Wrap Neon client with query timing
const rawSql = neon(process.env.DATABASE_URL);
const sql: typeof rawSql = async (query, params, options) => {
  const start = Date.now();
  try {
    const result = await rawSql(query, params, options);
    const duration = Date.now() - start;

    if (DB_LOGGING && duration > SLOW_QUERY_THRESHOLD) {
      console.warn(
        `⚠️  SLOW QUERY (${duration}ms): ${query.substring(0, 100)}${
          query.length > 100 ? "..." : ""
        }`
      );
    } else if (DB_LOGGING && duration > 100) {
      console.log(`🐢 Query took ${duration}ms`);
    }

    return result;
  } catch (error) {
    const duration = Date.now() - start;
    console.error(
      `❌ Query failed after ${duration}ms: ${query.substring(0, 100)}`
    );
    throw error;
  }
};

// Create drizzle database instance
export const db = drizzle(sql, { schema });

console.log(
  `✅ Connected to Neon DB successfully (slow query threshold: ${SLOW_QUERY_THRESHOLD}ms)`
);
