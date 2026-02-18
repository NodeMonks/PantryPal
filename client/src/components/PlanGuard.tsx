// NOTE: Plan-based access guardrails are temporarily disabled.
// PlanGuard always renders children regardless of plan.
// To re-enable, restore the plan-check logic (see git history).
// Imports and interface kept intact so re-enabling requires no structural changes.
import { Button } from "@/components/ui/button";
import { Lock } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface PlanGuardProps {
  requiredPlan: string | string[];
  children: React.ReactNode;
  fallback?: React.ReactNode;
  feature?: string;
}

/**
 * Feature gate by subscription plan.
 * TEMPORARILY DISABLED – always renders children unconditionally.
 */
export function PlanGuard({ children }: PlanGuardProps) {
  // Guardrails disabled: render children for all users.
  return <>{children}</>;
  /* TO RE-ENABLE – remove the early return above, restore the imports below,
     and uncomment the full implementation from git history:
  import { useAuth } from "@/contexts/AuthContext";
  import { useNavigate } from "react-router-dom";
  import { useSubscriptionStatus } from "@/hooks/useSubscription";
  */
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
