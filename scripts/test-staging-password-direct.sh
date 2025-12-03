#!/bin/bash

##############################################################################
# Test Staging Password Directly with psql
# 
# Purpose: Test if the password works when used directly with psql
# Usage: ./scripts/test-staging-password-direct.sh
##############################################################################

set -e

echo "🧪 Testing Staging Password Directly"
echo "====================================="
echo ""

# Check proxy
STAGING_RUNNING=$(lsof -ti:6544 2>/dev/null || echo "")
if [ -z "$STAGING_RUNNING" ]; then
  echo "❌ Staging proxy NOT running on port 6544"
  exit 1
fi
echo "✅ Staging proxy running on port 6544"
echo ""

# Get password and remove ALL whitespace/newlines
echo "Retrieving password from Secret Manager..."
PASSWORD=$(gcloud secrets versions access latest --secret="db-mmtp-pg-staging-password" --project="mymoolah-db" 2>&1 | tr -d '\n\r\t ')

if [ -z "$PASSWORD" ]; then
  echo "❌ Failed to retrieve password"
  exit 1
fi

echo "✅ Password retrieved (length: ${#PASSWORD} characters)"
echo ""

# Test connection
if command -v psql &> /dev/null; then
  echo "Testing connection with psql..."
  export PGPASSWORD="$PASSWORD"
  
  # Try connection
  if psql -h 127.0.0.1 -p 6544 -U mymoolah_app -d mymoolah_staging -c "SELECT 'Connection successful!' as status;" 2>&1; then
    echo ""
    echo "✅ Password is CORRECT - connection works!"
  else
    echo ""
    echo "❌ Password authentication failed"
    echo ""
    echo "💡 This means:"
    echo "   - The password in Secret Manager doesn't match the database password"
    echo "   - OR the database user 'mymoolah_app' doesn't exist"
    echo "   - OR there's a permissions issue"
    echo ""
    echo "🔧 Next steps:"
    echo "   1. Verify with your team what the Staging database password should be"
    echo "   2. Check if the password in Secret Manager matches the database"
    echo "   3. Verify the database user exists: SELECT * FROM pg_user WHERE usename = 'mymoolah_app';"
  fi
else
  echo "⚠️  psql not found - cannot test directly"
  echo "   Install PostgreSQL client: sudo apt-get install postgresql-client"
fi
