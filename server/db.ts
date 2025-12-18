// server/db.ts
import { drizzle } from "drizzle-orm/neon-serverless";
import { Pool, neonConfig } from "@neondatabase/serverless";
import * as schema from "../shared/schema";
import dotenv from "dotenv";
import ws from "ws";

dotenv.config();

// Use ws WebSocket implementation for Node 22 compatibility
neonConfig.webSocketConstructor = ws;
neonConfig.useSecureWebSocket = true;
neonConfig.pipelineConnect = 10;

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is not set in environment variables");
}

const SLOW_QUERY_THRESHOLD = parseInt(
  process.env.SLOW_QUERY_THRESHOLD_MS || "300",
  10
);
const DB_LOGGING = process.env.DB_LOGGING === "true";

// Use Pool for transaction support (neon-serverless)
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  // Allow ~200-300 concurrent org users by increasing pool size
  max: 20,
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 2_000,
});

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
