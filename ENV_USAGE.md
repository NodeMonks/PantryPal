# Environment Files Usage Guide

## 📁 Environment Files Overview

PantryPal uses a single `.env` file at the root, with `NODE_ENV` determining the environment mode.

```
.env              # Main environment file (gitignored)
.env.example      # Template with all variables (committed to git)
```

---

## 🔧 NPM Scripts & Environment Usage

### **Development Commands**

```bash
npm run dev
```

- **Uses**: `.env` file
- **NODE_ENV**: `development` (set by cross-env)
- **Features**: Hot reload, verbose logging, relaxed security
- **Port**: 5000 (default)
- **Database**: Uses DATABASE_URL from `.env`

### **Production Build**

```bash
npm run build
```

- **Uses**: `.env` file
- **NODE_ENV**: Current environment
- **Output**: `dist/` folder with compiled code

### **Production Start**

```bash
npm start
```

- **Uses**: `.env` file
- **NODE_ENV**: `production` (set by cross-env)
- **Features**: Strict security, HTTPS enforcement, minimal logging
- **Database**: Uses DATABASE_URL from `.env` (should be production DB)

### **Database Operations**

```bash
npm run db:push
```

- **Uses**: `.env` file
- **Applies**: Drizzle schema to DATABASE_URL
- **⚠️ Warning**: Make sure DATABASE_URL points to correct database!

---

## 🐳 Docker Commands & Environment

### **Docker Development**

```bash
npm run docker:dev
# OR
docker-compose -f docker-compose.yml -f docker-compose.dev.yml up
```

- **Uses**: `.env` file (loaded by docker-compose)
- **NODE_ENV**: Set in docker-compose.dev.yml
- **Database**: Uses service defined in docker-compose.yml

### **Docker Production**

```bash
npm run docker:up
# OR
docker-compose up
```

- **Uses**: `.env` file
- **NODE_ENV**: `production` (from docker-compose.yml)
- **Database**: PostgreSQL service in docker-compose

---

## 🎯 How Environment Loading Works

### **1. dotenv Loading (server/index.ts)**

```typescript
import dotenv from "dotenv";
dotenv.config(); // Loads .env from root
```

### **2. Zod Validation (server/config/env.ts)**

```typescript
import { env } from "./config/env";
// Validates all variables on import
// Throws error if validation fails
```

### **3. Environment Priority**

```
1. Environment variables (already set in shell/Docker)
2. .env file in root directory
3. Default values in Zod schema
```

---

## 🔄 Switching Environments

### **Local Development → Production**

```bash
# Option 1: Change NODE_ENV in .env
NODE_ENV=production

# Option 2: Use cross-env (recommended)
cross-env NODE_ENV=production npm start

# Option 3: Set environment variable
# PowerShell:
$env:NODE_ENV="production"; npm start
# Bash:
NODE_ENV=production npm start
```

### **Different Databases per Environment**

Since we use a single `.env` file, you have two options:

**Option 1: Manual switching** (edit .env)

```env
# Development
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/pantrypal_dev

# Production (comment/uncomment as needed)
# DATABASE_URL=postgresql://user:pass@neon.tech/pantrypal_prod
```

**Option 2: Environment-specific .env files** (requires code change)

Create multiple files:

```
.env.development
.env.production
.env.test
```

Then update `server/index.ts`:

```typescript
import dotenv from "dotenv";
const envFile = `.env.${process.env.NODE_ENV || "development"}`;
dotenv.config({ path: envFile });
```

---

## 📋 Quick Reference

| Command              | NODE_ENV    | Uses .env | Database       | Port |
| -------------------- | ----------- | --------- | -------------- | ---- |
| `npm run dev`        | development | ✅ Yes    | From .env      | 5000 |
| `npm start`          | production  | ✅ Yes    | From .env      | 5000 |
| `npm run db:push`    | current     | ✅ Yes    | From .env      | -    |
| `npm run docker:dev` | development | ✅ Yes    | Docker service | 5000 |
| `npm run docker:up`  | production  | ✅ Yes    | Docker service | 5000 |

---

## ⚠️ Important Notes

### **For Production Deployment:**

1. **Never use development secrets in production!**

   ```bash
   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
   ```

2. **Use production DATABASE_URL**

   - Point to Neon/hosted PostgreSQL
   - Enable SSL: `?sslmode=require`

3. **Update security settings in .env:**

   ```env
   NODE_ENV=production
   SESSION_SECURE=true
   HELMET_ENABLED=true
   CORS_ORIGINS=https://yourdomain.com
   ```

4. **For Railway/Render:**
   - Set environment variables in dashboard
   - Don't commit `.env` file
   - Use platform's secret management

---

## 🔍 Debugging Environment Issues

### **Check loaded environment:**

```bash
# See all env vars
node -r dotenv/config -e "console.log(process.env)" | grep PANTRY

# Check specific variable
node -r dotenv/config -e "console.log(process.env.DATABASE_URL)"
```

### **Validate environment:**

```bash
# TypeScript check
npm run check

# Test env loading
node -r dotenv/config -r tsx/register server/config/env.ts
```

### **Common Issues:**

1. **"Environment validation failed"**

   - Check `.env` has all required variables
   - Ensure secrets are at least 32 characters
   - Verify DATABASE_URL format

2. **"Cannot connect to database"**

   - Verify DATABASE_URL is correct
   - Check PostgreSQL is running
   - Test connection: `psql $DATABASE_URL`

3. **"Email not sending"**
   - Use Gmail App Password (not regular password)
   - Check SMTP_USER is valid email
   - Verify 2FA is enabled on Gmail account

---

## 📚 Related Documentation

- [.env.example](./.env.example) - Template with all variables
- [docs/ENVIRONMENT.md](./docs/ENVIRONMENT.md) - Complete environment guide
- [server/config/env.ts](./server/config/env.ts) - Zod validation schema
- [docs/DOCKER_TESTING_GUIDE.md](./docs/DOCKER_TESTING_GUIDE.md) - Docker setup

---

**Last Updated**: November 21, 2025
