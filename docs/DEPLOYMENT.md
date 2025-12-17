# Production Deployment Guide

## GitHub Secrets Setup

### Required Secrets

Add these in: `GitHub Repo → Settings → Secrets and variables → Actions → New repository secret`

```
DATABASE_URL=postgresql://user:pass@host/db?sslmode=require
SESSION_SECRET=<generate with: node -e "console.log(require('crypto').randomBytes(64).toString('hex'))">
JWT_ACCESS_SECRET=<generate with: node -e "console.log(require('crypto').randomBytes(64).toString('hex'))">
JWT_REFRESH_SECRET=<generate with: node -e "console.log(require('crypto').randomBytes(64).toString('hex'))">
DOCKER_USERNAME=shubh2047
DOCKER_TOKEN=<Docker Hub access token>
RENDER_DEPLOY_HOOK=<Optional: Render deploy webhook URL>
```

### Optional Secrets (if using email/SMS)

```
TWILIO_ACCOUNT_SID=<your twilio SID>
TWILIO_AUTH_TOKEN=<your twilio token>
TWILIO_PHONE_NUMBER=<your twilio number>
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=<your email>
SMTP_PASS=<app password>
```

## Hosting Recommendations

### Option 1: Render.com (Recommended)

**Cost**: $7/month + $0-19/month DB = **$7-26/month**

1. Connect GitHub repo
2. Create Web Service
3. Environment: Docker
4. Add environment variables from secrets
5. Auto-deploy on push to main

**Setup**:

```bash
# Generate secrets locally
node -e "console.log('SESSION_SECRET=' + require('crypto').randomBytes(64).toString('hex'))"
node -e "console.log('JWT_ACCESS_SECRET=' + require('crypto').randomBytes(64).toString('hex'))"
node -e "console.log('JWT_REFRESH_SECRET=' + require('crypto').randomBytes(64).toString('hex'))"

# Add to Render dashboard → Environment
DATABASE_URL=<your Neon connection string>
SESSION_SECRET=<generated above>
NODE_ENV=production
HOST=0.0.0.0
PORT=5000
```

### Option 2: Railway.app

**Cost**: $10-15/month

```bash
railway login
railway init
railway link
railway up
```

### Option 3: Fly.io

**Cost**: $5-10/month

```bash
flyctl launch
flyctl secrets set DATABASE_URL=<value>
flyctl secrets set SESSION_SECRET=<value>
flyctl deploy
```

## Load Testing for 10-15 Stores

### Expected Traffic

- 10-15 stores × 5-10 users/store = 50-150 concurrent users
- Peak: ~500 requests/minute
- Database: ~100 MB - 1 GB data

### Resource Requirements

- **RAM**: 512 MB minimum, 1 GB recommended
- **CPU**: Shared/0.5 vCPU sufficient
- **Database**: 0.5-1 GB (Neon free tier covers this)
- **Bandwidth**: 10-20 GB/month

### Stress Test Command

```bash
# Install k6
npm install -g k6

# Test with 100 virtual users for 5 minutes
k6 run --vus 100 --duration 5m tests/load/stress.js
```

## Security Best Practices

1. **Never commit secrets to git**

   - Use `.env.example` templates only
   - Add `.env*` to `.gitignore`

2. **Rotate secrets quarterly**

   ```bash
   # Generate new secrets
   node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
   # Update in GitHub Secrets + hosting platform
   ```

3. **Enable rate limiting** (already in code)

   - 100 requests/15min per IP for auth endpoints

4. **Database backups**
   - Neon: Auto daily backups
   - Render: Enable backups in dashboard

## Monitoring

### Free Tools

- **Uptime**: UptimeRobot (free 50 monitors)
- **Logs**: Built-in platform logs
- **Errors**: Console logs + email alerts

### Paid Tools (Optional)

- Sentry ($26/month) - Error tracking
- New Relic ($0-99/month) - APM
- LogDNA ($30/month) - Log aggregation

## CI/CD Pipeline

The workflow automatically:

1. Runs tests on push to main
2. Builds Docker image
3. Pushes to Docker Hub
4. Triggers deploy webhook (if configured)

**Manual deploy**:

```powershell
# Build + push
npm run docker:publish

# Deploy on Render
# Trigger: Render Dashboard → Manual Deploy
```

## Cost Breakdown (Monthly)

| Service                | Free Tier               | Paid                  |
| ---------------------- | ----------------------- | --------------------- |
| **Render Web Service** | $0 (sleeps after 15min) | $7-12                 |
| **Neon PostgreSQL**    | 0.5GB free              | $19 (3GB)             |
| **Docker Hub**         | 1 private repo          | $5 (unlimited)        |
| **GitHub Actions**     | 2000 min/month          | Free for public repos |
| **Total Estimate**     | **$0**                  | **$7-31/month**       |

## Quick Start Commands

```powershell
# 1. Set up GitHub secrets (do once)
# Go to: https://github.com/Creat1ve-shubh/PantryPal/settings/secrets/actions

# 2. Generate secrets
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"

# 3. Push to main (triggers deploy)
git push origin main

# 4. Monitor logs
# Render: Dashboard → Logs
# Railway: railway logs
# Fly.io: flyctl logs
```
