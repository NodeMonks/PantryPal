# Deployment Guide

## Pre-Deployment Status

**System Status:** ✅ Production Ready

- Test Suite: 89 passing | 27 skipped | 0 failed
- Build: Succeeds with no errors
- Frontend: No runtime errors
- Database: Neon serverless with transaction support
- Authentication: Fixed and verified

## Deployment Steps

### Step 1: Merge Testing Branch to Main

```bash
# Switch to main branch
git checkout main

# Merge testing branch
git merge testing

# Push to trigger CI/CD
git push origin main
```

### Step 2: Monitor CI/CD Pipeline

GitHub Actions will automatically:

1. **Run Tests** (89 tests pass)
2. **Build** (npm run build)
3. **Build Docker Image** (tagged with commit SHA and latest)
4. **Push to Docker Hub** (vansht24/pantrypal)
5. **Trigger Render Deployment** (via webhook)

**Track Progress:**

- Go to GitHub → Actions tab
- Monitor `build-and-deploy` workflow
- Expected duration: ~10-15 minutes

### Step 3: Verify Deployment

After CI/CD completes:

1. **Check GitHub Actions Logs**

   - All tests should pass (89/89)
   - Docker build should succeed
   - Render webhook should trigger

2. **Verify Docker Hub**

   - New image pushed to vansht24/pantrypal
   - Tags: latest + commit SHA

3. **Verify Render Deployment**

   - Render dashboard shows new deployment
   - No deployment errors in logs
   - Service status: Active/Running

4. **Test Production App**
   - Navigate to production URL
   - Test login flow
   - Verify QR code generation/storage
   - Check bill creation and finalization

## Rollback Procedure

If issues arise during deployment:

```bash
# Revert the merge commit
git revert -m 1 HEAD

# Push to trigger rollback
git push origin main

# Render will redeploy from previous stable state
```

## Monitoring Commands

### Check Render Deployment Status

```bash
# View Render logs (requires Render account)
# Go to: Render Dashboard → PantryPal → Logs
```

### Monitor Application Health

- Check error rates in production logs
- Monitor database connection pool
- Verify multi-tenant isolation
- Check response times

## Post-Deployment Verification

See [POST_DEPLOYMENT_CHECKLIST.md](POST_DEPLOYMENT_CHECKLIST.md) for complete verification steps.

## Key Configuration Files

**CI/CD Pipeline:** `.github/workflows/deploy.yml`

- Triggers on: push to main
- Environment: Node 20.19 LTS
- Docker registry: Docker Hub

**Render Configuration:**

- Service type: Web
- Build command: `npm install && npm run build`
- Start command: `npm start`
- Environment: Production

**Database:**

- Provider: Neon (serverless PostgreSQL)
- Connection: Pool with transaction support
- Migrations: Drizzle ORM managed

## Troubleshooting

### Tests Fail in CI/CD

- Check GitHub Actions logs for specific failure
- Run locally: `npm test`
- Fix issue and push to testing branch for re-testing

### Docker Build Fails

- Verify Node 20.19 compatibility
- Check npm dependencies install locally
- Review Dockerfile for syntax errors

### Render Deployment Fails

- Check Render logs for error details
- Verify environment variables set correctly
- Check database connection string validity

### Application Won't Start

- Check application logs in Render
- Verify database migrations applied
- Check port configuration (default: 3000)

## Success Indicators

✅ **Deployment Complete When:**

- GitHub Actions workflow shows all steps passed
- Docker image successfully pushed to Docker Hub
- Render shows "Active" status
- Production app loads without errors
- Login/QR code features working correctly
- Database queries executing (multi-tenant isolation verified)

## Support

For deployment issues, check:

1. GitHub Actions logs: `.github/workflows/deploy.yml` execution
2. Render logs: Render Dashboard → Logs
3. Docker Hub: Verify image pushed successfully
4. Database: Check Neon console for connection/query issues
