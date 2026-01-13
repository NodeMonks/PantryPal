import type { Request, Response } from "express";
import { db } from "../db";
import { roles, user_roles, roles as rolesTable } from "../../shared/schema";
import { inArray, eq, and } from "drizzle-orm";

function allowedTargetsFor(inviterRoles: string[]): string[] {
  const set = new Set(inviterRoles);
  // Admin or Owner can invite store_manager, inventory_manager, cashier
  if (set.has("admin") || set.has("owner")) {
    return ["store_manager", "inventory_manager", "cashier"];
  }
  if (set.has("store_manager")) {
    // Store Manager can invite inventory_manager and cashier only
    return ["inventory_manager", "cashier"];
  }
  // Others: no assignable roles
  return [];
}

export async function listRoles(req: Request, res: Response) {
  try {
    const userId = req.ctx?.userId;
    const orgId = req.ctx?.orgId; // Use org from JWT context

    if (!userId || !orgId) {
      return res.json([]);
    }

    // Load the user's roles in their org
    const userRolesInOrg = await db
      .select({ name: rolesTable.name })
      .from(user_roles)
      .leftJoin(rolesTable, eq(user_roles.role_id, rolesTable.id))
      .where(
        and(eq(user_roles.user_id, userId), eq(user_roles.org_id, orgId as any))
      );

    const inviterRoles = userRolesInOrg
      .map((r) => r.name)
      .filter(Boolean) as string[];

    if (inviterRoles.length === 0) {
      return res.json([]);
    }

    const allowedNames = allowedTargetsFor(inviterRoles);

    if (allowedNames.length === 0) {
      return res.json([]);
    }

    const rows = await db
      .select()
      .from(roles)
      .where(inArray(roles.name, allowedNames as any));

    return res.json(rows);
  } catch (e) {
    console.error("[ROLES] Error:", e);
    return res.status(500).json({ error: "Failed to list roles" });
  }
}
