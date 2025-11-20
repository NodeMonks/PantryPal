# PantryPal Containerization & Testing Guide

## 📦 Docker Implementation

### Files Created
- ✅ \Dockerfile\ - Production multi-stage build
- ✅ \Dockerfile.dev\ - Development with hot reload
- ✅ \docker-compose.yml\ - Production orchestration
- ✅ \docker-compose.dev.yml\ - Development override
- ✅ \.dockerignore\ - Excludes unnecessary files
- ✅ \ntrypoint.sh\ - Optional init script for migrations
- ✅ \.env.docker\ - Environment variable template

### Architecture Decision: ONE Container
**Why single container?**
- Express already serves frontend (\dist/public\) via \xpress.static\
- Single port (5000) handles both API and static assets
- Simpler deployment and orchestration
- Matches existing architecture

**Build Process:**
1. Stage 1 (builder): Install deps → Build Vite frontend → Bundle server with esbuild
2. Stage 2 (runtime): Copy artifacts → Production dependencies only → Non-root user

### Database & Auth
- **Neon PostgreSQL**: External service, no container needed
- **Connection**: Via \DATABASE_URL\ environment variable
- **Sessions**: Stored in PostgreSQL via \connect-pg-simple\
- **Migrations**: Run \
pm run db:push\ before first deploy OR use entrypoint script

## 🚀 Usage Commands

### Production
\\\ash
# Build and run
docker compose up -d

# View logs
docker compose logs -f

# Stop
docker compose down

# Rebuild after changes
docker compose up -d --build
\\\

### Development (Hot Reload)
\\\ash
# Start dev container with volume mounts
docker compose -f docker-compose.yml -f docker-compose.dev.yml up

# Or use npm script
npm run docker:dev
\\\

### NPM Scripts Added
\\\ash
npm run docker:build    # Build Docker image
npm run docker:up       # Start containers
npm run docker:down     # Stop containers
npm run docker:logs     # View logs
npm run docker:dev      # Start dev container
\\\

## 🔐 Environment Setup

### Required Variables
\\\nv
DATABASE_URL=postgresql://user:password@host:port/database
SESSION_SECRET=generate-secure-random-string
JWT_ACCESS_SECRET=generate-another-secure-string
JWT_REFRESH_SECRET=and-another-one
\\\

### Generate Secrets
\\\ash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
\\\

### Optional Variables
- Email: \SMTP_HOST\, \SMTP_PORT\, \SMTP_USER\, \SMTP_PASS\
- SMS: \TWILIO_ACCOUNT_SID\, \TWILIO_AUTH_TOKEN\, \TWILIO_PHONE_NUMBER\
- Container: \RUN_MIGRATIONS\, \SEED_RBAC\, \SEED_TEST_USERS\

## 🗄️ Database Migrations

### Option A: Manual (Recommended)
\\\ash
# Before first deploy
npm run db:push

# Seed roles
npx tsx server/scripts/seed-rbac.ts
\\\

### Option B: Auto-migration via Entrypoint
1. Update Dockerfile to use entrypoint:
\\\dockerfile
COPY entrypoint.sh /app/
RUN chmod +x /app/entrypoint.sh
ENTRYPOINT ["/app/entrypoint.sh"]
\\\

2. Set environment variables:
\\\nv
RUN_MIGRATIONS=true
SEED_RBAC=true
\\\

## 🧪 Testing Setup

### Test Dependencies to Install
\\\ash
npm install --save-dev vitest @vitest/ui @vitest/coverage-v8 supertest @types/supertest @playwright/test
\\\

**Note**: Installation failed due to disk space. Clear disk space first!

### Test Structure Created
\\\
tests/
├── setup.ts                    # Test database setup
├── unit/
│   └── auth.test.ts           # Unit test example
├── integration/
│   └── auth.api.test.ts       # API integration tests
└── e2e/
    └── login.spec.ts          # Playwright E2E tests
\\\

### Test Commands
\\\ash
npm test              # Run unit tests
npm run test:ui       # Interactive test UI
npm run test:coverage # Generate coverage report
npm run test:e2e      # Run E2E tests
npm run test:e2e:ui   # Playwright UI mode
\\\

### Test Files
- ✅ \itest.config.ts\ - Vitest configuration
- ✅ \playwright.config.ts\ - Playwright configuration
- ✅ \	ests/setup.ts\ - Database setup for tests
- ✅ \	ests/unit/auth.test.ts\ - Password hashing tests
- ✅ \	ests/integration/auth.api.test.ts\ - API endpoint tests
- ✅ \	ests/e2e/login.spec.ts\ - Login flow E2E test

## 📊 Complete File List

### Docker Files (7 files)
1. \Dockerfile\ - Production build
2. \Dockerfile.dev\ - Development build
3. \docker-compose.yml\ - Production orchestration
4. \docker-compose.dev.yml\ - Dev overrides
5. \.dockerignore\ - Exclude patterns
6. \ntrypoint.sh\ - Init script
7. \.env.docker\ - Environment template

### Test Files (6 files + configs)
1. \itest.config.ts\ - Vitest config
2. \playwright.config.ts\ - Playwright config
3. \	ests/setup.ts\ - Test setup
4. \	ests/unit/auth.test.ts\ - Unit tests
5. \	ests/integration/auth.api.test.ts\ - Integration tests
6. \	ests/e2e/login.spec.ts\ - E2E tests

### Modified Files (1 file)
1. \package.json\ - Added test & docker scripts

## ⚠️ Next Steps

### 1. Install Test Dependencies (After Clearing Disk Space)
\\\ash
npm install --save-dev vitest @vitest/ui @vitest/coverage-v8 supertest @types/supertest @playwright/test
\\\

### 2. Test Docker Build
\\\ash
# Build production image
docker compose build

# Test locally
docker compose up -d
\\\

### 3. Configure Environment
\\\ash
# Copy template and fill values
cp .env.docker .env
# Edit .env with your Neon DATABASE_URL and secrets
\\\

### 4. Run Tests
\\\ash
npm test          # After installing test deps
npm run test:e2e  # E2E tests
\\\

## 🎯 Key Benefits

### Docker Benefits
- ✅ Consistent environment across dev/staging/production
- ✅ Isolated dependencies (no conflicts)
- ✅ Easy scaling and deployment
- ✅ Multi-stage build reduces image size
- ✅ Non-root user for security
- ✅ Health checks for monitoring

### Testing Benefits
- ✅ Unit tests for business logic
- ✅ Integration tests for API endpoints
- ✅ E2E tests for user flows
- ✅ Coverage reports
- ✅ CI/CD ready

## 🔒 Security Features

### Container Security
- Non-root user (\pantrypal\)
- Minimal base image (bullseye-slim)
- No unnecessary packages
- Health checks for monitoring
- Environment variable isolation

### Production Checklist
- [ ] Generate strong secrets
- [ ] Use HTTPS in production
- [ ] Set \secure: true\ for cookies
- [ ] Enable rate limiting
- [ ] Configure CORS properly
- [ ] Use production database
- [ ] Set up monitoring/logging
- [ ] Implement backup strategy

## 📚 Additional Resources

- Docker docs: https://docs.docker.com/
- Vitest docs: https://vitest.dev/
- Playwright docs: https://playwright.dev/
- Express best practices: https://expressjs.com/en/advanced/best-practice-security.html
