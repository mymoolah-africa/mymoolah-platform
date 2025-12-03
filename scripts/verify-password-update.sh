#!/bin/bash

##############################################################################
# Verify Password Update After Reset
# 
# Purpose: Verify that the password update actually took effect
# Usage: ./scripts/verify-password-update.sh
##############################################################################

set -e

echo "🔍 Verifying Password Update"
echo "============================="
echo ""

# Check password in Secret Manager
echo "1. Checking password in Secret Manager..."
SECRET_PASSWORD=$(gcloud secrets versions access latest \
  --secret="db-mmtp-pg-staging-password" \
  --project="mymoolah-db" 2>/dev/null | tr -d '\n\r ' || echo "")

if [ -z "$SECRET_PASSWORD" ]; then
  echo "❌ Failed to retrieve password from Secret Manager"
  exit 1
fi

SECRET_LENGTH=${#SECRET_PASSWORD}
echo "✅ Password in Secret Manager: ${SECRET_LENGTH} characters"
echo "   First 10 chars: ${SECRET_PASSWORD:0:10}..."
echo ""

# Check Cloud SQL user
echo "2. Checking Cloud SQL user configuration..."
if gcloud sql users list --instance=mmtp-pg-staging --project=mymoolah-db 2>/dev/null | grep -q "mymoolah_app"; then
  echo "✅ User 'mymoolah_app' exists in Cloud SQL"
else
  echo "❌ User 'mymoolah_app' NOT FOUND in Cloud SQL"
  echo ""
  echo "Available users:"
  gcloud sql users list --instance=mmtp-pg-staging --project=mymoolah-db 2>&1 || true
  exit 1
fi
echo ""

# Wait a moment for password to propagate
echo "3. Waiting 5 seconds for password changes to propagate..."
sleep 5
echo ""

# Try direct connection test
echo "4. Testing connection with retrieved password..."
if command -v psql &> /dev/null; then
  export PGPASSWORD="$SECRET_PASSWORD"
  
  # Test connection
  if psql -h 127.0.0.1 -p 6544 -U mymoolah_app -d mymoolah_staging -c "SELECT current_database(), current_user;" 2>&1 | grep -q "mymoolah_staging"; then
    echo "✅ Connection successful!"
    echo ""
    psql -h 127.0.0.1 -p 6544 -U mymoolah_app -d mymoolah_staging -c "SELECT current_database(), current_user;" 2>/dev/null
  else
    echo "❌ Connection still failing"
    echo ""
    echo "Attempting connection with verbose output:"
    psql -h 127.0.0.1 -p 6544 -U mymoolah_app -d mymoolah_staging -c "SELECT 1;" 2>&1 || true
    echo ""
    echo "💡 Possible issues:"
    echo "   - Password change may not have propagated yet (wait a few minutes)"
    echo "   - Database user password might be different"
    echo "   - Check if user exists: gcloud sql users list --instance=mmtp-pg-staging"
  fi
else
  echo "⚠️  psql not available - cannot test connection"
fi
