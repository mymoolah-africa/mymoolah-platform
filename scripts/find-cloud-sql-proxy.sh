#!/bin/bash

echo "🔍 Finding cloud-sql-proxy binary..."
echo ""

# Check common locations
LOCATIONS=(
  "/workspaces/mymoolah-platform/cloud-sql-proxy"
  "$HOME/cloud-sql-proxy"
  "/usr/local/bin/cloud-sql-proxy"
  "/usr/bin/cloud-sql-proxy"
  "$(which cloud-sql-proxy 2>/dev/null)"
)

FOUND=false
for LOC in "${LOCATIONS[@]}"; do
  if [ -n "$LOC" ] && [ -f "$LOC" ]; then
    echo "✅ Found: $LOC"
    FOUND=true
    break
  fi
done

if [ "$FOUND" = false ]; then
  echo "❌ cloud-sql-proxy not found in common locations"
  echo ""
  echo "Searching workspace..."
  find /workspaces -name "cloud-sql-proxy" 2>/dev/null | head -5
fi

echo ""
echo "Checking PATH..."
which cloud-sql-proxy 2>/dev/null || echo "❌ Not in PATH"
