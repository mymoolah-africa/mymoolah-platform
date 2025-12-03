#!/bin/bash

##############################################################################
# Run Database Sync in Codespaces
# 
# Purpose: Run sync-staging-to-uat.js script in Codespaces environment
# Usage: ./scripts/run-sync-in-codespaces.sh [--dry-run]
#
# This script:
# 1. Checks if Cloud SQL Auth Proxies are running
# 2. Verifies .env file has DATABASE_URL for UAT
# 3. Runs the sync script with proper error handling
##############################################################################

set -e

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo "🚀 MyMoolah Database Sync Script for Codespaces"
echo "=================================================="
echo ""

# Check if dry-run flag is set
DRY_RUN=""
if [ "$1" == "--dry-run" ]; then
  DRY_RUN="--dry-run"
  echo "📋 Running in DRY-RUN mode (no changes will be made)"
  echo ""
fi

# Step 1: Check if .env file exists and has DATABASE_URL
echo "Step 1: Checking .env file..."
if [ ! -f .env ]; then
  echo -e "${RED}❌ .env file not found!${NC}"
  echo "   Please create .env file with DATABASE_URL for UAT"
  exit 1
fi

if ! grep -q "DATABASE_URL=" .env 2>/dev/null; then
  echo -e "${YELLOW}⚠️  DATABASE_URL not found in .env file${NC}"
  echo "   Checking for DB_PASSWORD instead..."
  if ! grep -q "DB_PASSWORD=" .env 2>/dev/null; then
    echo -e "${RED}❌ Neither DATABASE_URL nor DB_PASSWORD found in .env file${NC}"
    echo "   Please add one of these to your .env file:"
    echo "   DATABASE_URL=postgres://mymoolah_app:PASSWORD@127.0.0.1:6543/mymoolah"
    echo "   or"
    echo "   DB_PASSWORD=your_password_here"
    exit 1
  fi
fi
echo -e "${GREEN}✅ .env file found and configured${NC}"
echo ""

# Step 2: Check if Cloud SQL Auth Proxies are running
echo "Step 2: Checking Cloud SQL Auth Proxies..."
UAT_RUNNING=$(lsof -ti:6543 2>/dev/null || echo "")
STAGING_RUNNING=$(lsof -ti:6544 2>/dev/null || echo "")

if [ -z "$UAT_RUNNING" ]; then
  echo -e "${RED}❌ UAT proxy NOT running on port 6543${NC}"
  echo "   Please start UAT proxy:"
  echo "   cloud-sql-proxy mymoolah-db:africa-south1:mmtp-pg --port 6543"
  exit 1
fi
echo -e "${GREEN}✅ UAT proxy running on port 6543 (PID: $UAT_RUNNING)${NC}"

if [ -z "$STAGING_RUNNING" ]; then
  echo -e "${RED}❌ Staging proxy NOT running on port 6544${NC}"
  echo "   Please start Staging proxy:"
  echo "   cloud-sql-proxy mymoolah-db:africa-south1:mmtp-pg-staging --port 6544"
  exit 1
fi
echo -e "${GREEN}✅ Staging proxy running on port 6544 (PID: $STAGING_RUNNING)${NC}"
echo ""

# Step 3: Check if gcloud is authenticated
echo "Step 3: Checking gcloud authentication..."
if ! gcloud auth list --filter=status:ACTIVE --format="value(account)" 2>/dev/null | grep -q "@"; then
  echo -e "${YELLOW}⚠️  No active gcloud authentication found${NC}"
  echo "   Running: gcloud auth login"
  gcloud auth login
else
  ACCOUNT=$(gcloud auth list --filter=status:ACTIVE --format="value(account)" | head -1)
  echo -e "${GREEN}✅ Authenticated as: $ACCOUNT${NC}"
fi
echo ""

# Step 4: Load .env file and run sync script
echo "Step 4: Loading environment variables and running sync script..."
echo ""

# Load .env file (only valid KEY=VALUE lines, skip comments and empty lines)
if [ -f .env ]; then
  while IFS= read -r line || [ -n "$line" ]; do
    # Skip empty lines and comments
    [[ -z "$line" || "$line" =~ ^[[:space:]]*# ]] && continue
    # Only export lines that match KEY=VALUE pattern
    if [[ "$line" =~ ^[A-Za-z_][A-Za-z0-9_]*= ]]; then
      export "$line" 2>/dev/null || true
    fi
  done < .env
fi

# Set proxy ports for Codespaces
export UAT_PROXY_PORT=6543
export STAGING_PROXY_PORT=6544

# Run the sync script
echo "Running sync script..."
echo ""
node scripts/sync-staging-to-uat.js $DRY_RUN

echo ""
echo -e "${GREEN}✅ Script execution completed!${NC}"
