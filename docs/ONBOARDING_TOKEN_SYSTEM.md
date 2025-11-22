# Onboarding Token System Implementation

## Overview

Implemented a secure token-based onboarding system that requires users to receive an invitation link before they can register an organization.

## How It Works

### 1. Token Generation (Admin Action)

- Super admin creates onboarding token via `/api/auth/create-onboarding-token`
- Token is cryptographically secure (64 characters)
- Token hash is stored in database
- Token is sent via email with onboarding link
- Default expiry: 72 hours

### 2. User Onboarding Flow

```
User receives email with link
  ↓
Clicks: /onboarding?token=abc123...
  ↓
Frontend validates token via API
  ↓
If valid: Shows registration wizard (prefilled with email/company)
  ↓
User completes registration
  ↓
Backend validates token again and marks as "used"
  ↓
Redirects to /login
```

### 3. Security Features

- ✅ Tokens are hashed before storage (SHA-256)
- ✅ Single-use tokens (marked `used_at` after registration)
- ✅ Time-limited expiration
- ✅ Email validation (must match token email)
- ✅ Token linked to created organization for audit trail

## Database Schema

### `onboarding_tokens` Table

```sql
CREATE TABLE onboarding_tokens (
  id uuid PRIMARY KEY,
  email text NOT NULL,
  company_name text NOT NULL,
  token_hash text UNIQUE NOT NULL,
  expires_at timestamptz NOT NULL,
  used_at timestamptz,
  org_id uuid REFERENCES organizations(id),
  created_at timestamptz NOT NULL DEFAULT now()
);
```

## API Endpoints

### 1. Create Onboarding Token (Admin Only)

**POST** `/api/auth/create-onboarding-token`

**Auth Required:** Yes (Admin role)

**Request Body:**

```json
{
  "email": "newclient@example.com",
  "company_name": "Acme Corporation",
  "expires_in_hours": 72
}
```

**Response:**

```json
{
  "message": "Onboarding token created successfully",
  "token": "abc123...",
  "expires_at": "2025-11-25T10:00:00Z",
  "onboarding_link": "https://yourapp.com/onboarding?token=abc123...",
  "email": "newclient@example.com",
  "company_name": "Acme Corporation"
}
```

### 2. Validate Onboarding Token (Public)

**GET** `/api/auth/validate-onboarding-token?token=abc123...`

**Response:**

```json
{
  "valid": true,
  "email": "newclient@example.com",
  "company_name": "Acme Corporation"
}
```

Or if invalid:

```json
{
  "valid": false,
  "error": "Token has expired"
}
```

### 3. Register Organization (Public with Token)

**POST** `/api/auth/register-organization`

**Request Body:**

```json
{
  "onboarding_token": "abc123...",
  "organization": {
    "name": "Acme Corporation"
  },
  "stores": [{ "name": "Main Store" }, { "name": "Branch Store" }],
  "admin": {
    "username": "john_admin",
    "email": "john@acme.com",
    "password": "SecurePass123!",
    "full_name": "John Doe",
    "phone": "+1234567890"
  }
}
```

## Frontend Changes

### OrgOnboarding.tsx

- Checks for `?token=` query parameter
- Validates token before showing wizard
- Shows error if no token or invalid token
- Prefills email and company name from token

### RegisterWizard.tsx

- Now accepts `token`, `prefillEmail`, `prefillCompany` props
- Pre-fills step 1 (company) and step 3 (email) with token data
- Sends token with registration request

## Usage Instructions

### For Admins (Generating Invites)

**Option 1: API Call (Temporary)**

```bash
curl -X POST http://localhost:5000/api/auth/create-onboarding-token \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ADMIN_JWT" \
  -d '{
    "email": "client@example.com",
    "company_name": "Client Corp",
    "expires_in_hours": 72
  }'
```

**Option 2: Admin UI (TODO)**
Create a page at `/admin/onboarding-invites` with a form to:

- Input client email
- Input company name
- Set expiration (default 72 hours)
- Generate and copy link
- View all sent invitations (status: pending/used/expired)

