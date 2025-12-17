import type { Request, Response, NextFunction } from "express";
import type { AuthContext } from "./jwtAuth";

/**
 * Get the organization ID from the authenticated request context
 * Works with both JWT auth (req.ctx) and Passport session (req.user)
 * Throws if not authenticated or no org_id present
 */
export function requireOrgId(req: Request): string {
  // Try JWT context first
  if (req.ctx?.orgId) {
    return req.ctx.orgId;
  }

  // Fall back to Passport session user
  const user = req.user as any;
  console.log("[TENANT] requireOrgId - user:", {
    exists: !!user,
    orgId: user?.orgId,
    id: user?.id,
    username: user?.username,
  });

  if (user?.orgId) {
    return user.orgId;
  }

  throw new Error("Organization ID not found in request context");
}

/**
 * Middleware to extract and validate tenant context (org_id, store_id)
 * Attaches orgId and storeId to req for easy access
 */
export function tenantScope() {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      const orgId = requireOrgId(req);
      // Attach to request for convenience (org-only tenancy)
      (req as any).orgId = orgId;

      next();
    } catch (error: any) {
      return res
        .status(403)
        .json({ error: error.message || "Tenant scope error" });
    }
  };
}

declare module "express-serve-static-core" {
  interface Request {
    orgId?: string;
  }
}
