#!/bin/bash

##############################################################################
# Ensure Both Proxies Are Running
# 
# Purpose: Check if UAT and Staging proxies are running, start if needed
# Usage: ./scripts/ensure-proxies-running.sh
##############################################################################

set -e

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo "🔍 Checking Cloud SQL Auth Proxies..."
echo ""

# Check UAT proxy (6543)
UAT_RUNNING=$(lsof -ti:6543 2>/dev/null || echo "")
if [ -z "$UAT_RUNNING" ]; then
  echo -e "${YELLOW}⚠️  UAT proxy NOT running on port 6543${NC}"
  echo "   Starting UAT proxy..."
  cd /workspaces/mymoolah-platform || exit 1
  nohup ./cloud-sql-proxy mymoolah-db:africa-south1:mmtp-pg \
    --auto-iam-authn \
    --port 6543 \
    --structured-logs \
    > /tmp/uat-proxy-6543.log 2>&1 &
  sleep 3
  if lsof -ti:6543 >/dev/null 2>&1; then
    echo -e "${GREEN}✅ UAT proxy started${NC}"
  else
    echo -e "${RED}❌ UAT proxy failed to start${NC}"
    exit 1
  fi
else
  echo -e "${GREEN}✅ UAT proxy running on port 6543 (PID: $UAT_RUNNING)${NC}"
fi

# Check Staging proxy (6544)
STAGING_RUNNING=$(lsof -ti:6544 2>/dev/null || echo "")
if [ -z "$STAGING_RUNNING" ]; then
  echo -e "${YELLOW}⚠️  Staging proxy NOT running on port 6544${NC}"
  echo "   Starting Staging proxy..."
  cd /workspaces/mymoolah-platform || exit 1
  nohup ./cloud-sql-proxy mymoolah-db:africa-south1:mmtp-pg-staging \
    --auto-iam-authn \
    --port 6544 \
    --structured-logs \
    > /tmp/staging-proxy-6544.log 2>&1 &
  sleep 3
  if lsof -ti:6544 >/dev/null 2>&1; then
    echo -e "${GREEN}✅ Staging proxy started${NC}"
  else
    echo -e "${RED}❌ Staging proxy failed to start${NC}"
    exit 1
  fi
else
  echo -e "${GREEN}✅ Staging proxy running on port 6544 (PID: $STAGING_RUNNING)${NC}"
fi

echo ""
echo -e "${GREEN}✅ Both proxies are running!${NC}"
echo ""
