import type { Request, Response, NextFunction } from "express";
import { db } from "../db";
import {
  user_roles,
  role_permissions,
  permissions as permTable,
  roles as rolesTable,
} from "../../shared/schema";
import { and, eq, inArray } from "drizzle-orm";
import { verifyAccessToken } from "../utils/jwt";

export type AuthContext = {
  userId: number;
  orgId?: string;
  roles: string[];
  permissions: string[];
  stores: string[]; // store ids where role scoped
};

declare module "express-serve-static-core" {
  interface Request {
    ctx?: AuthContext;
  }
}

export function auth() {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      const header = req.headers["authorization"];
      if (!header || !header.startsWith("Bearer ")) {
        return res.status(401).json({ error: "Missing bearer token" });
      }
      const token = header.slice(7);
      const payload = verifyAccessToken(token);
      const userId = Number(payload.sub);
      if (!userId) return res.status(401).json({ error: "Invalid token" });
      req.ctx = {
        userId,
        orgId: payload.orgId,
        roles: payload.roles || [],
        permissions: [],
        stores: [],
      };
      return next();
    } catch (e) {
      return res.status(401).json({ error: "Unauthorized" });
    }
  };
}

export function loadPermissions() {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.ctx) return res.status(401).json({ error: "Unauthorized" });
      const { userId, orgId } = req.ctx;

      console.log("loadPermissions - userId:", userId, "orgId:", orgId);

      // load role assignments
      const roleAssignments = await db
        .select({
          role_id: user_roles.role_id,
          role_name: rolesTable.name,
          store_id: user_roles.store_id,
        })
        .from(user_roles)
        .leftJoin(rolesTable, eq(user_roles.role_id, rolesTable.id))
        .where(
          and(
            eq(user_roles.user_id, userId),
            orgId ? eq(user_roles.org_id, orgId) : (undefined as any)
          )
        );

      console.log("loadPermissions - roleAssignments:", roleAssignments);

      const roleIds = roleAssignments.map((r) => r.role_id);
      const roleNames = roleAssignments
        .map((r) => (r.role_name ? r.role_name : undefined))
        .filter(Boolean) as string[];
      const stores = roleAssignments
        .map((r) => (r.store_id ? r.store_id : undefined))
        .filter(Boolean) as string[];

      let permissions: string[] = [];
      if (roleIds.length > 0) {
        const rows = await db
          .select({ name: permTable.name })
          .from(role_permissions)
          .leftJoin(permTable, eq(role_permissions.permission_id, permTable.id))
          .where(inArray(role_permissions.role_id, roleIds));
        permissions = rows.map((r) => r.name).filter(Boolean) as string[];
      }

      req.ctx.roles = Array.from(new Set(roleNames));
      req.ctx.permissions = Array.from(new Set(permissions));
      req.ctx.stores = Array.from(new Set(stores));

      console.log("loadPermissions - final ctx:", req.ctx);

      return next();
    } catch (e) {
      console.error("loadPermissions error:", e);
      return res.status(500).json({ error: "Failed to load permissions" });
    }
  };
}

export function can(permission: string, storeId?: string) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.ctx) return res.status(401).json({ error: "Unauthorized" });
    const hasPerm = req.ctx.permissions.includes(permission);
    if (!hasPerm) {
      return res.status(403).json({ error: "Forbidden", required: permission });
    }
    if (
      storeId &&
      req.ctx.stores.length > 0 &&
      !req.ctx.stores.includes(storeId)
    ) {
      return res.status(403).json({ error: "Forbidden: store scope" });
    }
    return next();
  };
}
