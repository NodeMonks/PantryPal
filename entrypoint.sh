#!/bin/bash
set -e

echo "🚀 PantryPal Container Starting..."

# Check if DATABASE_URL is set
if [ -z "$DATABASE_URL" ]; then
  echo "❌ ERROR: DATABASE_URL is not set"
  exit 1
fi

echo "✅ Database URL configured"

# Optional: Run database migrations
if [ "$RUN_MIGRATIONS" = "true" ]; then
  echo "🔄 Running database migrations..."
  npm run db:push || echo "⚠️ Migration failed (might be already applied)"
fi

# Optional: Seed RBAC roles
if [ "$SEED_RBAC" = "true" ]; then
  echo "🌱 Seeding RBAC roles..."
  npx tsx server/scripts/seed-rbac.ts || echo "⚠️ RBAC seeding failed (might already exist)"
fi

# Optional: Create test users
if [ "$SEED_TEST_USERS" = "true" ]; then
  echo "👥 Creating test users..."
  npx tsx server/scripts/seed-test-users.ts || echo "⚠️ Test user creation failed"
fi

echo "🎉 Starting application..."

# Execute the main command
exec "$@"
