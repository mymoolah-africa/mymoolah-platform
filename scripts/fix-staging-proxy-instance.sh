#!/bin/bash

##############################################################################
# Fix Staging Proxy - Point to Correct Instance
# 
# The proxy on port 6544 is connecting to UAT (mmtp-pg) instead of Staging (mmtp-pg-staging)
# This script kills the wrong proxy and starts the correct one
##############################################################################

set -e

GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo "🔧 Fixing Staging Proxy Instance"
echo "================================="
echo ""
echo "Problem: Port 6544 is connecting to UAT (mmtp-pg) instead of Staging (mmtp-pg-staging)"
echo ""

# Check what's running on 6544
PID_6544=$(lsof -ti:6544 2>/dev/null || echo "")

if [ -z "$PID_6544" ]; then
  echo -e "${YELLOW}Port 6544 is not in use${NC}"
else
  CMD_6544=$(ps -p $PID_6544 -o command= 2>/dev/null | head -1)
  echo "Current process on port 6544:"
  echo "   PID: $PID_6544"
  echo "   Command: $CMD_6544"
  echo ""
  
  # Check if it's connecting to wrong instance
  if [[ "$CMD_6544" == *"mmtp-pg"* ]] && [[ "$CMD_6544" != *"mmtp-pg-staging"* ]]; then
    echo -e "${RED}❌ PROBLEM FOUND: Port 6544 is connecting to UAT (mmtp-pg) not Staging!${NC}"
    echo ""
    echo "Killing wrong proxy..."
    kill $PID_6544 2>/dev/null || true
    sleep 2
    echo -e "${GREEN}✅ Wrong proxy killed${NC}"
  else
    echo -e "${GREEN}✅ Port 6544 is correctly pointing to Staging${NC}"
    exit 0
  fi
fi

echo ""
echo "Starting correct Staging proxy..."
echo "   Instance: mmtp-pg-staging"
echo "   Port: 6544"
echo ""

# Start the correct proxy (use full path like the working proxy)
PROXY_BINARY="/workspaces/mymoolah-platform/cloud-sql-proxy"

# Check if proxy binary exists
if [ ! -f "$PROXY_BINARY" ]; then
  echo -e "${RED}❌ Proxy binary not found at: $PROXY_BINARY${NC}"
  echo "   Checking alternative locations..."
  
  # Try to find it
  if command -v cloud-sql-proxy &> /dev/null; then
    PROXY_BINARY=$(which cloud-sql-proxy)
    echo "   Found in PATH: $PROXY_BINARY"
  else
    echo -e "${RED}❌ cloud-sql-proxy not found in PATH either${NC}"
    exit 1
  fi
fi

echo "Using proxy binary: $PROXY_BINARY"
nohup "$PROXY_BINARY" mymoolah-db:africa-south1:mmtp-pg-staging --auto-iam-authn --port 6544 --structured-logs > /tmp/staging-proxy-6544.log 2>&1 &

PROXY_PID=$!
sleep 3

# Verify it started correctly
NEW_PID=$(lsof -ti:6544 2>/dev/null || echo "")
if [ -n "$NEW_PID" ]; then
  NEW_CMD=$(ps -p $NEW_PID -o command= 2>/dev/null | head -1)
  
  if [[ "$NEW_CMD" == *"mmtp-pg-staging"* ]]; then
    echo -e "${GREEN}✅✅✅ Staging proxy correctly started! ✅✅✅${NC}"
    echo ""
    echo "   Port: 6544"
    echo "   Instance: mmtp-pg-staging (CORRECT)"
    echo "   PID: $NEW_PID"
    echo ""
    echo "📋 Log file: /tmp/staging-proxy-6544.log"
  else
    echo -e "${RED}❌ Still connecting to wrong instance!${NC}"
    echo "   Command: $NEW_CMD"
  fi
else
  echo -e "${RED}❌ Proxy failed to start${NC}"
  echo "   Check logs: cat /tmp/staging-proxy-6544.log"
  exit 1
fi
