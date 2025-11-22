# Admin Onboarding Invitations UI - Implementation Complete

## What Was Built

### 1. Onboarding Invites Page (`/onboarding-invites`)

A comprehensive admin-only page for managing onboarding tokens with two main sections:

#### Section A: Token Generation Form

- **Email Input** - Client's email address (required)
- **Company Name Input** - Pre-fill company name (required)
- **Expires In** - Token validity period in hours (default: 72 hours)
- **Generate Button** - Creates secure onboarding token

#### Section B: Generated Link Display

- Shows token details after generation:
  - Company name
  - Email address
  - Expiration date/time
  - Full onboarding link
- **Copy to Clipboard** - One-click copy button
- **Security Warning** - Reminds admin to send link securely

#### Section C: All Invitations Table

- Lists all created onboarding tokens
- Columns:
  - **Status Badge** - Pending (orange), Used (green), Expired (gray)
  - **Company** - Organization name
  - **Email** - Client email
  - **Created** - When token was generated
  - **Expires** - Token expiration time
- Sorted by creation date (newest first)
- Real-time status calculation

## How to Use

### For Admins (Generating Invites)

1. **Navigate to Onboarding Invites**

   - Click "Onboarding Invites" in sidebar (admin-only menu item)
   - Direct URL: `/onboarding-invites`

2. **Create New Invitation**

   - Enter client's email address
   - Enter company name
   - (Optional) Adjust expiration hours
   - Click "Generate Invitation Link"

3. **Share the Link**

   - Copy the generated onboarding link
   - Send via secure channel (email, SMS, etc.)
   - Link format: `https://yourapp.com/onboarding?token=abc123...`

4. **Track Invitations**
   - View all sent invitations in the table
   - Monitor status (Pending/Used/Expired)
   - See who has completed registration

### For Clients (Using Invites)

1. **Receive Email** - Client gets email with onboarding link
2. **Click Link** - Opens `/onboarding?token=abc123...`
3. **Validate Token** - System validates token before showing wizard
4. **Complete Registration** - 3-step wizard with prefilled data
5. **Token Marked Used** - After successful registration

## Technical Details

### API Endpoints Used

#### GET `/api/auth/onboarding-tokens`

- **Auth:** Required (Admin only)
- **Returns:** Array of all onboarding tokens
- **Used by:** Token list table

#### POST `/api/auth/create-onboarding-token`

- **Auth:** Required (Admin only)
- **Body:** `{ email, company_name, expires_in_hours }`
- **Returns:** Token details and onboarding link
- **Used by:** Token generation form

### Security Features

✅ **Admin-Only Access** - Protected route, requires admin role  
✅ **Token Hashing** - Tokens hashed before storage (SHA-256)  
✅ **Single-Use** - Tokens can only be used once  
✅ **Time-Limited** - Automatic expiration after specified hours  
✅ **Email Validation** - Registration email must match token email  
✅ **Status Tracking** - Real-time status calculation (pending/used/expired)

### UI Components

- **Card** - Container for form sections
- **Input** - Text fields with icon prefixes
- **Button** - Primary and outline variants
- **Badge** - Status indicators with icons
- **Alert** - Success messages and warnings
- **Table** - Responsive token list

### State Management

- **React Query** - Server state for tokens list
- **useMutation** - Token creation with optimistic updates
- **useState** - Local form state
- **useAuth** - User role checking

## File Changes

### New Files

```
client/src/pages/OnboardingInvites.tsx (344 lines)
docs/ONBOARDING_TOKEN_SYSTEM.md (comprehensive docs)
```

### Modified Files

```
server/authRoutes.ts
  - Added GET /api/auth/onboarding-tokens endpoint
  - Imported onboarding_tokens table
  - Added desc ordering function

client/src/App.tsx
  - Imported OnboardingInvites component
  - Added /onboarding-invites route (admin-only)

client/src/components/layout/AppSidebar.tsx
  - Imported Mail icon
  - Added "Onboarding Invites" menu item (adminOnly: true)
```

## Next Steps

### 1. Email Service Integration (High Priority)

Currently, the token is returned in the API response. For production:

```typescript
// Remove token from response
res.status(201).json({
  message: "Invitation sent successfully",
  expires_at: expiresAt,
  email: validated.email,
  company_name: validated.company_name,
  // token: token, ← REMOVE THIS
});

// Send via email service
await emailService.sendOnboardingInvite({
  to: validated.email,
  company_name: validated.company_name,
  onboarding_link: `${baseUrl}/onboarding?token=${token}`,
  expires_at: expiresAt,
});
```

**Recommended Services:**

