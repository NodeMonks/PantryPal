import { db } from "../db.js";
import { sql } from "drizzle-orm";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function runOptimizations() {
  try {
    console.log("🚀 Starting multi-tenant performance optimizations...\n");

    // Drop onboarding_tokens table
    console.log("📦 Dropping onboarding_tokens table...");
    await db.execute(sql`DROP TABLE IF EXISTS onboarding_tokens CASCADE`);
    console.log("✅ onboarding_tokens table dropped\n");

    // Products indexes
    console.log("🔍 Creating indexes for products table...");
    await db.execute(
      sql`CREATE INDEX IF NOT EXISTS idx_products_org_store ON products(org_id, store_id)`
    );
    await db.execute(
      sql`CREATE INDEX IF NOT EXISTS idx_products_org ON products(org_id)`
    );
    await db.execute(
      sql`CREATE INDEX IF NOT EXISTS idx_products_barcode ON products(barcode) WHERE barcode IS NOT NULL`
    );
    await db.execute(
      sql`CREATE INDEX IF NOT EXISTS idx_products_qr_code ON products(qr_code) WHERE qr_code IS NOT NULL`
    );
    await db.execute(
      sql`CREATE INDEX IF NOT EXISTS idx_products_expiry ON products(expiry_date) WHERE expiry_date IS NOT NULL`
    );
    await db.execute(
      sql`CREATE INDEX IF NOT EXISTS idx_products_low_stock ON products(org_id, store_id, quantity_in_stock) WHERE quantity_in_stock <= min_stock_level`
    );
    console.log("✅ Products indexes created\n");

    // Customers indexes
    console.log("🔍 Creating indexes for customers table...");
    await db.execute(
      sql`CREATE INDEX IF NOT EXISTS idx_customers_org_store ON customers(org_id, store_id)`
    );
    await db.execute(
      sql`CREATE INDEX IF NOT EXISTS idx_customers_org ON customers(org_id)`
    );
    await db.execute(
      sql`CREATE INDEX IF NOT EXISTS idx_customers_phone ON customers(phone) WHERE phone IS NOT NULL`
    );
    await db.execute(
      sql`CREATE INDEX IF NOT EXISTS idx_customers_email ON customers(email) WHERE email IS NOT NULL`
    );
    console.log("✅ Customers indexes created\n");

    // Bills indexes
    console.log("🔍 Creating indexes for bills table...");
    await db.execute(
      sql`CREATE INDEX IF NOT EXISTS idx_bills_org_store ON bills(org_id, store_id)`
    );
    await db.execute(
      sql`CREATE INDEX IF NOT EXISTS idx_bills_org ON bills(org_id)`
    );
    await db.execute(
      sql`CREATE INDEX IF NOT EXISTS idx_bills_created ON bills(created_at DESC)`
    );
    await db.execute(
      sql`CREATE INDEX IF NOT EXISTS idx_bills_org_store_created ON bills(org_id, store_id, created_at DESC)`
    );
    await db.execute(
      sql`CREATE INDEX IF NOT EXISTS idx_bills_customer ON bills(customer_id) WHERE customer_id IS NOT NULL`
    );
    console.log("✅ Bills indexes created\n");

    // Inventory transactions indexes
    console.log("🔍 Creating indexes for inventory_transactions table...");
    await db.execute(
      sql`CREATE INDEX IF NOT EXISTS idx_inventory_org_store ON inventory_transactions(org_id, store_id)`
    );
    await db.execute(
      sql`CREATE INDEX IF NOT EXISTS idx_inventory_org ON inventory_transactions(org_id)`
    );
    await db.execute(
      sql`CREATE INDEX IF NOT EXISTS idx_inventory_product ON inventory_transactions(product_id)`
    );
    await db.execute(
      sql`CREATE INDEX IF NOT EXISTS idx_inventory_created ON inventory_transactions(created_at DESC)`
    );
    await db.execute(
      sql`CREATE INDEX IF NOT EXISTS idx_inventory_org_store_product ON inventory_transactions(org_id, store_id, product_id)`
    );
    console.log("✅ Inventory transactions indexes created\n");

    // User roles indexes
    console.log("🔍 Creating indexes for user_roles table...");
    await db.execute(
      sql`CREATE INDEX IF NOT EXISTS idx_user_roles_user ON user_roles(user_id)`
    );
    await db.execute(
      sql`CREATE INDEX IF NOT EXISTS idx_user_roles_org ON user_roles(org_id)`
    );
    await db.execute(
      sql`CREATE INDEX IF NOT EXISTS idx_user_roles_user_org ON user_roles(user_id, org_id)`
    );
    await db.execute(
      sql`CREATE INDEX IF NOT EXISTS idx_user_roles_store ON user_roles(store_id) WHERE store_id IS NOT NULL`
    );
    console.log("✅ User roles indexes created\n");

    // Users indexes
    console.log("🔍 Creating indexes for users table...");
    await db.execute(
      sql`CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)`
    );
    await db.execute(
      sql`CREATE INDEX IF NOT EXISTS idx_users_username ON users(username)`
    );
    await db.execute(
      sql`CREATE INDEX IF NOT EXISTS idx_users_active ON users(is_active) WHERE is_active = true`
    );
    console.log("✅ Users indexes created\n");

    // Sessions indexes
    console.log("🔍 Creating indexes for sessions table...");
    await db.execute(
      sql`CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id)`
    );
    await db.execute(
      sql`CREATE INDEX IF NOT EXISTS idx_sessions_org ON sessions(org_id) WHERE org_id IS NOT NULL`
    );
    await db.execute(
      sql`CREATE INDEX IF NOT EXISTS idx_sessions_expires ON sessions(expires_at)`
    );
    console.log("✅ Sessions indexes created\n");

    // Stores indexes
    console.log("🔍 Creating indexes for stores table...");
    await db.execute(
      sql`CREATE INDEX IF NOT EXISTS idx_stores_org ON stores(org_id)`
    );
    console.log("✅ Stores indexes created\n");

    // Role permissions indexes
    console.log("🔍 Creating indexes for role_permissions table...");
    await db.execute(
      sql`CREATE INDEX IF NOT EXISTS idx_role_permissions_role ON role_permissions(role_id)`
    );
    await db.execute(
      sql`CREATE INDEX IF NOT EXISTS idx_role_permissions_permission ON role_permissions(permission_id)`
    );
    console.log("✅ Role permissions indexes created\n");

    // Audit logs indexes
    console.log("🔍 Creating indexes for audit_logs table...");
    await db.execute(
      sql`CREATE INDEX IF NOT EXISTS idx_audit_logs_user ON audit_logs(user_id) WHERE user_id IS NOT NULL`
    );
    await db.execute(
      sql`CREATE INDEX IF NOT EXISTS idx_audit_logs_org ON audit_logs(org_id) WHERE org_id IS NOT NULL`
    );
    await db.execute(
      sql`CREATE INDEX IF NOT EXISTS idx_audit_logs_created ON audit_logs(created_at DESC)`
    );
    console.log("✅ Audit logs indexes created\n");

    // User invites indexes
    console.log("🔍 Creating indexes for user_invites table...");
    await db.execute(
      sql`CREATE INDEX IF NOT EXISTS idx_user_invites_org ON user_invites(org_id)`
    );
    await db.execute(
      sql`CREATE INDEX IF NOT EXISTS idx_user_invites_email ON user_invites(email)`
    );
    await db.execute(
      sql`CREATE INDEX IF NOT EXISTS idx_user_invites_expires ON user_invites(expires_at)`
    );
    console.log("✅ User invites indexes created\n");

    // Analyze tables
    console.log("📊 Analyzing tables for query planner...");
    await db.execute(sql`ANALYZE products`);
    await db.execute(sql`ANALYZE customers`);
    await db.execute(sql`ANALYZE bills`);
    await db.execute(sql`ANALYZE bill_items`);
    await db.execute(sql`ANALYZE inventory_transactions`);
    await db.execute(sql`ANALYZE user_roles`);
    await db.execute(sql`ANALYZE users`);
    await db.execute(sql`ANALYZE sessions`);
    await db.execute(sql`ANALYZE organizations`);
    await db.execute(sql`ANALYZE stores`);
    console.log("✅ Table analysis complete\n");

    console.log("🎉 Multi-tenant optimization complete!");
    console.log("\n📈 Performance improvements:");
    console.log(
      "   • Composite indexes on (org_id, store_id) for all tenant tables"
    );
    console.log("   • Individual org_id indexes for faster filtering");
    console.log("   • User role lookup optimized with user_id + org_id index");
    console.log("   • Bills queries optimized with date-based indexes");
    console.log("   • Session authentication improved with user_id index");
    console.log("   • Removed onboarding_tokens table (moved to microservice)");

    process.exit(0);
  } catch (error) {
    console.error("❌ Error running optimizations:", error);
    process.exit(1);
  }
}

runOptimizations();
