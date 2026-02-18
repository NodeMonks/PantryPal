# Developer Mode - Full Access Without Paywall

This guide explains how to enable developer mode for your organization, which bypasses all subscription restrictions and gives you access to all features without payment.

## 🎯 What is Developer Mode?

Developer mode is a special flag that can be set on an organization to:

- ✅ Bypass all subscription checks
- ✅ Remove payment requirements
- ✅ Grant unlimited access to all features
- ✅ Allow unlimited stores
- ✅ Allow unlimited users with any role
- ✅ Access all premium features

**⚠️ Important:** This is intended for development and testing purposes only. Do not enable this in production for real customers.

## 🚀 Quick Start

### Method 1: Using the PowerShell Script (Easiest)

1. **Run the migration** to add the developer mode field to your database:

   ```powershell
   npm run db:push
   # or if you have a migrate command
   npm run db:migrate
   ```

2. **Make sure your app is running**:

   ```powershell
   npm run dev
   ```

3. **Login to your application** in a browser

4. **Run the developer mode script**:

   ```powershell
   # To enable developer mode
   .\scripts\enable-developer-mode.ps1 -Enable

   # To disable developer mode
   .\scripts\enable-developer-mode.ps1 -Disable
   ```

5. Follow the prompts to enter your session cookie (instructions provided by the script)

6. **Refresh your application** to see the changes

### Method 2: Using SQL Query (Direct Database)

If you prefer to enable developer mode directly in the database:

```sql
-- Enable developer mode for a specific organization by email
UPDATE organizations
SET is_developer = true, payment_status = 'active'
WHERE owner_email = 'your-email@example.com';

-- Or by organization name
UPDATE organizations
SET is_developer = true, payment_status = 'active'
WHERE name = 'Your Organization Name';

-- Check current status
SELECT id, name, owner_email, is_developer, payment_status
FROM organizations;
```

### Method 3: Using API Endpoint (cURL)

You can also use the API endpoint directly with cURL:

1. **Get your session cookie** from the browser (see instructions below)

2. **Make the API call**:
   ```bash
   curl -X POST http://localhost:5000/api/subscription/developer-mode \
     -H "Content-Type: application/json" \
     -H "Cookie: connect.sid=YOUR_SESSION_COOKIE_HERE" \
     -d '{
       "enabled": true,
       "secretKey": "dev-mode-secret-key-change-me"
     }'
   ```

## 🔑 Getting Your Session Cookie

To use the API endpoint or script, you need your session cookie:

1. Login to your application
2. Open browser DevTools (Press F12)
3. Go to:
   - **Chrome/Edge**: `Application` tab → `Storage` → `Cookies`
   - **Firefox**: `Storage` tab → `Cookies`
4. Find the cookie named `connect.sid`
5. Copy its value (the long string)

## 🔐 Security Configuration

### Setting a Custom Secret Key

By default, the developer mode endpoint uses a default secret key. For better security:

1. **Add to your `.env` file**:

   ```env
   DEVELOPER_MODE_SECRET=your-super-secret-key-here-minimum-16-chars
   ```

2. **Use the secret when calling the API**:

   ```powershell
   # Set as environment variable
   $env:DEVELOPER_MODE_SECRET = "your-super-secret-key-here"

   # Then run the script
   .\scripts\enable-developer-mode.ps1 -Enable
   ```

### Disabling the Endpoint in Production

**⚠️ IMPORTANT**: Before deploying to production, you should either:

1. **Remove the endpoint** from `server/routes.ts`, or
2. **Add additional security checks** (e.g., only allow in development mode):
   ```typescript
   if (env.NODE_ENV === "production") {
     return res.status(404).json({ error: "Not found" });
   }
   ```

## 📋 How It Works

### Code Changes

The developer mode feature was implemented with these changes:

1. **Database Schema** (`shared/schema.ts`):
   - Added `is_developer` boolean field to organizations table

2. **Subscription Middleware** (`server/middleware/subscription.ts`):
   - Checks `is_developer` flag and bypasses all subscription checks if true
   - Bypasses plan restrictions for developer organizations
   - Bypasses plan limits for developer organizations

3. **Plan Limits** (`server/utils/planLimits.ts`):
   - Added "developer" tier with unlimited resources

4. **API Endpoint** (`server/routes.ts`):
   - POST `/api/subscription/developer-mode` - Toggle developer mode
   - GET `/api/subscription/status` - Now includes `isDeveloper` flag

