#!/bin/bash

##############################################################################
# Test Staging Database Connection
# 
# Purpose: Verify Staging database connection with password from Secret Manager
# Usage: ./scripts/test-staging-connection.sh
##############################################################################

set -e

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo "🧪 Testing Staging Database Connection..."
echo ""

# Check if proxy is running
STAGING_RUNNING=$(lsof -ti:6544 2>/dev/null || echo "")
if [ -z "$STAGING_RUNNING" ]; then
  echo -e "${RED}❌ Staging proxy NOT running on port 6544${NC}"
  echo "   Please start it: ./scripts/start-staging-proxy-cs.sh"
  exit 1
fi
echo -e "${GREEN}✅ Staging proxy running on port 6544${NC}"
echo ""

# Get password from Secret Manager
echo "Retrieving password from Secret Manager..."
PASSWORD=$(gcloud secrets versions access latest --secret="db-mmtp-pg-staging-password" --project="mymoolah-db" 2>/dev/null | tr -d '\n\r ' || echo "")

if [ -z "$PASSWORD" ]; then
  echo -e "${RED}❌ Failed to retrieve password from Secret Manager${NC}"
  exit 1
fi

PASSWORD_LENGTH=${#PASSWORD}
echo -e "${GREEN}✅ Password retrieved (length: $PASSWORD_LENGTH characters)${NC}"
echo ""

# Test connection using psql
echo "Testing database connection..."
echo ""

if command -v psql &> /dev/null; then
  export PGPASSWORD="$PASSWORD"
  
  if psql -h 127.0.0.1 -p 6544 -U mymoolah_app -d mymoolah_staging -c "SELECT version();" >/dev/null 2>&1; then
    echo -e "${GREEN}✅ Connection successful!${NC}"
    echo ""
    echo "Database version:"
    psql -h 127.0.0.1 -p 6544 -U mymoolah_app -d mymoolah_staging -c "SELECT version();" | head -3
  else
    echo -e "${RED}❌ Connection failed${NC}"
    echo ""
    echo "Trying with verbose error output:"
    psql -h 127.0.0.1 -p 6544 -U mymoolah_app -d mymoolah_staging -c "SELECT 1;" 2>&1 || true
    exit 1
  fi
else
  echo -e "${YELLOW}⚠️  psql not found - cannot test connection directly${NC}"
  echo "   Password retrieved successfully, but cannot verify connection"
  echo "   Install PostgreSQL client to test: sudo apt-get install postgresql-client"
fi
