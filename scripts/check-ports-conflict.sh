#!/bin/bash

##############################################################################
# Check Port Conflicts and Allocations
# 
# Purpose: Verify which ports are actually in use and check for conflicts
##############################################################################

echo "🔍 Checking Port Conflicts and Allocations"
echo "=========================================="
echo ""

# Check all relevant ports
PORTS=(5433 5434 6543 6544)

echo "📊 Port Status:"
echo ""

for PORT in "${PORTS[@]}"; do
  PID=$(lsof -ti:$PORT 2>/dev/null || echo "")
  
  if [ -n "$PID" ]; then
    PROCESS=$(ps -p $PID -o comm= 2>/dev/null || echo "unknown")
    echo "✅ Port $PORT: IN USE (PID: $PID, Process: $PROCESS)"
    
    # Try to identify what it's for
    if [[ "$PROCESS" == *"cloud-sql-proxy"* ]] || [[ "$PROCESS" == *"proxy"* ]]; then
      # Check if it's UAT or Staging
      if netstat -tuln 2>/dev/null | grep -q ":$PORT "; then
        echo "   → Cloud SQL Proxy detected"
      fi
    fi
  else
    echo "❌ Port $PORT: NOT IN USE"
  fi
done

echo ""
echo "📋 Expected Configuration:"
echo "   - UAT (Codespaces): 6543"
echo "   - Staging (Codespaces): 6544"
echo "   - UAT (Local): 5433"
echo "   - Staging (Local): 5434"
echo ""

echo "🔍 Working script uses:"
echo "   - test-staging-transactions.js: port 5434"
echo ""

echo "💡 Checking which port Staging proxy should use..."
if [ -n "$(lsof -ti:6544)" ]; then
  echo "   Port 6544 is in use (Codespaces port)"
elif [ -n "$(lsof -ti:5434)" ]; then
  echo "   Port 5434 is in use (Local port)"
  echo "   ⚠️  Working script uses 5434 - scripts should use 5434!"
else
  echo "   ⚠️  Neither Staging port is running!"
fi
