#!/bin/bash

##############################################################################
# Compare Database Schemas in Codespaces
# 
# Purpose: Compare UAT and Staging database schemas in Codespaces
# Usage: ./scripts/run-compare-schemas-in-codespaces.sh
##############################################################################

set -e

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo "🔍 MyMoolah Schema Comparison Script for Codespaces"
echo "====================================================="
echo ""

# Step 1: Check if .env file exists
echo "Step 1: Checking .env file..."
if [ ! -f .env ]; then
  echo -e "${RED}❌ .env file not found!${NC}"
  echo "   Please create .env file with DATABASE_URL for UAT"
  exit 1
fi

if ! grep -q "DATABASE_URL=" .env 2>/dev/null && ! grep -q "DB_PASSWORD=" .env 2>/dev/null; then
  echo -e "${RED}❌ Neither DATABASE_URL nor DB_PASSWORD found in .env file${NC}"
  exit 1
fi
echo -e "${GREEN}✅ .env file found${NC}"
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

# Step 4: Load .env file and run comparison script
echo "Step 4: Loading environment variables and running schema comparison..."
echo ""

# Load .env file
if [ -f .env ]; then
  export $(grep -v '^#' .env | xargs)
fi

# Set proxy ports for Codespaces
export UAT_PROXY_PORT=6543
export STAGING_PROXY_PORT=6544

# Run the comparison script
echo "Running schema comparison..."
echo ""
node scripts/compare-uat-staging-schemas.js

echo ""
echo -e "${GREEN}✅ Schema comparison completed!${NC}"
