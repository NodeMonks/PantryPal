import { Request, Response, NextFunction } from "express";
import { db } from "../db";
import { organizations } from "../../shared/schema";
import { eq } from "drizzle-orm";
import { getPlanLimits } from "../utils/planLimits";

/**
 * Middleware to ensure the organization has an active subscription
 * Returns 402 Payment Required if subscription is not active
 */
export async function requireActiveSubscription(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const orgId = req.ctx?.orgId;
    if (!orgId) {
      return res.status(401).json({
        error: "Organization context required",
        message: "Please log in with your organization account",
      });
    }

    const [org] = await db
      .select()
      .from(organizations)
      .where(eq(organizations.id, orgId))
      .limit(1);

    if (!org) {
      return res.status(404).json({ error: "Organization not found" });
    }

    // Check subscription status
    if (org.payment_status !== "active") {
      return res.status(402).json({
        error: "Subscription required",
        message: "Please activate your subscription to access this feature",
        subscriptionStatus: org.payment_status,
        action: "upgrade",
      });
    }

    // Optionally check subscription expiry date (if you add expiry_date field)
    // if (org.subscription_expires_at && org.subscription_expires_at < new Date()) {
    //   return res.status(402).json({
    //     error: "Subscription expired",
    //     message: "Your subscription has expired. Please renew to continue.",
    //   });
    // }

    next();
  } catch (error) {
    console.error("Subscription middleware error:", error);
    res.status(500).json({ error: "Failed to verify subscription" });
  }
}

/**
 * Middleware to ensure the organization has one of the required plans
 * @param allowedPlans - Array of plan names that are allowed (e.g., ["premium-monthly", "enterprise-monthly"])
 */
export function requirePlan(...allowedPlans: string[]) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const orgId = req.ctx?.orgId;
      if (!orgId) {
        return res.status(401).json({
          error: "Organization context required",
          message: "Please log in with your organization account",
        });
      }

      const [org] = await db
        .select()
        .from(organizations)
        .where(eq(organizations.id, orgId))
        .limit(1);

      if (!org) {
        return res.status(404).json({ error: "Organization not found" });
      }

      // Normalize plan names for comparison
      const normalizedPlanName = (org.plan_name || "starter").toLowerCase();
      const normalizedAllowedPlans = allowedPlans.map((p) => p.toLowerCase());

      // Check if current plan is in allowed list
      const hasAccess = normalizedAllowedPlans.some((allowedPlan) =>
        normalizedPlanName.includes(allowedPlan.replace("-monthly", "")),
      );

      if (!hasAccess) {
        const limits = getPlanLimits(org.plan_name);
        return res.status(403).json({
          error: "Upgrade required",
          message: `This feature requires ${allowedPlans.join(" or ")} plan`,
          currentPlan: org.plan_name,
          currentTier: limits.tier,
          requiredPlans: allowedPlans,
          action: "upgrade",
        });
      }

      next();
    } catch (error) {
      console.error("Plan middleware error:", error);
      res.status(500).json({ error: "Failed to verify plan access" });
    }
  };
}

/**
 * Middleware to check if organization has reached plan limits
 * @param resourceType - Type of resource being created (e.g., "store", "user")
 */
export function checkPlanLimit(resourceType: "store" | "user") {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const orgId = req.ctx?.orgId;
      if (!orgId) {
        return res.status(401).json({ error: "Organization context required" });
      }

      const [org] = await db
        .select()
        .from(organizations)
        .where(eq(organizations.id, orgId))
        .limit(1);

      if (!org) {
        return res.status(404).json({ error: "Organization not found" });
      }

      const limits = getPlanLimits(org.plan_name);

      if (resourceType === "store") {
        // Count existing stores
        const { stores } = await import("../../shared/schema");
        const existingStores = await db
          .select()
          .from(stores)
          .where(eq(stores.org_id, orgId));

        if (existingStores.length >= limits.maxStores) {
          return res.status(403).json({
            error: "Plan limit reached",
            message: `Your ${org.plan_name || "current"} plan allows up to ${
              limits.maxStores
            } store(s)`,
            currentCount: existingStores.length,
            maxAllowed: limits.maxStores,
            action: "upgrade",
          });
        }
      }

      // Add more resource type checks as needed

      next();
    } catch (error) {
      console.error("Plan limit check error:", error);
      res.status(500).json({ error: "Failed to check plan limits" });
    }
  };
}