- [SendGrid](https://sendgrid.com/) - Free tier: 100 emails/day
- [AWS SES](https://aws.amazon.com/ses/) - $0.10 per 1000 emails
- [Resend](https://resend.com/) - Modern API, 3000 emails/month free
- [Mailgun](https://www.mailgun.com/) - Free tier: 5000 emails/month

### 2. Email Template

Create branded HTML template in `server/templates/onboarding-invite.html`:

```html
<!DOCTYPE html>
<html>
  <head>
    <title>Welcome to PantryPal!</title>
  </head>
  <body
    style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;"
  >
    <div style="text-align: center; margin-bottom: 30px;">
      <img src="{{logo_url}}" alt="PantryPal" style="width: 120px;" />
    </div>

    <h1 style="color: #ea580c;">Welcome to PantryPal!</h1>

    <p>
      You've been invited to set up your organization on PantryPal, the smart
      grocery management system.
    </p>

    <div
      style="background: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;"
    >
      <p style="margin: 5px 0;"><strong>Company:</strong> {{company_name}}</p>
      <p style="margin: 5px 0;"><strong>Email:</strong> {{email}}</p>
    </div>

    <p>Click the button below to complete your registration:</p>

    <div style="text-align: center; margin: 30px 0;">
      <a
        href="{{onboarding_link}}"
        style="display: inline-block; padding: 14px 32px; background-color: #ea580c; 
              color: white; text-decoration: none; border-radius: 6px; font-weight: bold;"
      >
        Complete Registration
      </a>
    </div>

    <p style="color: #666; font-size: 14px;">
      This invitation link will expire on <strong>{{expiry_date}}</strong>.
    </p>

    <hr style="border: 0; border-top: 1px solid #ddd; margin: 30px 0;" />

    <p style="color: #999; font-size: 12px;">
      If you didn't expect this email, please ignore it. This invitation is only
      valid for {{email}}.
    </p>

    <p style="color: #999; font-size: 12px;">
      © 2025 PantryPal. All rights reserved.
    </p>
  </body>
</html>
```

### 3. Payment Integration (Future)

Connect with payment gateway before token generation:

```typescript
// Example flow
app.post("/api/payments/checkout", async (req, res) => {
  const { email, company_name, plan } = req.body;

  // Create Stripe checkout session
  const session = await stripe.checkout.sessions.create({
    customer_email: email,
    metadata: { company_name },
    line_items: [{ price: plan.priceId, quantity: 1 }],
    mode: "subscription",
    success_url: `${baseUrl}/payment/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${baseUrl}/pricing`,
  });

  res.json({ checkout_url: session.url });
});

app.get("/api/payments/success", async (req, res) => {
  const session = await stripe.checkout.sessions.retrieve(req.query.session_id);

  if (session.payment_status === "paid") {
    // Create onboarding token
    const { token, expiresAt } = await createOnboardingToken(
      session.customer_email,
      session.metadata.company_name,
      72
    );

    // Send onboarding email
    await emailService.sendOnboardingInvite({...});

    res.redirect("/payment/confirmed");
  }
});
```

### 4. Token Revocation

Add ability to revoke unused tokens:

```typescript
// Backend
app.delete(
  "/api/auth/onboarding-tokens/:id",
  isAuthenticated,
  hasRole("admin"),
  async (req, res) => {
    await db
      .delete(onboarding_tokens)
      .where(eq(onboarding_tokens.id, req.params.id));
    res.json({ message: "Token revoked" });
  }
);

// Frontend - Add delete button in table
<Button variant="destructive" size="sm" onClick={() => revokeToken(token.id)}>
  Revoke
</Button>;
```

### 5. Rate Limiting

Prevent abuse by limiting token generation:

```typescript
import rateLimit from "express-rate-limit";

const tokenCreationLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10, // 10 tokens per hour per admin
  message: "Too many tokens created, please try again later",
});

app.post(
  "/api/auth/create-onboarding-token",
  isAuthenticated,
  hasRole("admin"),
  tokenCreationLimiter, // Add rate limiter
  async (req, res) => {
    // ...
  }
);
```

### 6. Analytics Dashboard

Track onboarding metrics:

- Tokens sent vs. registrations completed
- Average time from token creation to registration
- Most common expiration causes
- Drop-off points in registration wizard

```typescript
interface OnboardingMetrics {
  total_sent: number;
  total_used: number;
  total_expired: number;
  conversion_rate: number; // used / sent
  avg_completion_time_hours: number;
  active_organizations: number;
}
```

## Testing Checklist

### Admin Actions

- [ ] Navigate to /onboarding-invites
- [ ] Page only accessible to admin role
- [ ] Generate token with valid data
- [ ] Copy link to clipboard works
- [ ] See token in "All Invitations" table
- [ ] Status shows "Pending" initially

### Client Actions

- [ ] Open link with token
- [ ] Token validates successfully
- [ ] Email and company name prefilled
- [ ] Complete registration
- [ ] After registration, status shows "Used"

### Edge Cases

- [ ] Non-admin cannot access page (redirected)
- [ ] Invalid token shows error
- [ ] Expired token shows error
- [ ] Used token cannot be reused
- [ ] Email mismatch rejected during registration

## Production Deployment Checklist

Before going live:

1. **Remove Token from API Response**

   - Comment out `token: token` in create endpoint
   - Only send via email service

2. **Setup Email Service**

   - Choose provider (SendGrid, AWS SES, etc.)
   - Configure API keys in environment variables
   - Test email delivery

3. **Configure HTTPS**

   - Ensure SSL/TLS certificate installed
   - Update `req.protocol` check to enforce HTTPS

4. **Rate Limiting**

   - Add express-rate-limit
   - Set appropriate limits for your use case

5. **Monitoring**

   - Setup error tracking (Sentry, LogRocket)
   - Monitor token usage metrics
   - Alert on failed email deliveries

6. **Database Migration**
   - Ensure `onboarding_tokens` table exists
   - Run migration script if needed

## Summary

✅ **Admin UI Complete** - Full-featured onboarding invites management  
✅ **Token Generation** - Secure, time-limited, single-use tokens  
✅ **Status Tracking** - Real-time pending/used/expired badges  
✅ **Sidebar Integration** - Admin-only menu item  
✅ **Protected Routes** - Role-based access control  
✅ **Build Successful** - No TypeScript errors

🔄 **Next Priority**: Email service integration (remove token from API response)  
🔄 **Future Enhancement**: Payment gateway integration before token creation

The onboarding system is now production-ready pending email service integration!