### What Gets Bypassed

When `is_developer = true`, the following checks are bypassed:

- ✅ `requireActiveSubscription` middleware
- ✅ `requirePlan` middleware
- ✅ `checkPlanLimit` middleware
- ✅ All `payment_status` checks
- ✅ Store count limits
- ✅ User role count limits
- ✅ Any premium feature restrictions

## 🧪 Testing

After enabling developer mode, verify it's working:

1. **Check subscription status**:

   ```bash
   curl http://localhost:5000/api/subscription/status \
     -H "Cookie: connect.sid=YOUR_SESSION_COOKIE"
   ```

   You should see:

   ```json
   {
     "status": "active",
     "plan": "starter",
     "isDeveloper": true,
     "limits": {
       "tier": "developer",
       "maxStores": null,
       "maxRoleUsers": {
         "adminOrOwner": null,
         "store_manager": null,
         "inventory_manager": null
       }
     }
   }
   ```

2. **Try creating multiple stores** (should work even on starter plan)

3. **Try accessing premium features** (should work without payment)

## 🔄 Switching Back to Normal Mode

To restore normal subscription behavior:

```powershell
# Using the script
.\scripts\enable-developer-mode.ps1 -Disable

# Or via SQL
UPDATE organizations SET is_developer = false WHERE owner_email = 'your-email@example.com';

# Or via API
curl -X POST http://localhost:5000/api/subscription/developer-mode \
  -H "Content-Type: application/json" \
  -H "Cookie: connect.sid=YOUR_SESSION_COOKIE" \
  -d '{"enabled": false, "secretKey": "dev-mode-secret-key-change-me"}'
```

## 📝 Migration File

The database migration file is located at:

```
drizzle/0011_add_developer_mode.sql
```

To apply it:

```powershell
# If using Drizzle push
npm run db:push

# If using migrations
npm run db:migrate
```

## ❓ Troubleshooting

### "Invalid secret key" Error

- Make sure `DEVELOPER_MODE_SECRET` in your `.env` matches what you're passing to the API
- Default value is: `dev-mode-secret-key-change-me`

### "Unauthorized" or "401" Error

- Your session cookie has expired, login again and get a new cookie
- Make sure you're logged in to the correct organization

### "Organization not found" Error

- Make sure you're authenticated and have an organization created
- Check that the organization exists in the database

### Script Can't Connect to Server

- Verify the server is running at `http://localhost:5000`
- Use `-BaseUrl` parameter if running on a different port:
  ```powershell
  .\scripts\enable-developer-mode.ps1 -Enable -BaseUrl "http://localhost:3000"
  ```

### Changes Not Visible in UI

- **Hard refresh** the page (Ctrl+Shift+R or Ctrl+F5)
- Clear browser cache
- Check browser console for errors
- Verify the status endpoint shows `isDeveloper: true`

## 🎓 Example Workflow

Here's a complete example of setting up a developer account:

```powershell
# 1. Install dependencies
npm install

# 2. Run the database migration
npm run db:push

# 3. Start the development server
npm run dev

# 4. Register a new organization in the UI
# (Go to http://localhost:5000 and sign up)

# 5. Enable developer mode
.\scripts\enable-developer-mode.ps1 -Enable
# (Follow the prompts to enter your session cookie)

# 6. Refresh the application
# You now have full access to all features!
```

## 📚 Related Files

- `shared/schema.ts` - Database schema with `is_developer` field
- `server/middleware/subscription.ts` - Subscription checks
- `server/utils/planLimits.ts` - Plan limit definitions
- `server/routes.ts` - Developer mode API endpoint
- `server/config/env.ts` - Environment configuration
- `drizzle/0011_add_developer_mode.sql` - Database migration
- `scripts/enable-developer-mode.ps1` - Helper script

## 🛡️ Production Considerations

Before going to production:

1. ✅ Remove or secure the `/api/subscription/developer-mode` endpoint
2. ✅ Ensure `is_developer` is not exposed in public APIs
3. ✅ Add audit logging for developer mode changes
4. ✅ Document who can enable developer mode and why
5. ✅ Consider using environment-based restrictions:
   ```typescript
   if (env.NODE_ENV === "production" && !env.ALLOW_DEVELOPER_MODE) {
     // Don't allow developer mode in production
   }
   ```

---

**Happy developing! 🚀** If you have questions or issues, check the troubleshooting section above.
