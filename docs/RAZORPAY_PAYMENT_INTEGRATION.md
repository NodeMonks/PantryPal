# Razorpay Payment + Registration Integration Guide

## Overview

PantryPal now integrates Razorpay for India-first SaaS subscription payments and admin-only organization registration with GST/MSME compliance.

## Workflow

### 1. Payment Subscription (`/subscribe`)

Users select a plan and proceed to Razorpay Checkout:

```
User selects plan → GET /api/payments/create-subscription
→ Razorpay Checkout opens → Payment completed
→ POST /api/payments/verify (HMAC verified)
→ Onboarding token issued → Redirect to registration
```

### 2. Organization Registration (`/org/register?token=...`)

Admin registers organization with GST/MSME details:

**Form Steps:**
1. Organization name
2. Stores (locations)
3. **GST & Vendor Details** (NEW):
   - GST Number (optional, 15-char validation)
   - Owner name, email, phone
   - MSME number
   - Business address, city, state, PIN
4. Admin account creation

**Backend (`POST /api/auth/register-organization`):**
- Validates onboarding token (if provided)
- Persists org with vendor details in `organizations` table
- Sets `kyc_status = pending` (requires admin verification later)
- Creates first admin user

### 3. Bill Printing with Vendor Details

When a bill is finalized, it should include vendor GST number and details from the organization record.

**Example Bill Header:**

```
=====================================
        SELLER INVOICE
=====================================
Vendor: Bright Retail Group
GST No.: 18AABCT1234A1Z5
Owner: Ram Kumar
Phone: +91-9876543210
City: Mumbai, MH 400001
=====================================
```

**Implementation in bill printing endpoint:**

```typescript
// GET /api/bills/:billId/print (or similar)
const bill = await billRepository.findById(billId, orgId);
const org = await db.select().from(organizations).where(eq(organizations.id, orgId));

// Include in bill template:
{
  vendorName: org.name,
  vendorGST: org.gst_number,
  vendorOwner: org.owner_name,
  vendorPhone: org.owner_phone,
  vendorCity: org.business_city,
  vendorState: org.business_state,
  vendorPin: org.business_pin,
}
```

## Environment Variables

Set in `.env` for production Razorpay integration:

```bash
# Razorpay
RAZORPAY_KEY_ID=rzp_live_xxxxxxxxxxxxx
RAZORPAY_KEY_SECRET=xxxxxxxxxxxxx
RAZORPAY_WEBHOOK_SECRET=whsec_xxxxxxxxxxxxx
SUBSCRIPTION_DEFAULT_PLAN=starter-monthly
```

## Schema Updates

### Organizations Table (New Fields)

```sql
ALTER TABLE organizations ADD COLUMN gst_number TEXT;
ALTER TABLE organizations ADD COLUMN owner_name TEXT;
ALTER TABLE organizations ADD COLUMN owner_phone TEXT;
ALTER TABLE organizations ADD COLUMN owner_email TEXT;
ALTER TABLE organizations ADD COLUMN msme_number TEXT;
ALTER TABLE organizations ADD COLUMN business_address TEXT;
ALTER TABLE organizations ADD COLUMN business_city TEXT;
ALTER TABLE organizations ADD COLUMN business_state TEXT;
ALTER TABLE organizations ADD COLUMN business_pin TEXT;
ALTER TABLE organizations ADD COLUMN kyc_status TEXT DEFAULT 'pending';
ALTER TABLE organizations ADD COLUMN verified_at TIMESTAMP;
ALTER TABLE organizations ADD COLUMN verified_by INTEGER REFERENCES users(id);
ALTER TABLE organizations ADD COLUMN verification_notes TEXT;
ALTER TABLE organizations ADD COLUMN payment_status TEXT DEFAULT 'pending';
ALTER TABLE organizations ADD COLUMN subscription_id TEXT;
ALTER TABLE organizations ADD COLUMN plan_name TEXT DEFAULT 'starter';
```

## Testing

### 1. Local Payment Testing

- Use [Razorpay Test Mode](https://dashboard.razorpay.com/app/razorpay-x) credentials
- Test card: `4111 1111 1111 1111`
- Test subscription creates mock subscription ID

### 2. Webhook Testing

```bash
# Simulate Razorpay webhook
curl -X POST http://localhost:5000/api/payments/webhook \
  -H "Content-Type: application/json" \
  -H "X-Razorpay-Signature: <hmac_sha256_signature>" \
  -d '{
    "event": "subscription.activated",
    "payload": { "subscription": { "entity": { "id": "sub_123" } } }
  }'
```

## Soft-Blocking Until Verified

After registration:
- Org is created with `kyc_status = pending`
- Users can use platform normally (soft-block = UX hints, not hard blocks)
- Admin can upload GST/MSME documents for verification
- Once verified, `kyc_status = verified` and `verified_at` timestamp set

UI Component (future):

```tsx
{org.kyc_status === 'pending' && (
  <Alert variant="info">
    <AlertCircle />
    <AlertDescription>
      Your organization is pending verification. 
      <Link>Upload documents</Link> to unlock premium features.
    </AlertDescription>
  </Alert>
)}
```

## Security Considerations

1. **HMAC Verification:** All Razorpay signatures verified server-side
2. **Token Expiry:** Onboarding tokens expire after 15 min (JWT default)
3. **Multi-Tenant:** Org data scoped by `org_id` on all queries
4. **Admin-Only:** Only admin users can create organizations (enforced at endpoint)

## Next Steps

1. **Stripe Alternative** (if needed): Replace Razorpay calls with Stripe API
2. **Document Upload:** Add endpoint to upload GST/MSME PDFs and store URLs
3. **KYC Webhook:** Handle async verification workflow (manual or automated)
4. **Billing Portal:** Render bills with vendor details (PDF/HTML generation)
5. **Recurring Billing:** Implement subscription renewal logic in webhook handler

## References

- [Razorpay Subscriptions API](https://razorpay.com/docs/api/subscriptions/)
- [Razorpay Webhook Events](https://razorpay.com/docs/webhooks/)
- [India GST Number Format](https://cleartax.in/s/gst-number)
- [MSME Registration](https://udyamregistration.gov.in/)
