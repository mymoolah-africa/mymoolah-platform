#!/bin/bash

##############################################################################
# Check Cloud SQL Auth Proxy Status in Codespaces
# 
# Purpose: Quick check if both UAT and Staging proxies are running
# Usage: ./scripts/check-proxies-cs.sh
##############################################################################

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo "🔍 Checking Cloud SQL Auth Proxy Status..."
echo ""

# Check UAT proxy
UAT_RUNNING=$(lsof -ti:6543 2>/dev/null || echo "")
if [ -n "$UAT_RUNNING" ]; then
  echo -e "${GREEN}✅ UAT proxy running on port 6543 (PID: $UAT_RUNNING)${NC}"
else
  echo -e "${RED}❌ UAT proxy NOT running on port 6543${NC}"
  echo "   Start with: cloud-sql-proxy mymoolah-db:africa-south1:mmtp-pg --port 6543"
fi

# Check Staging proxy
STAGING_RUNNING=$(lsof -ti:6544 2>/dev/null || echo "")
if [ -n "$STAGING_RUNNING" ]; then
  echo -e "${GREEN}✅ Staging proxy running on port 6544 (PID: $STAGING_RUNNING)${NC}"
else
  echo -e "${RED}❌ Staging proxy NOT running on port 6544${NC}"
  echo "   Start with: ./scripts/start-staging-proxy-cs.sh"
  echo "   Or manually: cloud-sql-proxy mymoolah-db:africa-south1:mmtp-pg-staging --port 6544"
fi

echo ""

# Summary
if [ -n "$UAT_RUNNING" ] && [ -n "$STAGING_RUNNING" ]; then
  echo -e "${GREEN}✅ Both proxies are running - ready to sync!${NC}"
  exit 0
else
  echo -e "${YELLOW}⚠️  Some proxies are not running - start them before syncing${NC}"
  exit 1
fi
