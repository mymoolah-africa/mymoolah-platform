#!/bin/bash

##############################################################################
# Start Staging Cloud SQL Auth Proxy in Codespaces
# 
# Purpose: Start Staging proxy on port 6544 in background
# Usage: ./scripts/start-staging-proxy-cs.sh
##############################################################################

set -e

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo "🚀 Starting Staging Cloud SQL Auth Proxy..."
echo ""

# Check if already running
STAGING_RUNNING=$(lsof -ti:6544 2>/dev/null || echo "")

if [ -n "$STAGING_RUNNING" ]; then
  echo -e "${GREEN}✅ Staging proxy already running on port 6544 (PID: $STAGING_RUNNING)${NC}"
  echo ""
  exit 0
fi

# Check if cloud-sql-proxy is available
if ! command -v cloud-sql-proxy &> /dev/null; then
  echo -e "${RED}❌ cloud-sql-proxy not found!${NC}"
  echo "   Please install it or check PATH"
  exit 1
fi

# Start proxy in background
echo "Starting Staging proxy on port 6544..."
nohup cloud-sql-proxy mymoolah-db:africa-south1:mmtp-pg-staging --port 6544 > /tmp/staging-proxy-6544.log 2>&1 &

PROXY_PID=$!

# Wait a moment and check if it started
sleep 2

if lsof -ti:6544 >/dev/null 2>&1; then
  echo -e "${GREEN}✅ Staging proxy started successfully (PID: $PROXY_PID)${NC}"
  echo ""
  echo "📡 Staging Connection: 127.0.0.1:6544"
  echo "📋 Log file: /tmp/staging-proxy-6544.log"
  echo ""
  echo "💡 To stop: kill $PROXY_PID"
  echo "💡 To view logs: tail -f /tmp/staging-proxy-6544.log"
else
  echo -e "${RED}❌ Proxy failed to start${NC}"
  echo "   Check logs: cat /tmp/staging-proxy-6544.log"
  exit 1
fi
