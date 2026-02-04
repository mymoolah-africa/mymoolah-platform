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

# Determine repository root (Codespaces vs local Mac)
if [ -d "/workspaces/mymoolah-platform" ]; then
  REPO_ROOT="/workspaces/mymoolah-platform"
else
  REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
fi

# Get access token from gcloud (works when ADC is blocked by org policy)
ACCESS_TOKEN=""
if command -v gcloud >/dev/null 2>&1; then
  ACCESS_TOKEN=$(gcloud auth print-access-token 2>/dev/null || true)
fi

if [ -n "$ACCESS_TOKEN" ]; then
  echo "🔑 Using gcloud user credentials (access token)"
  TOKEN_FLAG="--token ${ACCESS_TOKEN}"
else
  echo "⚠️  No access token - using default credentials"
  TOKEN_FLAG=""
fi

# Check UAT proxy (6543)
UAT_RUNNING=$(lsof -ti:6543 2>/dev/null || echo "")
if [ -z "$UAT_RUNNING" ]; then
  echo -e "${YELLOW}⚠️  UAT proxy NOT running on port 6543${NC}"
  echo "   Starting UAT proxy..."
  cd "$REPO_ROOT" || exit 1
  nohup ./cloud-sql-proxy mymoolah-db:africa-south1:mmtp-pg \
    --port 6543 \
    --structured-logs \
    $TOKEN_FLAG \
    > /tmp/uat-proxy-6543.log 2>&1 &
  sleep 3
  if lsof -ti:6543 >/dev/null 2>&1; then
    echo -e "${GREEN}✅ UAT proxy started${NC}"
  else
    echo -e "${RED}❌ UAT proxy failed to start${NC}"
    echo "   Check logs: cat /tmp/uat-proxy-6543.log"
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
  cd "$REPO_ROOT" || exit 1
  nohup ./cloud-sql-proxy mymoolah-db:africa-south1:mmtp-pg-staging \
    --port 6544 \
    --structured-logs \
    $TOKEN_FLAG \
    > /tmp/staging-proxy-6544.log 2>&1 &
  sleep 3
  if lsof -ti:6544 >/dev/null 2>&1; then
    echo -e "${GREEN}✅ Staging proxy started${NC}"
  else
    echo -e "${RED}❌ Staging proxy failed to start${NC}"
    echo "   Check logs: cat /tmp/staging-proxy-6544.log"
    exit 1
  fi
else
  echo -e "${GREEN}✅ Staging proxy running on port 6544 (PID: $STAGING_RUNNING)${NC}"
fi

echo ""
echo -e "${GREEN}✅ Both proxies are running!${NC}"
echo ""
