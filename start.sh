#!/bin/sh
set -e

echo "🚀 Starting container..." >&2
echo "📋 Working directory: $(pwd)" >&2
echo "📋 User: $(whoami)" >&2
echo "📋 Files in /app:" >&2
ls -la /app | head -10 >&2
echo "📋 PORT: ${PORT:-8080}" >&2
echo "📋 Node version:" >&2
node --version >&2

echo "📋 Testing if test-server.js exists:" >&2
if [ -f "test-server.js" ]; then
  echo "✅ test-server.js exists" >&2
else
  echo "❌ test-server.js NOT FOUND" >&2
  echo "📋 Listing all .js files:" >&2
  find /app -name "*.js" -type f | head -10 >&2
fi

# Use DATABASE_URL from Secret Manager if provided (preferred)
# Otherwise construct it from DB_PASSWORD + DB_NAME + CLOUD_SQL_INSTANCE
if [ -n "${DATABASE_URL}" ]; then
  echo "✅ Using DATABASE_URL from Secret Manager" >&2
elif [ -n "${DB_PASSWORD}" ] && [ -n "${CLOUD_SQL_INSTANCE}" ] && [ -n "${DB_NAME}" ]; then
  echo "📋 Constructing DATABASE_URL from secrets..." >&2
  # URL encode the password using Node.js (more reliable than shell)
  ENCODED_PASSWORD=$(node -e "const pwd = process.argv[1]; console.log(encodeURIComponent(pwd));" "${DB_PASSWORD}")
  # Use DB_NAME env var (set per environment: mymoolah_staging or mymoolah_production)
  export DATABASE_URL="postgres://mymoolah_app:${ENCODED_PASSWORD}@/${DB_NAME}?host=/cloudsql/${CLOUD_SQL_INSTANCE}&sslmode=disable"
  echo "✅ DATABASE_URL constructed for database: ${DB_NAME}" >&2
else
  echo "⚠️  WARNING: DATABASE_URL not set and missing required env vars!" >&2
  echo "📋 DATABASE_URL: ${DATABASE_URL:+set}" >&2
  echo "📋 DB_PASSWORD: ${DB_PASSWORD:+set}" >&2
  echo "📋 DB_NAME: ${DB_NAME:-not set}" >&2
  echo "📋 CLOUD_SQL_INSTANCE: ${CLOUD_SQL_INSTANCE:-not set}" >&2
fi

echo "🚀 Starting Node.js..." >&2
# Use real server.js now that we know the container works
exec node server.js

