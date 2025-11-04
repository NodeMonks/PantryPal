import type { Request, Response } from "express";
import { db } from "../db";
import { roles } from "../../shared/schema";
import { inArray } from "drizzle-orm";

function allowedTargetsFor(inviterRoles: string[]): string[] {
  const set = new Set(inviterRoles);
  if (set.has("admin")) {
    // Admin can invite store_manager, inventory_manager, cashier
    return ["store_manager", "inventory_manager", "cashier"];
  }
  if (set.has("store_manager")) {
    // Store Manager can invite inventory_manager and cashier only
    return ["inventory_manager", "cashier"];
  }
  // Others: no assignable roles
  return [];
}

export async function listRoles(_req: Request, res: Response) {
  try {
    const inviterRoles = (res.req as any)?.ctx?.roles || [];
    // Fallback: if no roles resolved, respond with empty list for safety
    if (!Array.isArray(inviterRoles) || inviterRoles.length === 0) {
      return res.json([]);
    }
    const allowedNames = allowedTargetsFor(inviterRoles);
    if (allowedNames.length === 0) return res.json([]);
    const rows = await db
      .select()
      .from(roles)
      .where(inArray(roles.name, allowedNames as any));
    return res.json(rows);
  } catch (e) {
    return res.status(500).json({ error: "Failed to list roles" });
  }
}
