#!/bin/bash

##############################################################################
# Check if mymoolah_staging database exists
# 
# Purpose: Verify what databases exist in the Staging Cloud SQL instance
# Usage: ./scripts/check-staging-database-exists.sh
##############################################################################

echo "🔍 Checking Databases in Staging Cloud SQL Instance"
echo "===================================================="
echo ""

# Check proxy
STAGING_RUNNING=$(lsof -ti:6544 2>/dev/null || echo "")
if [ -z "$STAGING_RUNNING" ]; then
  echo "❌ Staging proxy NOT running on port 6544"
  echo "   Please start it: ./scripts/start-staging-proxy-cs.sh"
  exit 1
fi
echo "✅ Staging proxy running on port 6544"
echo ""

# Try to list databases using mymoolah_app user
echo "Attempting to list databases as mymoolah_app user..."
PASSWORD=$(gcloud secrets versions access latest \
  --secret="db-mmtp-pg-staging-password" \
  --project="mymoolah-db" 2>/dev/null | tr -d '\n\r ' || echo "")

if [ -z "$PASSWORD" ]; then
  echo "❌ Failed to retrieve password"
  exit 1
fi

export PGPASSWORD="$PASSWORD"

# Try connecting to postgres database first (this exists by default)
if psql -h 127.0.0.1 -p 6544 -U mymoolah_app -d postgres -c "\l" >/dev/null 2>&1; then
  echo "✅ Can connect to 'postgres' database"
  echo ""
  echo "Listing all databases:"
  psql -h 127.0.0.1 -p 6544 -U mymoolah_app -d postgres -c "\l" | grep -E "Name|mymoolah"
  echo ""
  
  # Check if mymoolah_staging exists
  if psql -h 127.0.0.1 -p 6544 -U mymoolah_app -d postgres -c "\l" | grep -q "mymoolah_staging"; then
    echo "✅ Database 'mymoolah_staging' EXISTS"
  else
    echo "❌ Database 'mymoolah_staging' DOES NOT EXIST"
    echo ""
    echo "💡 This is the problem! You're trying to connect to a database that doesn't exist."
    echo "💡 Options:"
    echo "   1. Create the database: CREATE DATABASE mymoolah_staging;"
    echo "   2. OR use 'mymoolah' database (same as UAT) for now"
  fi
else
  echo "❌ Cannot connect to 'postgres' database"
  echo ""
  echo "💡 This suggests password authentication is failing"
  echo "💡 The password in Secret Manager may still be wrong"
fi
