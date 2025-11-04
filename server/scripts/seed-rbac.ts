import { db } from "../db";
import { roles, permissions, role_permissions } from "../../shared/schema";
import { eq, inArray } from "drizzle-orm";

async function ensurePermissions(names: string[]) {
  for (const name of names) {
    const existing = await db
      .select()
      .from(permissions)
      .where(eq(permissions.name, name));
    if (existing.length === 0) {
      await db.insert(permissions).values({ name });
    }
  }
}

async function ensureRoles(names: string[]) {
  for (const name of names) {
    const existing = await db.select().from(roles).where(eq(roles.name, name));
    if (existing.length === 0) {
      await db.insert(roles).values({ name });
    }
  }
}

async function mapRolePermissions(roleName: string, permNames: string[]) {
  const [role] = await db
    .select()
    .from(roles)
    .where(eq(roles.name, roleName))
    .limit(1);
  if (!role) return;
  const perms = await db
    .select()
    .from(permissions)
    .where(inArray(permissions.name, permNames));
  for (const p of perms) {
    await db
      .insert(role_permissions)
      .values({ role_id: role.id, permission_id: p.id })
      .onConflictDoNothing?.();
  }
}

async function main() {
  const permNames = [
    "inventory:read",
    "inventory:write",
    "billing:read",
    "billing:create",
    "billing:void",
    "users:manage",
    "roles:assign",
  ];
  const roleNames = ["admin", "store_manager", "inventory_manager", "cashier"];

  await ensurePermissions(permNames);
  await ensureRoles(roleNames);

  // admin: all
  await mapRolePermissions("admin", permNames);
  // store_manager
  await mapRolePermissions("store_manager", permNames);
  // inventory_manager
  await mapRolePermissions("inventory_manager", [
    "inventory:read",
    "inventory:write",
  ]);
  // cashier
  await mapRolePermissions("cashier", ["billing:read", "billing:create"]);

  console.log("✅ RBAC roles and permissions seeded");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
