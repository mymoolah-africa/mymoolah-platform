#!/bin/bash

##############################################################################
# Test with Exact Password Provided
# 
# Password: B0t3s@Mymoolahstaging
# Database: mymoolah_staging
# User: mymoolah_app
# Port: 6544 (Codespaces)
##############################################################################

echo "🧪 Testing with Exact Password: B0t3s@Mymoolahstaging"
echo "====================================================="
echo ""

# Check proxy
STAGING_RUNNING=$(lsof -ti:6544 2>/dev/null || echo "")
if [ -z "$STAGING_RUNNING" ]; then
  echo "❌ Staging proxy NOT running on port 6544"
  exit 1
fi
echo "✅ Staging proxy running on port 6544"
echo ""

# Use the EXACT password provided
EXACT_PASSWORD="B0t3s@Mymoolahstaging"
echo "Using password: $EXACT_PASSWORD"
echo "Password length: ${#EXACT_PASSWORD} characters"
echo ""

# Test connection with exact password
export PGPASSWORD="$EXACT_PASSWORD"

echo "Testing connection to mymoolah_staging database..."
if psql -h 127.0.0.1 -p 6544 -U mymoolah_app -d mymoolah_staging -c "SELECT current_database(), current_user;" 2>&1; then
  echo ""
  echo "✅✅✅ CONNECTION SUCCESSFUL! ✅✅✅"
  echo ""
  echo "The password B0t3s@Mymoolahstaging WORKS!"
else
  echo ""
  echo "❌ Connection still failed with exact password"
  echo ""
  echo "This means:"
  echo "   - Password in Cloud SQL is NOT 'B0t3s@Mymoolahstaging'"
  echo "   - OR there's another issue (permissions, database name, etc.)"
fi
