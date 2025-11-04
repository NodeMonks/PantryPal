#!/usr/bin/env tsx
/**
 * Seed simple test users to verify routes
 * - Creates a Test Org if none exists
 * - Creates users with new role names: admin, store_manager, inventory_manager, cashier
 * - Assigns RBAC roles to org
 * - Password for all users: Passw0rd!
 */
import { db } from "../db";
import { users, organizations, roles, user_roles } from "../../shared/schema";
import { eq } from "drizzle-orm";
import { hashPassword } from "../services/authService";

async function ensureOrg() {
  const [org] = await db.select().from(organizations).limit(1);
  if (org) return org;
  const [created] = await db
    .insert(organizations)
    .values({ name: "Test Org" })
    .returning();
  return created;
}

async function getRoleByName(name: string) {
  const [r] = await db
    .select()
    .from(roles)
    .where(eq(roles.name, name))
    .limit(1);
  if (!r) throw new Error(`RBAC role not found: ${name}`);
  return r;
}

async function ensureUser(email: string, role: string, full_name: string) {
  const [existing] = await db
    .select()
    .from(users)
    .where(eq(users.email, email))
    .limit(1);
  if (existing) return existing;
  const hashed = await hashPassword("Passw0rd!");
  const [u] = await db
    .insert(users)
    .values({
      username: email,
      email,
      password: hashed,
      role: role as any,
      full_name,
    })
    .returning();
  return u;
}

async function ensureAssignment(
  userId: number,
  orgId: string,
  roleName: string
) {
  const r = await getRoleByName(roleName);
  await db
    .insert(user_roles)
    .values({ user_id: userId, org_id: orgId, role_id: r.id })
    .onConflictDoNothing?.();
}

async function main() {
  console.log("Seeding test users...");
  const org = await ensureOrg();

  const scenarios = [
    { email: "admin1@example.com", role: "admin", name: "Admin One" },
    {
      email: "storemgr1@example.com",
      role: "store_manager",
      name: "Store Manager One",
    },
    {
      email: "invmgr1@example.com",
      role: "inventory_manager",
      name: "Inventory Manager One",
    },
    { email: "cashier1@example.com", role: "cashier", name: "Cashier One" },
  ];

  for (const s of scenarios) {
    const user = await ensureUser(s.email, s.role, s.name);
    await ensureAssignment(user.id, org.id, s.role);
    console.log(`✅ ${s.role} -> ${s.email}`);
  }

  console.log("\nDone. Credentials (all use same password): Passw0rd!\n");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
