# Neon Database Branching Guide

Complete guide to using Neon's database branching feature for PantryPal development and testing.

---

## 📚 Table of Contents

- [What is Database Branching?](#what-is-database-branching)
- [Branch Strategy](#branch-strategy)
- [Setup & Configuration](#setup--configuration)
- [Workflow Examples](#workflow-examples)
- [Best Practices](#best-practices)
- [Environment Variable Management](#environment-variable-management)

---

## 🌳 What is Database Branching?

Neon's branching feature lets you create **instant, copy-on-write clones** of your database:

- **Zero data copying** - Branches are created instantly
- **Isolated testing** - Test schema changes without affecting production
- **Automatic cleanup** - Branches can auto-delete after inactivity
- **Cost-effective** - Only pay for storage of changed data

### Use Cases

- Feature development and testing
- CI/CD pipeline testing
- Safe schema migrations
- Preview deployments
- Team member sandboxes

---

## 🎯 Branch Strategy

### Recommended Branch Structure

```
main (production)
  ├── dev (development)
  │   ├── feature/user-auth (temporary)
  │   ├── feature/inventory (temporary)
  │   └── test/ci-pipeline (auto-delete)
  └── staging (pre-production)
```

### Branch Naming Convention

```
main              # Production database
dev               # Main development branch
staging           # Pre-production testing
feature/<name>    # Feature development
test/<name>       # Testing/CI branches
hotfix/<name>     # Emergency fixes
```

---

## 🔧 Setup & Configuration

### 1. Create Branches via Neon Console

**Option A: Web UI**

1. Go to https://console.neon.tech
2. Select your project
3. Click **Branches** in sidebar
4. Click **New Branch**
5. Configure:
   - **Branch name**: `dev`
   - **Parent branch**: `main`
   - **Compute settings**: Choose size
   - **Auto-suspend**: Recommended (5 min)

**Option B: Neon CLI** (Recommended for automation)

```bash
# Install Neon CLI
npm install -g neonctl

# Login
neonctl auth

# Create branches
neonctl branches create --name dev --parent main
neonctl branches create --name staging --parent main
neonctl branches create --name feature/user-auth --parent dev
```

### 2. Get Connection Strings

Each branch has its own connection string:

```bash
# List all branches and their connection strings
neonctl connection-string --branch-id <branch-id>

# Or get from web console:
# Branches → Select Branch → Connection Details
```

### 3. Environment Variable Setup

Create environment-specific files:

```bash
# Create multiple env files
cp .env .env.development
cp .env .env.staging
cp .env .env.production
```

---

## 📋 Environment Variable Management

### Option 1: Multiple .env Files (Recommended)

**File Structure:**

```
.env.development    # Dev branch
.env.staging        # Staging branch
.env.production     # Main/production branch
.env.local          # Personal overrides (gitignored)
```

**Update package.json scripts:**

```json
{
  "scripts": {
    "dev": "cross-env NODE_ENV=development tsx server/index.ts",
    "dev:staging": "cross-env NODE_ENV=staging tsx server/index.ts",
    "start": "cross-env NODE_ENV=production node dist/index.js"
  }
}
```

**Update server/index.ts to load correct env file:**

```typescript
import dotenv from "dotenv";
import path from "path";

// Load environment-specific .env file
const envFile = `.env.${process.env.NODE_ENV || "development"}`;
dotenv.config({ path: path.resolve(process.cwd(), envFile) });

// Also load .env.local for personal overrides
dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });
```

**Example .env files:**

`.env.development`:

```env
NODE_ENV=development
DATABASE_URL=postgresql://user:pass@ep-dev-123.neon.tech/dbname?sslmode=require
APP_BASE_URL=http://localhost:5000
LOG_LEVEL=debug
```

`.env.staging`:

```env
NODE_ENV=staging
DATABASE_URL=postgresql://user:pass@ep-staging-456.neon.tech/dbname?sslmode=require
APP_BASE_URL=https://staging.pantrypal.com
LOG_LEVEL=info
```

`.env.production`:

```env
NODE_ENV=production
DATABASE_URL=postgresql://user:pass@ep-main-789.neon.tech/dbname?sslmode=require
APP_BASE_URL=https://pantrypal.com
SESSION_SECURE=true
LOG_LEVEL=warn
```

**Update .gitignore:**

```gitignore
# Environment files
.env
.env.local
.env.*.local
.env.development
.env.staging
.env.production

# Keep examples
!.env.example
!.env.*.example
```

### Option 2: Environment Variables (CI/CD)

For deployment platforms (Railway, Render, Vercel):

```bash
# Set in platform dashboard or via CLI
DATABASE_URL=postgresql://user:pass@ep-branch.neon.tech/dbname
```

---

## 🚀 Workflow Examples

### Feature Development Workflow

```bash
# 1. Create feature branch in Neon
neonctl branches create --name feature/billing --parent dev

# 2. Get connection string
neonctl connection-string --branch-id <branch-id>

# 3. Update .env.local with feature branch DB
echo "DATABASE_URL=postgresql://..." > .env.local

# 4. Run migrations
npm run db:push

# 5. Start development
npm run dev

# 6. When done, merge and delete branch
neonctl branches delete --id <branch-id>
```

### CI/CD Testing Workflow

```yaml
# .github/workflows/test.yml
name: Tests
on: [pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Create test branch in Neon
        run: |
          neonctl branches create \
            --name test/pr-${{ github.event.pull_request.number }} \
            --parent dev \
            --suspend-timeout 60

      - name: Get DB URL
        run: |
          echo "DATABASE_URL=$(neonctl connection-string)" >> $GITHUB_ENV

      - name: Run migrations
        run: npm run db:push

      - name: Run tests
        run: npm test

      - name: Cleanup
        if: always()
        run: neonctl branches delete --id $BRANCH_ID
```

### Safe Schema Migration

```bash
# 1. Create migration branch from main
neonctl branches create --name migration/add-user-roles --parent main

# 2. Apply schema changes
npm run db:push

# 3. Test thoroughly
npm run test

# 4. If successful, apply to main
# (promote branch or apply migration to main)

# 5. Delete migration branch
neonctl branches delete --id <branch-id>
```

---

## 🎨 Best Practices

### 1. Branch Lifecycle Management

```bash
# Set auto-suspend for cost savings
--suspend-timeout 300  # 5 minutes

# Set auto-delete for temporary branches
--auto-delete-after 7  # 7 days
```

### 2. Naming Conventions

- Use descriptive names: `feature/user-authentication` not `test1`
- Include ticket numbers: `feature/JIRA-123-add-billing`
- Add owner for team branches: `dev/john/experiment`

### 3. Branch Cleanup

```bash
# List all branches
neonctl branches list

# Delete old feature branches
neonctl branches delete --name feature/old-feature

# Automated cleanup script
neonctl branches list --output json | \
  jq -r '.[] | select(.created_at < "2024-01-01") | .id' | \
  xargs -I {} neonctl branches delete --id {}
```

### 4. Database Seeding

Create seed scripts for each branch type:

```typescript
// scripts/seed-dev.ts
import { db } from "../server/db";

async function seedDev() {
  // Create test users
  await db.insert(users).values([
    { email: "admin@test.com", role: "admin" },
    { email: "user@test.com", role: "user" },
  ]);

  // Create sample data
  console.log("✅ Dev database seeded");
}

seedDev();
```

```json
// package.json
{
  "scripts": {
    "db:seed:dev": "tsx scripts/seed-dev.ts",
    "db:seed:test": "tsx scripts/seed-test.ts"
  }
}
```

---

## 🔄 Integration with Git Workflow

### Mapping Git Branches to DB Branches

```
Git Branch          →  Neon Branch
main               →  main (production)
develop            →  dev
feature/user-auth  →  feature/user-auth
```

### Automated Branch Creation

Create a script to sync Git and Neon branches:

```bash
#!/bin/bash
# scripts/create-feature-branch.sh

FEATURE_NAME=$1
GIT_BRANCH="feature/$FEATURE_NAME"
NEON_BRANCH="feature/$FEATURE_NAME"

# Create Git branch
git checkout -b $GIT_BRANCH

# Create Neon branch
neonctl branches create --name $NEON_BRANCH --parent dev

# Get connection string
DB_URL=$(neonctl connection-string --branch-id $(neonctl branches list --output json | jq -r ".[] | select(.name==\"$NEON_BRANCH\") | .id"))

# Update .env.local
echo "DATABASE_URL=$DB_URL" > .env.local

echo "✅ Created feature branch: $FEATURE_NAME"
echo "📁 Git branch: $GIT_BRANCH"
echo "🗄️  DB branch: $NEON_BRANCH"
```

Usage:

```bash
chmod +x scripts/create-feature-branch.sh
./scripts/create-feature-branch.sh user-authentication
```

---

## 📊 Monitoring & Costs

### Branch Metrics

```bash
# View branch details
neonctl branches get --id <branch-id>

# Monitor storage usage
neonctl branches list --output json | jq '.[] | {name, storage_size}'
```

### Cost Optimization

- **Auto-suspend**: Branches auto-suspend after inactivity (saves compute)
- **Auto-delete**: Set temporary branches to auto-delete
- **Shared storage**: Branches share unchanged data (copy-on-write)
- **Monitor usage**: Use Neon console to track storage and compute

---

## 🛠️ Troubleshooting

### Common Issues

**1. "Cannot connect to branch database"**

```bash
# Verify branch exists
neonctl branches list

# Check connection string format
# Should include: ?sslmode=require
```

**2. "Branch not found"**

```bash
# Get correct branch ID
neonctl branches list --output json | jq '.[] | {id, name}'
```

**3. "Migration fails on branch"**

```bash
# Ensure branch is up to date with parent
neonctl branches reset --id <branch-id>

# Or recreate branch
neonctl branches delete --id <branch-id>
neonctl branches create --name <name> --parent main
```

---

## 📚 Additional Resources

- [Neon Branching Docs](https://neon.tech/docs/introduction/branching)
- [Neon CLI Reference](https://neon.tech/docs/reference/cli-reference)
- [Neon API Docs](https://api-docs.neon.tech/reference/getting-started-with-neon-api)

---

## 🔗 Related Documentation

- [NEON_MIGRATION.md](./NEON_MIGRATION.md) - Initial Neon setup
- [ENVIRONMENT.md](./ENVIRONMENT.md) - Environment configuration
- [ENV_USAGE.md](../ENV_USAGE.md) - Environment file usage

---

**Last Updated**: November 21, 2025
