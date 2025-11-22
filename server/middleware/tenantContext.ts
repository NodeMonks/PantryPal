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
  console.log('[TENANT] requireOrgId - user:', {
    exists: !!user,
    orgId: user?.orgId,
    id: user?.id,
    username: user?.username
  });
  
  if (user?.orgId) {
    return user.orgId;
  }

  throw new Error("Organization ID not found in request context");
}

/**
 * Get the primary store ID from the authenticated request context
 * Works with both JWT auth (req.ctx) and Passport session (req.user)
 * Returns the first store from user's store assignments, or throws if none
 */
export function requireStoreId(req: Request): string {
  // Try JWT context first
  if (req.ctx?.stores && req.ctx.stores.length > 0) {
    return req.ctx.stores[0];
  }

  // Fall back to Passport session user
  const user = req.user as any;
  console.log('[TENANT] requireStoreId - user:', {
    exists: !!user,
    storeId: user?.storeId,
    id: user?.id,
    username: user?.username
  });
  
  if (user?.storeId) {
    return user.storeId;
  }

  throw new Error("No store assignment found for user");
}

/**
 * Get store ID from route param or fallback to user's primary store
 */
export function getStoreId(req: Request): string {
  const paramStoreId = req.params.storeId || req.query.storeId;
  if (paramStoreId && typeof paramStoreId === "string") {
    // Verify user has access to this store (JWT context)
    if (req.ctx?.stores && !req.ctx.stores.includes(paramStoreId)) {
      throw new Error("Access denied to this store");
    }
    // For Passport session, just use the param (more permissive for now)
    return paramStoreId;
  }
  return requireStoreId(req);
}

/**
 * Middleware to extract and validate tenant context (org_id, store_id)
 * Attaches orgId and storeId to req for easy access
 */
export function tenantScope() {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      const orgId = requireOrgId(req);
      const storeId = getStoreId(req);

      // Attach to request for convenience
      (req as any).orgId = orgId;
      (req as any).storeId = storeId;

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
    storeId?: string;
  }
}
