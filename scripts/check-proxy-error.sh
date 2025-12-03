#!/bin/bash

echo "📋 Checking Staging Proxy Error Log..."
echo "======================================"
echo ""

if [ -f /tmp/staging-proxy-6544.log ]; then
  echo "Last 20 lines of log:"
  echo ""
  tail -20 /tmp/staging-proxy-6544.log
else
  echo "❌ Log file not found"
fi

echo ""
echo "🔍 Checking if cloud-sql-proxy is in PATH..."
which cloud-sql-proxy || echo "❌ Not in PATH"

echo ""
echo "🔍 Checking for proxy binary in workspace..."
if [ -f "/workspaces/mymoolah-platform/cloud-sql-proxy" ]; then
  echo "✅ Found: /workspaces/mymoolah-platform/cloud-sql-proxy"
else
  echo "❌ Not found in workspace"
fi
