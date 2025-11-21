# Email & SMS Service Setup Guide

Complete guide to configuring email and SMS services for PantryPal user invitations and notifications.

---

## 📚 Table of Contents

- [Email Setup (Gmail/Nodemailer)](#email-setup-gmailnodemailer)
- [SMS Setup (Twilio)](#sms-setup-twilio)
- [Testing Services](#testing-services)
- [Troubleshooting](#troubleshooting)
- [Alternative Providers](#alternative-providers)

---

## 📧 Email Setup (Gmail/Nodemailer)

PantryPal uses Nodemailer with Gmail SMTP for sending invitation emails.

### Prerequisites

- Gmail account
- 2-Factor Authentication enabled
- App Password generated

---

### Step 1: Enable 2-Factor Authentication

1. Go to your Google Account: https://myaccount.google.com
2. Navigate to **Security** → **2-Step Verification**
3. Click **Get Started** and follow the setup process
4. Complete 2FA setup (required for App Passwords)

---

### Step 2: Generate App Password

1. Go to **App Passwords**: https://myaccount.google.com/apppasswords
   
   *If you don't see this option, ensure 2FA is enabled*

2. Click **Select app** dropdown → Choose **Mail**

3. Click **Select device** dropdown → Choose **Other (Custom name)**

4. Enter name: `PantryPal` or `PantryPal Dev`

5. Click **Generate**

6. Copy the **16-character password** (shown like: `xxxx xxxx xxxx xxxx`)
   
   ⚠️ **Save this immediately - you won't see it again!**

---

### Step 3: Configure Environment Variables

Update your `.env` file:

```env
# Email Configuration
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@gmail.com
SMTP_PASS=xxxx xxxx xxxx xxxx    # The 16-char App Password
EMAIL_FROM=PantryPal <noreply@pantrypal.com>

# Enable email invites
ENABLE_EMAIL_INVITES=true
```

**Important Notes:**
- Use the **App Password**, NOT your regular Gmail password
- Keep spaces in the App Password or remove them (both work)
- `SMTP_SECURE=false` for port 587 (STARTTLS)
- `SMTP_SECURE=true` for port 465 (SSL/TLS)

---

### Step 4: Verify Configuration

Test email sending:

```bash
# Create a test script
npm run dev

# Or use the test invite script
npx tsx server/scripts/test-invite.ts
```

You should see:
```
✅ Email sent successfully to user@example.com
📧 Invitation link: http://localhost:5000/invite/accept?token=...
```

---

## 📱 SMS Setup (Twilio)

PantryPal uses Twilio for SMS notifications (optional feature).

### Prerequisites

- Twilio account (free trial available)
- Verified phone number

---

### Step 1: Create Twilio Account

1. Go to: https://www.twilio.com/try-twilio
2. Sign up for a **free trial account**
3. Verify your email and phone number
4. Complete the onboarding questionnaire

**Free Trial Includes:**
- $15 trial credit
- One Twilio phone number
- SMS to verified numbers only (in trial mode)

---

### Step 2: Get Account Credentials

1. Go to Twilio Console: https://console.twilio.com

2. From the **Dashboard**, copy:
   - **Account SID** (starts with `AC...`)
   - **Auth Token** (click to reveal)

3. Get a phone number:
   - Go to **Phone Numbers** → **Manage** → **Buy a number**
   - Select country and capabilities (SMS, Voice)
   - Choose a number and purchase (uses trial credit)
   - Copy the **Phone Number** (format: `+1234567890`)

---

### Step 3: Verify Recipient Numbers (Trial Mode)

In trial mode, you can only send SMS to verified numbers:

1. Go to **Phone Numbers** → **Manage** → **Verified Caller IDs**
2. Click **Add a new Caller ID**
3. Enter phone number to verify
4. Complete verification process (you'll receive a code)

⚠️ **Upgrade to paid account to send to any number**

---

### Step 4: Configure Environment Variables

Update your `.env` file:

```env
# SMS Configuration
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=your_auth_token_here
TWILIO_PHONE_NUMBER=+1234567890

# Enable SMS invites
ENABLE_SMS_INVITES=true
```

---

### Step 5: Test SMS Sending

```bash
# Start the server
npm run dev

# Test invite with phone number
# POST /api/organization/invite
# Body: { phone: "+1234567890", role: "staff" }
```

You should receive an SMS with the invitation link.

---

## 🧪 Testing Services

### Test Email Service

Create a test script:

```typescript
// scripts/test-email.ts
import { sendEmail } from '../server/services/emailService';

async function testEmail() {
  try {
    await sendEmail({
      to: 'recipient@example.com',
      subject: 'Test Email from PantryPal',
      html: '<h1>Hello!</h1><p>This is a test email.</p>',
    });
    console.log('✅ Email sent successfully');
  } catch (error) {
    console.error('❌ Email failed:', error);
  }
}

testEmail();
```

Run it:
```bash
npx tsx scripts/test-email.ts
```

---

### Test SMS Service

```typescript
// scripts/test-sms.ts
import { sendSMS } from '../server/services/smsService';

async function testSMS() {
  try {
    await sendSMS({
      to: '+1234567890',
      message: 'Test SMS from PantryPal',
    });
    console.log('✅ SMS sent successfully');
  } catch (error) {
    console.error('❌ SMS failed:', error);
  }
}

testSMS();
```

Run it:
```bash
npx tsx scripts/test-sms.ts
```

---

### Test via API

**Test Email Invite:**
```bash
curl -X POST http://localhost:5000/api/organization/invite \
  -H "Content-Type: application/json" \
  -H "Cookie: connect.sid=your-session-cookie" \
  -d '{
    "email": "newuser@example.com",
    "role": "staff"
  }'
```

**Test SMS Invite:**
```bash
curl -X POST http://localhost:5000/api/organization/invite \
  -H "Content-Type: application/json" \
  -H "Cookie: connect.sid=your-session-cookie" \
  -d '{
    "phone": "+1234567890",
    "role": "staff"
  }'
```

---

## 🔧 Troubleshooting

### Email Issues

**Problem: "Invalid login credentials"**
```
Solution: 
- Use App Password, not regular Gmail password
- Ensure 2FA is enabled
- Regenerate App Password if needed
```

**Problem: "Connection timeout"**
```
Solution:
- Check SMTP_HOST and SMTP_PORT
- Verify firewall isn't blocking port 587
- Try port 465 with SMTP_SECURE=true
```

**Problem: "Email not received"**
```
Solution:
- Check spam/junk folder
- Verify EMAIL_FROM is valid
- Check Gmail "Less secure app access" (legacy accounts)
```

**Problem: "535-5.7.8 Username and Password not accepted"**
```
Solution:
- Regenerate App Password
- Remove spaces from password in .env
- Verify SMTP_USER is correct email address
```

---

### SMS Issues

**Problem: "Authentication error"**
```
Solution:
- Verify TWILIO_ACCOUNT_SID starts with 'AC'
- Check TWILIO_AUTH_TOKEN is correct
- Regenerate Auth Token if needed
```

**Problem: "Unverified number" (Trial mode)**
```
Solution:
- Verify recipient number in Twilio console
- Or upgrade to paid account
```

**Problem: "Invalid phone number format"**
```
Solution:
- Use E.164 format: +[country code][number]
- Example: +1234567890 (US)
- Example: +919876543210 (India)
```

**Problem: "Insufficient funds"**
```
Solution:
- Check Twilio balance
- Add credit or upgrade account
```

---

### Debugging Tips

**Enable verbose logging:**
```env
LOG_LEVEL=debug
DB_LOGGING=true
```

**Check email service logs:**
```typescript
// server/services/emailService.ts should log:
console.log('📧 Sending email to:', to);
console.log('✅ Email sent:', response);
```

**Check SMS service logs:**
```typescript
// server/services/smsService.ts should log:
console.log('📱 Sending SMS to:', to);
console.log('✅ SMS sent:', message.sid);
```

**Test SMTP connection:**
```bash
# Install smtp-tester
npm install -g smtp-tester

# Test connection
telnet smtp.gmail.com 587
```

---

## 🔄 Alternative Providers

### Email Alternatives

**SendGrid:**
```env
SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587
SMTP_USER=apikey
SMTP_PASS=your-sendgrid-api-key
```

**Mailgun:**
```env
SMTP_HOST=smtp.mailgun.org
SMTP_PORT=587
SMTP_USER=postmaster@your-domain.com
SMTP_PASS=your-mailgun-api-key
```

**AWS SES:**
```env
SMTP_HOST=email-smtp.us-east-1.amazonaws.com
SMTP_PORT=587
SMTP_USER=your-ses-smtp-username
SMTP_PASS=your-ses-smtp-password
```

**Resend (Modern, developer-friendly):**
```typescript
// Would require code changes to use Resend SDK
import { Resend } from 'resend';
const resend = new Resend(process.env.RESEND_API_KEY);
```

---

### SMS Alternatives

**Vonage (formerly Nexmo):**
```typescript
// Requires SDK integration
import Vonage from '@vonage/server-sdk';
```

**AWS SNS:**
```typescript
// Requires AWS SDK integration
import { SNSClient } from "@aws-sdk/client-sns";
```

**MessageBird:**
```typescript
// Requires SDK integration
import messagebird from 'messagebird';
```

---

## 📋 Quick Setup Checklist

### Email Setup ✅
- [ ] Gmail account with 2FA enabled
- [ ] App Password generated and saved
- [ ] `.env` updated with credentials
- [ ] `ENABLE_EMAIL_INVITES=true` set
- [ ] Test email sent successfully

### SMS Setup ✅
- [ ] Twilio account created
- [ ] Account SID and Auth Token obtained
- [ ] Twilio phone number purchased
- [ ] Recipient numbers verified (if trial)
- [ ] `.env` updated with credentials
- [ ] `ENABLE_SMS_INVITES=true` set
- [ ] Test SMS sent successfully

---

## 🔒 Security Best Practices

1. **Never commit credentials**
   - Keep `.env` in `.gitignore`
   - Use environment variables in production

2. **Rotate credentials regularly**
   - Gmail: Regenerate App Passwords every 90 days
   - Twilio: Rotate Auth Tokens periodically

3. **Use different credentials per environment**
   - Dev: Personal Gmail + Trial Twilio
   - Production: Business email + Paid Twilio

4. **Rate limiting**
   - Implement rate limits for invite endpoints
   - Prevent abuse and spam

5. **Monitor usage**
   - Check Twilio usage dashboard
   - Monitor Gmail sending limits (500/day free, 2000/day workspace)

---

## 📚 Related Documentation

- [ENV_USAGE.md](../ENV_USAGE.md) - Environment file configuration
- [ENVIRONMENT.md](./ENVIRONMENT.md) - Complete environment guide
- [server/services/emailService.ts](../server/services/emailService.ts) - Email implementation
- [server/services/smsService.ts](../server/services/smsService.ts) - SMS implementation

---

## 🔗 External Resources

- [Gmail App Passwords](https://support.google.com/accounts/answer/185833)
- [Nodemailer Documentation](https://nodemailer.com/about/)
- [Twilio Console](https://console.twilio.com)
- [Twilio Node.js SDK](https://www.twilio.com/docs/libraries/node)

---

**Last Updated**: November 21, 2025
