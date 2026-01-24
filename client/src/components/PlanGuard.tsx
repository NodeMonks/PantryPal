import { useAuth } from "@/contexts/AuthContext";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Lock, Sparkles } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useSubscriptionStatus } from "@/hooks/useSubscription";

interface PlanGuardProps {
  requiredPlan: string | string[];
  children: React.ReactNode;
  fallback?: React.ReactNode;
  feature?: string;
}

/**
 * Component that restricts access to features based on subscription plan
 * Shows upgrade prompt if user doesn't have required plan
 */
export function PlanGuard({
  requiredPlan,
  children,
  fallback,
  feature,
}: PlanGuardProps) {
  const { user, orgId } = useAuth();
  const navigate = useNavigate();
  const { data: subscription, isLoading } = useSubscriptionStatus();

  // Get current plan from subscription data
  const currentPlan = subscription?.plan || "starter";

  // Normalize required plans to array
  const requiredPlans = Array.isArray(requiredPlan)
    ? requiredPlan
    : [requiredPlan];

  // Check if current plan matches any required plan
  const hasAccess = requiredPlans.some((plan) =>
    currentPlan
      .toLowerCase()
      .includes(plan.toLowerCase().replace("-monthly", "")),
  );

  if (!user || !orgId) {
    return null;
  }

  if (isLoading) {
    return <div className="text-sm text-muted-foreground">Loading...</div>;
  }

  if (hasAccess) {
    return <>{children}</>;
  }

  // Show custom fallback or default upgrade prompt
  if (fallback) {
    return <>{fallback}</>;
  }

  return (
    <Card className="border-2 border-orange-200 bg-gradient-to-br from-orange-50 to-orange-100/50 dark:from-orange-950 dark:to-orange-900/20">
      <CardContent className="p-6">
        <div className="flex items-start gap-4">
          <div className="rounded-full bg-orange-100 dark:bg-orange-900/30 p-3">
            <Lock className="h-6 w-6 text-orange-600 dark:text-orange-400" />
          </div>
          <div className="flex-1 space-y-3">
            <div>
              <h3 className="font-semibold text-lg text-orange-900 dark:text-orange-100">
                {feature ? `${feature} - ` : ""}Premium Feature
              </h3>
              <p className="text-sm text-orange-700 dark:text-orange-300 mt-1">
                This feature requires{" "}
                <span className="font-medium">
                  {requiredPlans.join(" or ")}
                </span>{" "}
                plan to access.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <Button
                onClick={() => navigate("/subscription")}
                className="bg-orange-500 hover:bg-orange-600 text-white"
                size="sm"
              >
                <Sparkles className="h-4 w-4 mr-2" />
                Upgrade Now
              </Button>
              <Button
                variant="ghost"
                onClick={() => navigate("/subscription")}
                className="text-orange-700 hover:text-orange-900 dark:text-orange-300"
                size="sm"
              >
                View Plans
              </Button>
            </div>

            <div className="pt-2 border-t border-orange-200 dark:border-orange-800">
              <p className="text-xs text-orange-600 dark:text-orange-400">
                Current plan:{" "}
                <span className="font-medium capitalize">{currentPlan}</span>
              </p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * Inline version for smaller UI elements
 */
export function PlanBadge({
  requiredPlan,
  onClick,
}: {
  requiredPlan: string | string[];
  onClick?: () => void;
}) {
  const navigate = useNavigate();
  const plans = Array.isArray(requiredPlan) ? requiredPlan : [requiredPlan];

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={onClick || (() => navigate("/subscription"))}
      className="border-orange-300 text-orange-700 hover:bg-orange-50 dark:border-orange-700 dark:text-orange-400"
    >
      <Lock className="h-3 w-3 mr-1" />
      {plans[0]}
    </Button>
  );
}
