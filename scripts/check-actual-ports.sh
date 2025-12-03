#!/bin/bash

##############################################################################
# Check Actual Ports in Use
# 
# Find which ports are actually running for UAT and Staging proxies
##############################################################################

echo "🔍 Checking Actual Ports in Use"
echo "================================"
echo ""

# Check all possible ports
echo "📊 Checking ports:"
echo ""

for PORT in 5433 5434 6543 6544; do
  if PID=$(lsof -ti:$PORT 2>/dev/null); then
    CMD=$(ps -p $PID -o command= 2>/dev/null | head -1)
    INSTANCE=$(echo "$CMD" | grep -o "mmtp-pg[^[:space:]]*" || echo "unknown")
    
    echo "✅ Port $PORT: IN USE"
    echo "   PID: $PID"
    echo "   Instance: $INSTANCE"
    
    # Determine if UAT or Staging
    if [[ "$INSTANCE" == *"staging"* ]]; then
      echo "   → STAGING proxy"
    elif [[ "$INSTANCE" == *"mmtp-pg" ]] && [[ "$INSTANCE" != *"staging"* ]]; then
      echo "   → UAT proxy"
    fi
    echo ""
  else
    echo "❌ Port $PORT: NOT IN USE"
    echo ""
  fi
done

echo "🔑 Key Finding:"
echo "   Working script (test-staging-transactions.js) uses port: 5434"
echo "   Codespaces scripts use port: 6544"
echo ""
echo "💡 ACTION: Use the port that's ACTUALLY running!"
