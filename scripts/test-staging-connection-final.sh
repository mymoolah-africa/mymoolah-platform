#!/bin/bash

##############################################################################
# Final Staging Connection Test
# 
# Now that proxy is pointing to correct instance (mmtp-pg-staging),
# test the connection with the exact password
##############################################################################

echo "🧪 Final Staging Connection Test"
echo "================================="
echo ""
echo "Proxy is now pointing to: mmtp-pg-staging (CORRECT)"
echo "Testing connection with password: B0t3s@Mymoolahstaging"
echo ""

# Check proxy is running
if ! lsof -ti:6544 > /dev/null 2>&1; then
  echo "❌ Staging proxy NOT running on port 6544"
  exit 1
fi

# Verify proxy is pointing to correct instance
PID=$(lsof -ti:6544)
CMD=$(ps -p $PID -o command= 2>/dev/null | head -1)

if [[ "$CMD" != *"mmtp-pg-staging"* ]]; then
  echo "❌ Proxy is still pointing to wrong instance!"
  echo "   Command: $CMD"
  exit 1
fi

echo "✅ Proxy verified: pointing to mmtp-pg-staging"
echo ""

# Get password from Secret Manager
PASSWORD=$(gcloud secrets versions access latest --secret="db-mmtp-pg-staging-password" --project="mymoolah-db" 2>/dev/null | tr -d '\n\r' || echo "")

if [ -z "$PASSWORD" ]; then
  echo "❌ Could not retrieve password from Secret Manager"
  exit 1
fi

echo "✅ Password retrieved from Secret Manager"
echo "   Length: ${#PASSWORD} characters"
echo "   Expected: B0t3s@Mymoolahstaging (21 chars)"
echo ""

# Test with psql (raw password)
echo "Method 1: Testing with psql (raw password)..."
export PGPASSWORD="$PASSWORD"

if psql -h 127.0.0.1 -p 6544 -U mymoolah_app -d mymoolah_staging -c "SELECT current_database(), current_user, version();" 2>&1 | grep -q "mymoolah_staging"; then
  echo ""
  echo "✅✅✅ CONNECTION SUCCESSFUL WITH RAW PASSWORD! ✅✅✅"
  psql -h 127.0.0.1 -p 6544 -U mymoolah_app -d mymoolah_staging -c "SELECT current_database(), current_user;"
  exit 0
fi

echo "❌ Raw password failed, trying URL-encoded..."

# Test with URL-encoded password (Sequelize method)
echo ""
echo "Method 2: Testing with Node.js Sequelize (URL-encoded password)..."
node scripts/test-staging-exact-working-method.js 2>&1

if [ $? -eq 0 ]; then
  echo ""
  echo "✅✅✅ CONNECTION SUCCESSFUL WITH SEQUELIZE! ✅✅✅"
  exit 0
fi

echo ""
echo "❌ Both methods failed"
echo ""
echo "💡 The password in Cloud SQL may still be wrong"
echo "   Verify in Cloud Console UI that password is: B0t3s@Mymoolahstaging"
