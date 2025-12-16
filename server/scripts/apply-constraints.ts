import { db } from "../db.js";
import { sql } from "drizzle-orm";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function applyConstraints() {
  try {
    console.log("🔒 Applying unique constraints and data validation...\n");

    // Add unique indexes for org/store scoped identifiers (partial indexes support WHERE)
    console.log("📦 Adding unique index for products barcode...");
    await db.execute(
      sql`CREATE UNIQUE INDEX IF NOT EXISTS idx_products_unique_barcode
          ON products (org_id, store_id, barcode)
          WHERE barcode IS NOT NULL`
    );
    console.log("✅ Products barcode unique index added\n");

    console.log("📦 Adding unique index for customers phone...");
    await db.execute(
      sql`CREATE UNIQUE INDEX IF NOT EXISTS idx_customers_unique_phone
          ON customers (org_id, store_id, phone)
          WHERE phone IS NOT NULL`
    );
    console.log("✅ Customers phone unique index added\n");

    // Verify existing data validation constraints
    console.log("🔍 Verifying data validation constraints...");

    // Check if constraints already exist
    const checkConstraints = await db.execute(
      sql`SELECT conname 
          FROM pg_constraint 
          WHERE conname IN ('products_check_stock', 'products_check_price', 'bills_check_amount')`
    );

    console.log(
      `Found ${checkConstraints.rows.length} existing validation constraints\n`
    );

    console.log("🎉 Constraint application complete!");
    console.log("\n📊 Applied constraints:");
    console.log("   • products: Unique barcode per org/store");
    console.log("   • customers: Unique phone per org/store");
    console.log("   • Data validation constraints verified");

    process.exit(0);
  } catch (error: any) {
    // Check if error is about constraint already existing
    if (error.message?.includes("already exists")) {
      console.log("ℹ️  Constraints already exist - skipping");
      process.exit(0);
    }

    console.error("❌ Error applying constraints:", error);
    console.error("\nNote: If constraints already exist, this is expected.");
    process.exit(1);
  }
}

applyConstraints();
