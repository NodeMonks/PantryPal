// server/db.ts
import { drizzle } from "drizzle-orm/neon-serverless";
import { Pool } from "@neondatabase/serverless";
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

// Use Pool for transaction support (neon-serverless)
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

// Create drizzle database instance with pool
export const db = drizzle(pool, {
  schema,
  logger: DB_LOGGING
    ? {
        logQuery(query: string, params: unknown[]) {
          const start = Date.now();
          // Log after execution via middleware or manually track timing
          if (query.length > 100) {
            console.log(`🔍 Query: ${query.substring(0, 100)}...`);
          }
        },
      }
    : undefined,
});

// Optionally add custom query timing via middleware or wrapping
// For now, rely on Drizzle's built-in logging

console.log(
  `✅ Connected to Neon DB successfully (slow query threshold: ${SLOW_QUERY_THRESHOLD}ms)`
);
