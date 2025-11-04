#!/usr/bin/env tsx
/**
 * Migrate existing users from old role names to new role names
 *
 * Run: npx tsx server/scripts/migrate-user-roles.ts
 */
import { db } from "../db";
import { users } from "../../shared/schema";
import { eq, inArray } from "drizzle-orm";

async function migrateUserRoles() {
  console.log("🔄 Migrating user roles from old to new naming...\n");

  // Role mapping
  const roleMap: Record<string, string> = {
    viewer: "cashier",
    manager: "store_manager",
    staff: "inventory_manager",
  };

  // Find users with old roles
  const oldRoles = Object.keys(roleMap);
  const usersToMigrate = await db
    .select()
    .from(users)
    .where(inArray(users.role as any, oldRoles));

  if (usersToMigrate.length === 0) {
    console.log("✅ No users need migration. All roles are up to date!\n");
    return;
  }

  console.log(`Found ${usersToMigrate.length} users to migrate:\n`);

  for (const user of usersToMigrate) {
    const oldRole = user.role;
    const newRole = roleMap[oldRole] || oldRole;

    console.log(`   User #${user.id} (${user.email}): ${oldRole} → ${newRole}`);

    await db
      .update(users)
      .set({ role: newRole as any, updated_at: new Date() })
      .where(eq(users.id, user.id));
  }

  console.log(`\n✅ Successfully migrated ${usersToMigrate.length} user(s)!\n`);
}

migrateUserRoles()
  .catch(console.error)
  .finally(() => process.exit(0));
