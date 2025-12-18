import { db } from "../db.js";
import { sql } from "drizzle-orm";

async function main() {
  console.log("🔧 Applying critical performance indexes...");
  const statements = [
    sql`CREATE INDEX IF NOT EXISTS idx_products_org_id_barcode ON products(org_id, barcode);`,
    sql`CREATE INDEX IF NOT EXISTS idx_bills_org_id_created_at ON bills(org_id, created_at DESC);`,
    sql`CREATE INDEX IF NOT EXISTS idx_bill_items_bill_id ON bill_items(bill_id);`,
    sql`CREATE INDEX IF NOT EXISTS idx_customers_org_id_phone ON customers(org_id, phone);`,
    sql`CREATE INDEX IF NOT EXISTS idx_inventory_transactions_product_id ON inventory_transactions(product_id);`,
    sql`CREATE INDEX IF NOT EXISTS idx_inventory_transactions_org_id ON inventory_transactions(org_id);`,
  ];

  for (const stmt of statements) {
    try {
      await db.execute(stmt);
      console.log("✅ Index applied");
    } catch (err) {
      console.error("❌ Failed:", err);
      throw err;
    }
  }

  console.log("🎉 Critical indexes applied");
}

main().catch((err) => {
  console.error("❌ Error applying indexes", err);
  process.exit(1);
});
