#!/bin/bash

##############################################################################
# Test Sync Script Connection
# 
# Verify that sync-staging-to-uat.js can connect to both UAT and Staging
##############################################################################

echo "🧪 Testing Sync Script Connections"
echo "==================================="
echo ""

# Test UAT connection
echo "1. Testing UAT connection..."
export PGPASSWORD="B0t3s@Mymoolah"
if psql -h 127.0.0.1 -p 6543 -U mymoolah_app -d mymoolah -c "SELECT current_database();" 2>&1 | grep -q "mymoolah"; then
  echo "   ✅ UAT connection works"
else
  echo "   ❌ UAT connection failed"
  exit 1
fi

# Test Staging connection
echo "2. Testing Staging connection..."
STAGING_PASSWORD=$(gcloud secrets versions access latest --secret="db-mmtp-pg-staging-password" --project="mymoolah-db" 2>/dev/null | tr -d '\n\r' || echo "")
export PGPASSWORD="$STAGING_PASSWORD"
if psql -h 127.0.0.1 -p 6544 -U mymoolah_app -d mymoolah_staging -c "SELECT current_database();" 2>&1 | grep -q "mymoolah_staging"; then
  echo "   ✅ Staging connection works"
else
  echo "   ❌ Staging connection failed"
  exit 1
fi

echo ""
echo "✅✅✅ Both connections working! Ready for sync! ✅✅✅"
echo ""
echo "Next step: Run the sync script"
echo "   ./scripts/run-sync-in-codespaces.sh --dry-run"
