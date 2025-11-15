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

# Construct DATABASE_URL at runtime from DB_PASSWORD secret
# This avoids URL encoding issues when passing through gcloud
if [ -n "${DB_PASSWORD}" ] && [ -n "${CLOUD_SQL_INSTANCE}" ]; then
  echo "📋 Constructing DATABASE_URL from secrets..." >&2
  # URL encode the password using Node.js (more reliable than shell)
  # Use a here-document to safely pass the password to Node.js
  ENCODED_PASSWORD=$(node -e "const pwd = process.argv[1]; console.log(encodeURIComponent(pwd));" "${DB_PASSWORD}")
  export DATABASE_URL="postgres://mymoolah_app:${ENCODED_PASSWORD}@/mymoolah_staging?host=/cloudsql/${CLOUD_SQL_INSTANCE}&sslmode=require"
  echo "✅ DATABASE_URL constructed" >&2
else
  echo "⚠️  WARNING: DB_PASSWORD or CLOUD_SQL_INSTANCE not set!" >&2
  echo "📋 DB_PASSWORD: ${DB_PASSWORD:+set}" >&2
  echo "📋 CLOUD_SQL_INSTANCE: ${CLOUD_SQL_INSTANCE:-not set}" >&2
fi

echo "🚀 Starting Node.js..." >&2
# Use real server.js now that we know the container works
exec node server.js

