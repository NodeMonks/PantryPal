import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";

export interface SubscriptionStatus {
  status: string;
  plan: string;
  subscriptionId: string | null;
  limits: {
    tier: "starter" | "premium";
    maxStores: number;
    maxRoleUsers: {
      adminOrOwner: number;
      store_manager: number;
      inventory_manager: number;
    };
  };
}

export function useSubscriptionStatus() {
  const { user, orgId } = useAuth();

  return useQuery<SubscriptionStatus>({
    queryKey: ["subscription-status", orgId],
    queryFn: async () => {
      const response = await fetch("/api/subscription/status", {
        credentials: "include",
      });

      if (!response.ok) {
        throw new Error("Failed to fetch subscription status");
      }

      return response.json();
    },
    enabled: !!user && !!orgId,
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
    refetchOnWindowFocus: true,
  });
}

export function useFeatureAccess(feature: string) {
  const { user, orgId } = useAuth();

  return useQuery({
    queryKey: ["feature-access", feature, orgId],
    queryFn: async () => {
      const response = await fetch(`/api/features/${feature}/check`, {
        credentials: "include",
      });

      if (!response.ok) {
        return { allowed: false, reason: "Unknown error" };
      }

      return response.json();
    },
    enabled: !!user && !!orgId,
    staleTime: 2 * 60 * 1000, // Cache for 2 minutes
  });
}

export function usePlanLimits() {
  const { data: subscription, isLoading } = useSubscriptionStatus();

  return {
    limits: subscription?.limits,
    isLoading,
    canCreateStore: (currentCount: number) => {
      if (!subscription?.limits) return true; // Allow if limits not loaded
      return currentCount < subscription.limits.maxStores;
    },
    canAddUser: (role: string, currentCount: number) => {
      if (!subscription?.limits) return true; // Allow if limits not loaded

      // Map role names to limit keys
      const roleMap: Record<
        string,
        keyof typeof subscription.limits.maxRoleUsers
      > = {
        admin: "adminOrOwner",
        owner: "adminOrOwner",
        store_manager: "store_manager",
        inventory_manager: "inventory_manager",
      };

      const limitKey = roleMap[role];
      if (!limitKey) return true; // Unknown role, allow

      const limit = subscription.limits.maxRoleUsers[limitKey];
      return currentCount < limit;
    },
    isPremium: subscription?.limits?.tier === "premium",
    isStarter: subscription?.limits?.tier === "starter",
  };
}
