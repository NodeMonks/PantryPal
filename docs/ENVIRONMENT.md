# Environment Configuration Guide

Complete guide to environment variable management for PantryPal following industry-standard practices.

---

## Table of Contents

- [Standard Environment Structure](#standard-environment-structure)
- [File Hierarchy & Loading Order](#file-hierarchy--loading-order)
- [Environment-Specific Files](#environment-specific-files)
- [Variable Validation](#variable-validation)
- [Security Best Practices](#security-best-practices)
- [Docker & Kubernetes](#docker--kubernetes)
- [Secret Management](#secret-management)
- [Troubleshooting](#troubleshooting)

---

## Standard Environment Structure

PantryPal follows industry-standard environment variable practices:

```
.env                    # Default environment (gitignored)
.env.local              # Local overrides (gitignored, highest priority)
.env.development        # Development settings (gitignored)
.env.production         # Production settings (gitignored)
.env.test               # Test environment (gitignored)
.env.example            # Template (committed to git)
```

### Additional Templates

```
.env.local.example      # Local overrides template
.env.development.example # Development template
.env.production.example  # Production template
.env.test.example       # Test template
.env.docker.example     # Docker template
.env.k8s.example        # Kubernetes template
```

### What Gets Committed?

✅ **Commit:**

- `.env.example`
- `.env.*.example`
- `env-examples/` folder

❌ **Never commit:**

- `.env`
- `.env.local`
- `.env.*.local`
- `.env.development`
- `.env.production`
- `.env.test`

---

## File Hierarchy & Loading Order

Environment files are loaded in this order (later files override earlier ones):

1. `.env` - Base configuration
2. `.env.$(NODE_ENV)` - Environment-specific
3. `.env.local` - Local overrides (not loaded in test)
4. `.env.$(NODE_ENV).local` - Environment + local

**Example in development:**

```
.env → .env.development → .env.local → .env.development.local
```

---

## Environment-Specific Files

### Development

```bash
NODE_ENV=development
LOG_LEVEL=debug
DB_LOGGING=true
RATE_LIMIT_MAX_REQUESTS=1000
```

**Features:** Verbose logging, hot reload, relaxed security

### Production

```bash
NODE_ENV=production
SESSION_SECURE=true
HELMET_ENABLED=true
RATE_LIMIT_MAX_REQUESTS=50
LOG_LEVEL=info
```

**Features:** Strict security, HTTPS enforced, minimal logging

### Test

```bash
NODE_ENV=test
PORT=5001
EMAIL_ENABLED=false
SMS_ENABLED=false
SILENT_LOGS=true
```

**Features:** Isolated database, mock services, fast execution

---

## Variable Validation

PantryPal uses **Zod** for runtime validation in `server/config/env.ts`.

```typescript
import { env } from "./config/env";

// Type-safe and validated
console.log(env.DATABASE_URL); // ✅ TypeScript autocomplete
console.log(env.PORT); // ✅ Type: number
```

### Validation Features

- Type coercion (string → number/boolean)
- Required field checks
- Format validation (URLs, emails, phones)
- Conditional requirements
- Production security enforcement

### Example Error

```bash
❌ Environment variable validation failed:
  • SESSION_SECRET: Must be at least 32 characters
  • DATABASE_URL: Invalid url
```

---

## Security Best Practices

### Generate Secure Secrets

```bash
# 32-byte secret (development)
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# 64-byte secret (production)
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

### Security Checklist

**Production:**

- [ ] Use 64+ character secrets
- [ ] Rotate secrets every 90 days
- [ ] Enable `SESSION_SECURE=true`
- [ ] Restrict `CORS_ORIGINS`
- [ ] Use secret managers
- [ ] Enable `HELMET_ENABLED=true`
- [ ] Set `LOG_LEVEL=info`
- [ ] Disable `DB_LOGGING`

### .gitignore Configuration

```gitignore
.env
.env.local
.env.*.local
.env.development
.env.production
.env.test

# Keep templates
!.env.example
!.env.*.example
!env-examples/*.example
```

---

## Docker & Kubernetes

### Docker

```bash
# Option 1: Use .env.docker
cp .env.docker.example .env
docker-compose up

# Option 2: Build arguments
docker build --build-arg DATABASE_URL=$DATABASE_URL -t pantrypal .

# Option 3: Env file
docker run --env-file .env.docker pantrypal
```

### Kubernetes

**ConfigMap (non-sensitive):**

```bash
kubectl create configmap pantrypal-config --from-env-file=.env.k8s
```

**Secrets (sensitive):**

```bash
kubectl create secret generic pantrypal-secrets \
  --from-literal=DATABASE_URL='postgresql://...' \
  --from-literal=SESSION_SECRET='...'
```

**Deployment:**

```yaml
spec:
  containers:
    - name: app
      envFrom:
        - configMapRef:
            name: pantrypal-config
      env:
        - name: DATABASE_URL
          valueFrom:
            secretKeyRef:
              name: pantrypal-secrets
              key: DATABASE_URL
```

---

## Secret Management

### Recommended Tools

**AWS Secrets Manager:**

```bash
aws secretsmanager create-secret \
  --name pantrypal/production/database-url \
  --secret-string "postgresql://..."
```

**HashiCorp Vault:**

```bash
vault kv put secret/pantrypal/production \
  database_url="postgresql://..." \
  session_secret="..."
```

**Doppler (Recommended):**

```bash
doppler login
doppler setup
doppler run -- npm start
```

---

## Troubleshooting

### Common Issues

**1. Validation Fails**

```bash
# Generate strong secret
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

**2. Database Connection Refused**

```bash
# Verify format
DATABASE_URL=postgresql://user:password@host:port/database
psql $DATABASE_URL
```

**3. Email Not Sending**

```bash
# Use Gmail App Password
# Get from: https://myaccount.google.com/apppasswords
```

**4. CORS Errors**

```bash
# Update CORS_ORIGINS
CORS_ORIGINS=https://app.example.com,https://www.example.com
```

### Debug Commands

```bash
# Print env vars
node -e "console.log(process.env)"

# Check specific variable
echo $DATABASE_URL

# Test loading
node -r dotenv/config -e "console.log(process.env.DATABASE_URL)"
```

---

## Quick Reference

### Setup

```bash
cp .env.example .env
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
nano .env
npm run check
```

### Priority Order

```
CLI > .env.$(NODE_ENV).local > .env.local > .env.$(NODE_ENV) > .env > defaults
```

---

## Related Documentation

- [Setup Guide](../SETUP.md)
- [Architecture](../ARCHITECTURE.md)
- [Security](./security.md)
- [Deployment](./deployment.md)

---

**🔒 Security Reminder**: Never commit `.env` files with real secrets!
