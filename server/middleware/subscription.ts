import { Request, Response, NextFunction } from "express";
// NOTE: Subscription/plan guardrails are temporarily disabled.
// All three middleware functions pass through unconditionally.
// To re-enable, restore the commented logic blocks below each function.
// Imports are kept in place so re-enabling requires no structural changes.
import { db } from "../db";
import { organizations } from "../../shared/schema";
import { eq } from "drizzle-orm";
import { getPlanLimits } from "../utils/planLimits";
import { requireOrgId } from "./tenantContext";

/**
 * Middleware to ensure the organization has an active subscription.
 * TEMPORARILY DISABLED – passes through unconditionally.
 */
export async function requireActiveSubscription(
  _req: Request,
  _res: Response,
  next: NextFunction,
) {
  return next();
  /* TO RE-ENABLE – remove the early return above and uncomment:
  try {
    const orgId = requireOrgId(_req);
    const [org] = await db.select().from(organizations).where(eq(organizations.id, orgId)).limit(1);
    if (!org) return _res.status(404).json({ error: "Organization not found" });
    if (org.is_developer) return next();
    if (org.payment_status !== "active") {
      return _res.status(402).json({
        error: "Subscription required",
        message: "Please activate your subscription to access this feature",
        subscriptionStatus: org.payment_status,
        action: "upgrade",
      });
    }
    next();
  } catch (error) {
    console.error("Subscription middleware error:", error);
    _res.status(500).json({ error: "Failed to verify subscription" });
  }
  */
}

/**
 * Middleware to ensure the organization has one of the required plans.
 * TEMPORARILY DISABLED – passes through unconditionally.
 * @param _allowedPlans - Array of plan names that will be enforced when re-enabled.
 */
export function requirePlan(..._allowedPlans: string[]) {
  return (_req: Request, _res: Response, next: NextFunction) => {
    return next();
    /* TO RE-ENABLE – remove the early return above and uncomment:
    try {
      const orgId = _req.ctx?.orgId;
      if (!orgId) return _res.status(401).json({ error: "Organization context required" });
      const [org] = await db.select().from(organizations).where(eq(organizations.id, orgId)).limit(1);
      if (!org) return _res.status(404).json({ error: "Organization not found" });
      if (org.is_developer) return next();
      const normalizedPlanName = (org.plan_name || "starter").toLowerCase();
      const normalizedAllowedPlans = _allowedPlans.map((p) => p.toLowerCase());
      const hasAccess = normalizedAllowedPlans.some((allowedPlan) =>
        normalizedPlanName.includes(allowedPlan.replace("-monthly", "")),
      );
      if (!hasAccess) {
        const limits = getPlanLimits(org.plan_name);
        return _res.status(403).json({
          error: "Upgrade required",
          message: `This feature requires ${_allowedPlans.join(" or ")} plan`,
          currentPlan: org.plan_name,
          currentTier: limits.tier,
          requiredPlans: _allowedPlans,
          action: "upgrade",
        });
      }
      next();
    } catch (error) {
      console.error("Plan middleware error:", error);
      _res.status(500).json({ error: "Failed to verify plan access" });
    }
    */
  };
}

/**
 * Middleware to check if organization has reached plan limits.
 * TEMPORARILY DISABLED – passes through unconditionally.
 * @param _resourceType - Resource type that will be checked when re-enabled.
 */
export function checkPlanLimit(_resourceType: "store" | "user") {
  return (_req: Request, _res: Response, next: NextFunction) => {
    return next();
    /* TO RE-ENABLE – remove the early return above and uncomment:
    try {
      const orgId = _req.ctx?.orgId;
      if (!orgId) return _res.status(401).json({ error: "Organization context required" });
      const [org] = await db.select().from(organizations).where(eq(organizations.id, orgId)).limit(1);
      if (org?.is_developer) return next();
      if (!org) return _res.status(404).json({ error: "Organization not found" });
      const limits = getPlanLimits(org.plan_name);
      if (_resourceType === "store") {
        const { stores } = await import("../../shared/schema");
        const existingStores = await db.select().from(stores).where(eq(stores.org_id, orgId));
        if (existingStores.length >= limits.maxStores) {
          return _res.status(403).json({
            error: "Plan limit reached",
            message: `Your ${org.plan_name || "current"} plan allows up to ${limits.maxStores} store(s)`,
            currentCount: existingStores.length,
            maxAllowed: limits.maxStores,
            action: "upgrade",
          });
        }
      }
      next();
    } catch (error) {
      console.error("Plan limit check error:", error);
      _res.status(500).json({ error: "Failed to check plan limits" });
    }
    */
  };
}
