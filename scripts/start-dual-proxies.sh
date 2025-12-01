#!/bin/bash

##############################################################################
# Start Dual Cloud SQL Auth Proxies for UAT and Staging
#
# Purpose: Start both UAT (port 5433) and Staging (port 5434) proxies
# Usage: ./scripts/start-dual-proxies.sh
#
# Requirements:
# - cloud-sql-proxy installed
# - Authenticated with gcloud
##############################################################################

set -e

PROJECT_ID="mymoolah-db"
REGION="africa-south1"
INSTANCE_NAME="mmtp-pg-staging"

echo "🚀 Starting Cloud SQL Auth Proxies..."
echo ""

# Check if cloud-sql-proxy is installed
if ! command -v cloud-sql-proxy &> /dev/null; then
    echo "❌ cloud-sql-proxy not found!"
    echo "📥 Install with: brew install cloud-sql-proxy"
    exit 1
fi

# Check if already running
UAT_RUNNING=$(lsof -ti:5433 || echo "")
STAGING_RUNNING=$(lsof -ti:5434 || echo "")

if [ -n "$UAT_RUNNING" ]; then
    echo "⚠️  UAT proxy already running on port 5433 (PID: $UAT_RUNNING)"
    echo "   Stop with: kill $UAT_RUNNING"
else
    echo "🔵 Starting UAT proxy on port 5433..."
    cloud-sql-proxy \
        --port 5433 \
        "${PROJECT_ID}:${REGION}:${INSTANCE_NAME}" &
    UAT_PID=$!
    echo "✅ UAT proxy started (PID: $UAT_PID)"
fi

if [ -n "$STAGING_RUNNING" ]; then
    echo "⚠️  Staging proxy already running on port 5434 (PID: $STAGING_RUNNING)"
    echo "   Stop with: kill $STAGING_RUNNING"
else
    echo "🔵 Starting Staging proxy on port 5434..."
    cloud-sql-proxy \
        --port 5434 \
        "${PROJECT_ID}:${REGION}:${INSTANCE_NAME}" &
    STAGING_PID=$!
    echo "✅ Staging proxy started (PID: $STAGING_PID)"
fi

echo ""
echo "✅ Both proxies are running!"
echo ""
echo "📡 UAT Connection:     127.0.0.1:5433"
echo "📡 Staging Connection: 127.0.0.1:5434"
echo ""
echo "💡 To stop proxies:"
echo "   lsof -ti:5433 | xargs kill  # Stop UAT"
echo "   lsof -ti:5434 | xargs kill  # Stop Staging"
echo ""
echo "🔍 Ready to run schema comparison:"
echo "   node scripts/compare-uat-staging-schemas.js"
echo ""
