# Role Naming Update & User Invite Enhancement

## Summary
Renamed legacy session-based roles to align with RBAC naming conventions and extended user invite flow to collect full_name and phone with 5-second verification wait time.

## Changes Made

### 1. Role Naming Updates

#### Old Roles → New Roles:
- `viewer` → `cashier`
- `manager` → `store_manager`
- `staff` → `inventory_manager`
- `admin` → `admin` (unchanged)

### 2. Schema Changes

#### `shared/schema.ts`
- Updated `userRoleEnum` array with new role names
- Changed default role from `"staff"` to `"inventory_manager"`
- Added `full_name` and `phone` fields to `user_invites` table
- Extended `inviteCreateSchema` validation to require `full_name` (min 2 chars) and `phone` (min 6 chars)

**Migration:**
```sql
-- Already pushed to database via drizzle-kit
ALTER TABLE user_invites ADD COLUMN full_name TEXT;
ALTER TABLE user_invites ADD COLUMN phone TEXT;
```

### 3. Backend Service Updates

#### `server/services/authService.ts`
- Updated `createInvite()` signature to accept `full_name` and `phone`
- Store these fields in the invite record so they can be pre-filled when user accepts
- Modified `acceptInvite()` to pull `full_name` and `phone` from invite and attach to new user
- Changed default role for invited users from `"viewer"` to `"cashier"`

#### `server/controllers/authController.ts`
- Extended `inviteBody` zod schema with `full_name` (min 2) and `phone` (min 6)
- Added **5-second confirmation delay** (`setTimeout(5000)`) in `orgInvite` handler before returning invite link
  - Ensures validity and gives admin time to verify data
- Updated login response to include `orgId` for better context

#### `server/authRoutes.ts`
- Updated role validation in `PATCH /api/auth/users/:id/role` to accept new role names

### 4. Route Authorization Updates

#### `server/routes.ts`
Updated all `hasRole()` middleware calls:

| Endpoint | Old Roles | New Roles |
|----------|-----------|-----------|
| POST /api/products | admin, manager | admin, store_manager |
| PUT /api/products/:id | admin, manager | admin, store_manager |
| POST /api/customers | admin, manager, staff | admin, store_manager, inventory_manager |
| POST /api/bills | admin, manager, staff | admin, store_manager, inventory_manager |
| POST /api/bills/:billId/items | admin, manager, staff | admin, store_manager, inventory_manager |
| POST /api/inventory-transactions | admin, manager | admin, store_manager |

### 5. Frontend Updates

#### `client/src/App.tsx`
Updated `<ProtectedRoute roles={...}>` props:

| Route | Old Roles | New Roles |
|-------|-----------|-----------|
| /inventory/add | admin, manager | admin, store_manager |
| /billing | admin, manager, staff | admin, store_manager, inventory_manager |
| /billing/new | admin, manager, staff | admin, store_manager, inventory_manager |
| /customers | admin, manager, staff | admin, store_manager, inventory_manager |

#### `client/src/pages/Register.tsx`
- Changed default role from `"staff"` to `"inventory_manager"`
- Updated dropdown options:
  - Removed: "Staff", "Viewer"
  - Added: "Inventory Manager", "Cashier"
- Updated help text to reflect new role capabilities

#### `client/src/pages/OrgInvite.tsx`
- Added state for `fullName`, `phone`, and `sending` flag
- Added two new input fields (Full Name, Phone Number) to invite form
- Extended invite request body to include `full_name` and `phone`
- Button shows "Verifying and sending (5s)..." during the 5-second delay
- Added client-side validation for full name and phone before submit

## Testing Checklist

- [ ] Self-registration with new roles (inventory_manager/cashier) works
- [ ] Admin can update existing user roles to new role names
- [ ] Session auth route guards respect new role names
- [ ] JWT RBAC roles (admin, store_manager, inventory_manager, cashier) seed correctly
- [ ] Invite flow captures full_name and phone, stores in DB
- [ ] Invite flow waits 5 seconds before returning link
- [ ] Accepted invite pre-fills user with full_name and phone from invite
- [ ] All protected routes enforce correct new role names
- [ ] Frontend role dropdowns display new role names

## Migration Notes

### For Existing Users
If you have existing users with old roles in your database, run this SQL to migrate them:

```sql
UPDATE users 
SET role = CASE 
  WHEN role = 'viewer' THEN 'cashier'
  WHEN role = 'manager' THEN 'store_manager'
  WHEN role = 'staff' THEN 'inventory_manager'
  ELSE role
END
WHERE role IN ('viewer', 'manager', 'staff');
```

### For RBAC Tables
The RBAC roles table already uses the correct naming:
- admin
- store_manager
- inventory_manager
- cashier

No migration needed for `roles`, `permissions`, or `role_permissions` tables.

## Environment Variables
No new environment variables required. Existing JWT and session secrets remain unchanged.

## API Contract Changes

### POST /org/invite
**Before:**
```json
{
  "org_id": "uuid",
  "email": "user@example.com",
  "role_id": 2
}
```

**After (required fields added):**
```json
{
  "org_id": "uuid",
  "email": "user@example.com",
  "role_id": 2,
  "full_name": "John Doe",
  "phone": "+1234567890"
}
```

**Response timing:** Now includes a 5-second delay before returning the invite link.

### POST /auth/login
**Response now includes orgId:**
```json
{
  "access_token": "...",
  "user": { ... },
  "orgId": "uuid-of-primary-org"
}
```

## Deployment Steps

1. Pull latest code
2. Run `npm install` (no new dependencies)
3. Run `npx drizzle-kit push` to add columns to `user_invites`
4. (Optional) Run user role migration SQL if you have existing users
5. Restart server
6. Clear browser cache/local storage to pick up new role names in frontend

## Rollback Plan

If needed, revert schema changes:
```sql
ALTER TABLE user_invites DROP COLUMN full_name;
ALTER TABLE user_invites DROP COLUMN phone;
```

And revert role names:
```sql
UPDATE users 
SET role = CASE 
  WHEN role = 'cashier' THEN 'viewer'
  WHEN role = 'store_manager' THEN 'manager'
  WHEN role = 'inventory_manager' THEN 'staff'
  ELSE role
END
WHERE role IN ('cashier', 'store_manager', 'inventory_manager');
```

Then checkout the previous commit.
