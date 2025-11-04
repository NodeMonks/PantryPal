// server/db.ts
import { drizzle } from "drizzle-orm/neon-http";
import { neon } from "@neondatabase/serverless";
import * as schema from "../shared/schema";
import dotenv from "dotenv";

dotenv.config();

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is not set in environment variables");
}

// Create Neon serverless client
const sql = neon(process.env.DATABASE_URL);

// Create drizzle database instance
export const db = drizzle(sql, { schema });

console.log("✅ Connected to Neon DB successfully");
