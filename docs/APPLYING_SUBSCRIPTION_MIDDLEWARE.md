# Applying Subscription Middleware - Quick Guide

## Routes That Should Be Protected

### 1. Store Management (Premium Feature)

If you want to restrict multiple stores to premium plans only:

```typescript
// In server/routes.ts
app.post(
  "/api/stores",
  isAuthenticated,
  requireActiveSubscription,
  checkPlanLimit("store"), // Checks if store limit reached
  requirePlan("premium-monthly"), // Only premium can create >1 store
  asyncHandler(async (req, res) => {
    // Create store logic
  }),
);
```

### 2. Advanced Reports (Premium Feature)

Restrict advanced analytics to premium users:

```typescript
app.get(
  "/api/reports/advanced",
  isAuthenticated,
  requireActiveSubscription,
  requirePlan("premium-monthly"),
  asyncHandler(async (req, res) => {
    // Advanced reports logic
  }),
);
```

### 3. User Creation (Check Limits)

Ensure users don't exceed plan limits:

```typescript
app.post(
  "/api/auth/create-user",
  isAuthenticated,
  hasRole("admin", "store_manager"),
  requireActiveSubscription, // Must have active subscription
  // checkPlanLimit("user"), // Optional: check user count limit
  asyncHandler(async (req, res) => {
    // Create user logic
  }),
);
```

### 4. Bulk Operations (Premium Feature)

Premium-only bulk features:

```typescript
app.post(
  "/api/products/bulk-import",
  isAuthenticated,
  requireActiveSubscription,
  requirePlan("premium-monthly"),
  asyncHandler(async (req, res) => {
    // Bulk import logic
  }),
);
```

---

## Frontend Feature Guards

### 1. Dashboard - Advanced Analytics Section

```tsx
// In Dashboard.tsx
import { PlanGuard } from "@/components/PlanGuard";

export function Dashboard() {
  return (
    <div>
      {/* Basic dashboard - always available */}
      <BasicDashboard />

      {/* Advanced analytics - premium only */}
      <PlanGuard requiredPlan="premium-monthly" feature="Advanced Analytics">
        <AdvancedAnalytics />
      </PlanGuard>
    </div>
  );
}
```

### 2. User Management - Create User Button

```tsx
// In UserManagement.tsx
import { usePlanLimits } from "@/hooks/useSubscription";

export function UserManagement() {
  const { limits, canAddUser } = usePlanLimits();
  const currentUserCount = users.length;

  return (
    <Button
      disabled={!canAddUser("admin", currentUserCount)}
      onClick={handleCreateUser}
    >
      {canAddUser("admin", currentUserCount)
        ? "Create User"
        : `User limit reached (${limits?.maxRoleUsers.adminOrOwner} max)`}
    </Button>
  );
}
```

### 3. Stores Page - Create Store Button

```tsx
// In Stores.tsx or similar
import { usePlanLimits } from "@/hooks/useSubscription";
import { PlanGuard } from "@/components/PlanGuard";

export function StoresPage() {
  const { canCreateStore, limits } = usePlanLimits();
  const storeCount = stores.length;

  return (
    <div>
      <PlanGuard
        requiredPlan="premium-monthly"
        fallback={
          <Alert>
            <p>Multiple stores require Premium plan</p>
            <Button onClick={() => navigate("/subscription")}>
              Upgrade Now
            </Button>
          </Alert>
        }
      >
        <Button
          disabled={!canCreateStore(storeCount)}
          onClick={handleCreateStore}
        >
          {canCreateStore(storeCount) ? "Create Store" : `Store limit reached`}
        </Button>
      </PlanGuard>
    </div>
  );
}
```

---

## Recommended Route Protection Strategy

### Level 1: Basic Protection (All Routes)

```typescript
isAuthenticated; // User must be logged in
```

### Level 2: Subscription Required (Most Routes)

```typescript
isAuthenticated;
requireActiveSubscription; // Must have active subscription
```

### Level 3: Premium Features (Select Routes)

```typescript
isAuthenticated;
requireActiveSubscription;
requirePlan("premium-monthly"); // Must be on premium plan
```

### Level 4: Limit Enforcement (Resource Creation)

```typescript
isAuthenticated;
requireActiveSubscription;
checkPlanLimit("store"); // Check plan limits
```

---

## Testing Your Implementation

### Test 1: Starter Plan User

1. Create org with starter plan
2. Try to create 2nd store → Should be blocked
3. Try to access advanced reports → Should see upgrade prompt

### Test 2: Premium Plan User

1. Create org with premium plan
2. Create multiple stores → Should work
3. Access all features → Should work

### Test 3: Expired Subscription

1. Set payment_status to "inactive" in DB
2. Try to access features → Should be blocked
3. See upgrade/renew message

---

## Gradual Rollout Approach

### Phase 1: Monitor Only

Add middleware but don't block:

```typescript
app.get(
  "/api/feature",
  isAuthenticated,
  async (req, res, next) => {
    // Log who would be blocked
    const hasAccess = await checkSubscription(req);
    console.log(`Access check: ${hasAccess}`);
    next(); // Don't block yet
  },
  handler,
);
```

### Phase 2: Soft Enforcement

Show warnings but allow access:

```typescript
requireActiveSubscription; // Returns 402 but with grace period
```

### Phase 3: Full Enforcement

Block access completely (production ready)

---

## Quick Commands

### Check Current Subscription

```bash
curl -X GET http://localhost:5000/api/subscription/status \
  -H "Cookie: connect.sid=YOUR_SESSION_COOKIE"
```

### Test Webhook

```bash
curl -X POST http://localhost:5000/api/payments/webhook \
  -H "Content-Type: application/json" \
  -H "X-Razorpay-Signature: test_signature" \
  -d '{
    "event": "subscription.activated",
    "payload": {
      "subscription": {
        "entity": {
          "id": "sub_test123"
        }
      }
    }
  }'
```

---

## Common Scenarios

### Scenario 1: User Hits Limit

**Backend Response** (403):

```json
{
  "error": "Plan limit reached",
  "message": "Your starter plan allows up to 1 store(s)",
  "currentCount": 1,
  "maxAllowed": 1,
  "action": "upgrade"
}
```

**Frontend Handling**:

```tsx
catch (error) {
  if (error.status === 403 && error.action === "upgrade") {
    showUpgradeDialog();
  }
}
```

### Scenario 2: Subscription Expired

**Backend Response** (402):

```json
{
  "error": "Subscription required",
  "message": "Please activate your subscription to access this feature",
  "subscriptionStatus": "expired",
  "action": "upgrade"
}
```

**Frontend Handling**:

```tsx
if (error.status === 402) {
  navigate("/subscription");
}
```

---

## Pro Tips

1. **Always use middleware in order**: auth → subscription → plan → limits
2. **Cache subscription status**: 5 minutes is safe
3. **Graceful degradation**: Show features but disable if no access
4. **Clear messaging**: Tell users exactly what they need to do
5. **Track analytics**: Log how often users hit limits

---

## Need Help?

- Check [PAYMENT_IMPROVEMENTS.md](./PAYMENT_IMPROVEMENTS.md) for detailed docs
- See [PAYMENT_IMPLEMENTATION_SUMMARY.md](./PAYMENT_IMPLEMENTATION_SUMMARY.md) for overview
- Look at middleware code for examples

**Happy implementing! 🚀**
