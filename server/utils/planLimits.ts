export type PlanTier = "starter" | "premium" | "developer";

export type PlanLimits = {
  tier: PlanTier;
  maxStores: number;
  maxRoleUsers: {
    // role-name -> max distinct users in org with that role
    // use role names from `roles.name` (RBAC)
    adminOrOwner: number;
    store_manager: number;
    inventory_manager: number;
  };
};

export function normalizePlanTier(planName?: string | null): PlanTier {
  const raw = String(planName || "")
    .trim()
    .toLowerCase();

  // Treat unknown/empty as starter (safer default)
  if (!raw) return "starter";

  // Developer tier
  if (raw.includes("developer") || raw.includes("dev")) return "developer";

  // Explicit premium mapping
  if (raw.includes("premium") || raw.includes("999")) return "premium";

  // Starter mapping
  if (raw.includes("starter") || raw.includes("399")) return "starter";

  // Fall back to starter unless clearly premium
  return "starter";
}

export function getPlanLimits(planName?: string | null): PlanLimits {
  const tier = normalizePlanTier(planName);

  if (tier === "developer") {
    return {
      tier,
      maxStores: Number.POSITIVE_INFINITY,
      maxRoleUsers: {
        adminOrOwner: Number.POSITIVE_INFINITY,
        store_manager: Number.POSITIVE_INFINITY,
        inventory_manager: Number.POSITIVE_INFINITY,
      },
    };
  }

  if (tier === "starter") {
    return {
      tier,
      maxStores: 1,
      maxRoleUsers: {
        adminOrOwner: 1,
        store_manager: 3,
        inventory_manager: 3,
      },
    };
  }

  return {
    tier,
    maxStores: Number.POSITIVE_INFINITY,
    maxRoleUsers: {
      adminOrOwner: Number.POSITIVE_INFINITY,
      store_manager: Number.POSITIVE_INFINITY,
      inventory_manager: Number.POSITIVE_INFINITY,
    },
  };
}
