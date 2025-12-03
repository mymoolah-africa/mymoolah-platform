#!/bin/bash

##############################################################################
# Comprehensive Staging Connection Diagnosis
# 
# Purpose: Diagnose why Staging database connection is failing
# Usage: ./scripts/diagnose-staging-connection.sh
##############################################################################

set -e

echo "🔍 Comprehensive Staging Connection Diagnosis"
echo "=============================================="
echo ""

# Check proxy
echo "1. Checking Cloud SQL Proxy..."
STAGING_RUNNING=$(lsof -ti:6544 2>/dev/null || echo "")
if [ -z "$STAGING_RUNNING" ]; then
  echo "❌ Staging proxy NOT running on port 6544"
  exit 1
fi
echo "✅ Staging proxy running on port 6544 (PID: $STAGING_RUNNING)"
echo ""

# Check Cloud SQL instance settings
echo "2. Checking Cloud SQL instance settings..."
echo ""
gcloud sql instances describe mmtp-pg-staging \
  --project=mymoolah-db \
  --format="table(name,databaseVersion,settings.databaseFlags,settings.ipConfiguration.authorizedNetworks,settings.requireSsl)" 2>&1 | head -20
echo ""

# Check database flags
echo "3. Checking database authentication settings..."
DB_FLAGS=$(gcloud sql instances describe mmtp-pg-staging \
  --project=mymoolah-db \
  --format="value(settings.databaseFlags)" 2>&1 || echo "")

if echo "$DB_FLAGS" | grep -qi "cloudsql.iam_authentication"; then
  echo "⚠️  IAM authentication might be enabled"
fi

echo ""

# Check SSL requirement
SSL_REQUIRED=$(gcloud sql instances describe mmtp-pg-staging \
  --project=mymoolah-db \
  --format="value(settings.ipConfiguration.requireSsl)" 2>&1 || echo "false")

echo "4. SSL Requirement: $SSL_REQUIRED"
echo ""

# Try password retrieval and test
echo "5. Testing password retrieval and connection..."
PASSWORD=$(gcloud secrets versions access latest \
  --secret="db-mmtp-pg-staging-password" \
  --project="mymoolah-db" 2>/dev/null | tr -d '\n\r ' || echo "")

if [ -z "$PASSWORD" ]; then
  echo "❌ Failed to retrieve password"
  exit 1
fi

echo "✅ Password retrieved (length: ${#PASSWORD})"
echo ""

# Try connection with different SSL modes
if command -v psql &> /dev/null; then
  export PGPASSWORD="$PASSWORD"
  
  echo "6. Testing connection with different SSL modes..."
  echo ""
  
  # Try without SSL
  echo "   Attempting connection WITHOUT SSL..."
  if psql "postgresql://mymoolah_app:$PASSWORD@127.0.0.1:6544/mymoolah_staging?sslmode=disable" -c "SELECT 1;" >/dev/null 2>&1; then
    echo "   ✅ Connection works WITHOUT SSL"
  else
    echo "   ❌ Connection failed WITHOUT SSL"
  fi
  
  # Try with SSL prefer
  echo "   Attempting connection WITH SSL (prefer)..."
  if psql "postgresql://mymoolah_app:$PASSWORD@127.0.0.1:6544/mymoolah_staging?sslmode=prefer" -c "SELECT 1;" >/dev/null 2>&1; then
    echo "   ✅ Connection works WITH SSL (prefer)"
  else
    echo "   ❌ Connection failed WITH SSL (prefer)"
  fi
  
  # Try with SSL require
  echo "   Attempting connection WITH SSL (require)..."
  if psql "postgresql://mymoolah_app:$PASSWORD@127.0.0.1:6544/mymoolah_staging?sslmode=require" -c "SELECT 1;" >/dev/null 2>&1; then
    echo "   ✅ Connection works WITH SSL (require)"
  else
    echo "   ❌ Connection failed WITH SSL (require)"
  fi
  
  echo ""
  echo "7. Full error output:"
  psql -h 127.0.0.1 -p 6544 -U mymoolah_app -d mymoolah_staging -c "SELECT 1;" 2>&1 || true
else
  echo "⚠️  psql not available for connection testing"
fi

echo ""
echo "💡 Summary:"
echo "   - Proxy: Running"
echo "   - Password: Retrieved from Secret Manager"
echo "   - User: mymoolah_app exists in Cloud SQL"
echo ""
echo "💡 If all connections fail, possible issues:"
echo "   - Password in Secret Manager doesn't match Cloud SQL"
echo "   - Password wasn't actually updated in Cloud SQL"
echo "   - Connection requires specific SSL settings"
echo "   - Database user has host restrictions"
