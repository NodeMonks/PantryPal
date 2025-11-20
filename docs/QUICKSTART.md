# Quick Start Guide: Updated Roles & Enhanced Invites

## 🎯 What Changed?

### Role Names (Old → New)
```
viewer  →  cashier
manager  →  store_manager  
staff  →  inventory_manager
admin  →  admin (same)
```

### New Invite Fields
When creating a user via Admin or Store Manager, you now provide:
- ✅ **Name** (Full name, min 2 chars)
- ✅ **Role** (Select from dropdown)
- ✅ **Email** (Where they'll receive the link)
- ✅ **Phone** (Contact number, min 6 chars)

**Plus:** 5-second confirmation wait time ensures data accuracy before sending invite.

## 🚀 Testing the New Flow

### 1. Test Invite Creation (Admin/Store Manager)
```bash
# Start the dev server
npm run dev

# Visit http://localhost:5000/org/invite
# Login with admin credentials
# Fill out invite form with all 4 fields
# Wait 5 seconds for verification
# Copy the invite link
```

### 2. Test Invite Acceptance
```bash
# Visit the invite link (from step 1)
# Set password
# User profile will have name and phone pre-filled!
```

### 3. Test Registration with New Roles
```bash
# Visit http://localhost:5000/register
# Choose "Inventory Manager" or "Cashier" from dropdown
# Complete registration
```

### 4. Test Role-Based Access
```bash
# Login as different roles and verify access:

# Admin: Can access everything
http://localhost:5000/users (User Management)

# Store Manager: Can add products, manage inventory
http://localhost:5000/inventory/add

# Inventory Manager: Can create bills, manage customers
http://localhost:5000/billing/new

# Cashier: Can view dashboards, no edit permissions
http://localhost:5000/ (Dashboard only)
```

## 📋 Checklist for Your Team

- [ ] Update any external documentation with new role names
- [ ] Inform users about the role name changes
- [ ] Test invite flow end-to-end
- [ ] Verify all team members have correct roles after migration
- [ ] Update any third-party integrations that reference roles

## 🔧 Commands Reference

```bash
# Run role migration (if needed)
npx tsx server/scripts/migrate-user-roles.ts

# Verify migration
npx tsx server/scripts/test-role-migration.ts

# Push schema changes
npx drizzle-kit push

# Start dev server
npm run dev
```

## 💡 Tips

1. **Existing Users:** Already migrated automatically (viewer→cashier)
2. **Invite Links:** Now include name/phone for better user onboarding
3. **5-Second Wait:** Gives admins time to review before sending invite
4. **Role Hierarchy:** Admin > Store Manager > Inventory Manager > Cashier

## 📞 Support

- Full migration guide: `ROLE_MIGRATION.md`
- Implementation details: `IMPLEMENTATION_SUMMARY.md`
- Test scripts: `server/scripts/test-role-migration.ts`