### For New Clients

1. Receive email with onboarding link
2. Click link: `https://yourapp.com/onboarding?token=abc123...`
3. Complete 3-step wizard:
   - Step 1: Confirm company name
   - Step 2: Add store locations
   - Step 3: Create admin account
4. Submit registration
5. Redirected to login page
6. Login with created credentials

## Security Best Practices

### ✅ Implemented

- Tokens hashed before storage
- Single-use tokens
- Time-limited expiration
- Email validation
- HTTPS required in production

### 🔄 Recommended Additions

1. **Rate Limiting:**

   - Limit token creation per admin (e.g., 10/hour)
   - Limit validation attempts per IP (prevent brute force)

2. **Email Service Integration:**

   - Remove token from API response (security risk)
   - Send via email service (SendGrid, AWS SES, etc.)
   - Use branded email templates

3. **Token Revocation:**

   - Add endpoint to revoke unused tokens
   - Admin UI to manage tokens

4. **Audit Logging:**

   - Log token creation (who, when)
   - Log validation attempts (IP, timestamp)
   - Log successful registrations

5. **Multi-Factor Verification:**
   - Optional: Send OTP to email before showing wizard
   - Verify phone number during registration

## Testing Checklist

### Token Generation

- [ ] Admin can create token
- [ ] Non-admin cannot create token
- [ ] Token appears in database (hashed)
- [ ] Expiry date is correct

### Token Validation

- [ ] Valid, unused token returns valid=true
- [ ] Expired token returns error
- [ ] Used token returns error
- [ ] Invalid token returns error

### Registration Flow

- [ ] Can register with valid token
- [ ] Cannot register without token
- [ ] Cannot register with expired token
- [ ] Cannot register with used token
- [ ] Email must match token email
- [ ] Token marked as used after registration
- [ ] Organization created successfully

### Edge Cases

- [ ] Concurrent registration attempts (same token)
- [ ] Token deleted before use
- [ ] Network failure during registration

## Migration Steps

### For Fresh Database

1. Run updated `server/sql/schema.sql`
2. Seeds RBAC roles
3. Ready to use!

### For Existing Database

1. **Backup database**
2. Run migration:

```sql
-- Create onboarding_tokens table
CREATE TABLE IF NOT EXISTS onboarding_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL,
  company_name text NOT NULL,
  token_hash text UNIQUE NOT NULL,
  expires_at timestamptz NOT NULL,
  used_at timestamptz,
  org_id uuid REFERENCES organizations(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
```

3. Update code
4. Restart server

## Email Template (TODO)

```html
<!DOCTYPE html>
<html>
  <head>
    <title>Welcome to PantryPal!</title>
  </head>
  <body
    style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;"
  >
    <h1 style="color: #ea580c;">Welcome to PantryPal!</h1>
    <p>You've been invited to set up your organization on PantryPal.</p>

    <p><strong>Company:</strong> {{company_name}}</p>
    <p><strong>Email:</strong> {{email}}</p>

    <p>Click the button below to complete your registration:</p>

    <a
      href="{{onboarding_link}}"
      style="display: inline-block; padding: 12px 24px; background-color: #ea580c; 
            color: white; text-decoration: none; border-radius: 6px; margin: 20px 0;"
    >
      Complete Registration
    </a>

    <p style="color: #666; font-size: 14px;">
      This link will expire in 72 hours.
    </p>

    <p style="color: #666; font-size: 12px;">
      If you didn't expect this email, please ignore it.
    </p>
  </body>
</html>
```

## Future Enhancements

1. **Payment Integration:**

   - Integrate Stripe/Razorpay
   - Create token after payment confirmation
   - Link subscription to organization

2. **Trial Management:**

   - Create org with trial status
   - Auto-expire after trial period
   - Upgrade flow

3. **Self-Service:**

   - Public sign-up form (collects email, company)
   - Admin approval workflow
   - Automated token generation on approval

4. **Analytics:**
   - Track conversion rate (tokens sent vs. registrations)
   - Average time to complete registration
   - Most common drop-off points
