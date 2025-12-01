#!/bin/bash

##############################################################################
# Start Staging Proxy in Codespaces (port 6544)
#
# Purpose: Start a second proxy to access the same database as "Staging"
#          This simulates having two separate databases (UAT vs Staging)
#
# Note: For now, both proxies connect to the same database instance
#       In a true UAT/Staging split, they would connect to different instances
##############################################################################

set -e

PROJECT_ID="mymoolah-db"
REGION="africa-south1"
INSTANCE_NAME="mmtp-pg"  # Main instance in Codespaces

echo "🚀 Starting Staging proxy on port 6544..."
echo ""

# Check if already running
STAGING_RUNNING=$(lsof -ti:6544 2>/dev/null || echo "")

if [ -n "$STAGING_RUNNING" ]; then
    echo "⚠️  Staging proxy already running on port 6544 (PID: $STAGING_RUNNING)"
    echo "   Stop with: kill $STAGING_RUNNING"
    exit 0
fi

echo "🔵 Starting proxy..."
cd /workspaces/mymoolah-platform
nohup ./cloud-sql-proxy \
    "${PROJECT_ID}:${REGION}:${INSTANCE_NAME}" \
    --auto-iam-authn \
    --port 6544 \
    --structured-logs \
    > /tmp/staging-proxy-6544.log 2>&1 &

PROXY_PID=$!
echo "✅ Staging proxy started (PID: $PROXY_PID)"
echo ""
echo "📡 Staging Connection: 127.0.0.1:6544"
echo "📡 UAT Connection:     127.0.0.1:6543 (already running)"
echo ""
echo "💡 To stop: kill $PROXY_PID"
echo ""
echo "🔍 Ready to run schema comparison:"
echo "   node scripts/compare-uat-staging-schemas.js"
echo ""
