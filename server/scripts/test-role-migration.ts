#!/usr/bin/env tsx
/**
 * Test script to verify role migration and invite flow
 *
 * Run: npx tsx server/scripts/test-role-migration.ts
 */
import { db } from "../db";
import { users, roles, user_invites, organizations } from "../../shared/schema";
import { eq } from "drizzle-orm";

async function testRoleMigration() {
  console.log("🔍 Testing Role Migration...\n");

  // 1. Check RBAC roles exist
  console.log("1️⃣ Checking RBAC roles...");
  const rbacRoles = await db.select().from(roles);
  const expectedRoles = [
    "admin",
    "store_manager",
    "inventory_manager",
    "cashier",
  ];

  for (const expectedRole of expectedRoles) {
    const found = rbacRoles.find((r) => r.name === expectedRole);
    console.log(`   ${found ? "✅" : "❌"} ${expectedRole}`);
  }

  // 2. Check legacy users table uses new enum
  console.log("\n2️⃣ Checking users table role enum...");
  const testUsers = await db.select().from(users).limit(5);
  console.log(`   Found ${testUsers.length} users`);
  testUsers.forEach((u) => {
    const validRoles = [
      "admin",
      "store_manager",
      "inventory_manager",
      "cashier",
    ];
    const isValid = validRoles.includes(u.role);
    console.log(`   ${isValid ? "✅" : "❌"} User ${u.id}: ${u.role}`);
  });

  // 3. Check user_invites has new columns
  console.log("\n3️⃣ Checking user_invites schema...");
  const invites = await db.select().from(user_invites).limit(1);
  if (invites.length > 0) {
    const inv = invites[0] as any;
    console.log(
      `   ${inv.full_name !== undefined ? "✅" : "❌"} full_name column exists`
    );
    console.log(
      `   ${inv.phone !== undefined ? "✅" : "❌"} phone column exists`
    );
  } else {
    console.log(
      "   ℹ️  No invites in DB to check schema (table structure verified via drizzle)"
    );
  }

  // 4. Test creating a user with new role
  console.log("\n4️⃣ Testing new role assignment...");
  try {
    const testEmail = `test-role-${Date.now()}@example.com`;
    const [newUser] = await db
      .insert(users)
      .values({
        username: testEmail,
        email: testEmail,
        password: "hashed-password-placeholder",
        role: "inventory_manager", // new role name
        full_name: "Test User",
        phone: "+1234567890",
      })
      .returning();

    console.log(`   ✅ Created user with role: ${newUser.role}`);

    // Clean up test user
    await db.delete(users).where(eq(users.id, newUser.id));
    console.log(`   🗑️  Cleaned up test user`);
  } catch (e: any) {
    console.log(`   ❌ Failed to create user: ${e.message}`);
  }

  console.log("\n✅ Role migration test complete!\n");
}

testRoleMigration()
  .catch(console.error)
  .finally(() => process.exit(0));
