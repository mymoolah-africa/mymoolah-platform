#!/bin/bash

##############################################################################
# Test Staging Connection with Exact Password Provided by User
# 
# Password: B0t3s@Mymoolahstaging
# Database: mymoolah_staging  
# User: mymoolah_app
# Port: 6544 (Codespaces)
##############################################################################

echo "🧪 Testing Staging with Exact Password: B0t3s@Mymoolahstaging"
echo "============================================================="
echo ""

# Check proxy
STAGING_RUNNING=$(lsof -ti:6544 2>/dev/null || echo "")
if [ -z "$STAGING_RUNNING" ]; then
  echo "❌ Staging proxy NOT running on port 6544"
  exit 1
fi
echo "✅ Staging proxy running on port 6544"
echo ""

# Use the EXACT password provided by user
EXACT_PASSWORD="B0t3s@Mymoolahstaging"
echo "Using EXACT password provided: $EXACT_PASSWORD"
echo "Password length: ${#EXACT_PASSWORD} characters"
echo ""

# Test connection with exact password
export PGPASSWORD="$EXACT_PASSWORD"

echo "Testing connection to mymoolah_staging database..."
if psql -h 127.0.0.1 -p 6544 -U mymoolah_app -d mymoolah_staging -c "SELECT current_database(), current_user, version();" 2>&1; then
  echo ""
  echo "✅✅✅ CONNECTION SUCCESSFUL WITH EXACT PASSWORD! ✅✅✅"
  echo ""
  echo "This means:"
  echo "   - The password B0t3s@Mymoolahstaging is CORRECT in Cloud SQL"
  echo "   - But Secret Manager must have a DIFFERENT password"
  echo "   - We need to update Secret Manager to match Cloud SQL"
else
  echo ""
  echo "❌ Connection FAILED even with exact password"
  echo ""
  echo "This means Cloud SQL password is NOT 'B0t3s@Mymoolahstaging'"
  echo "The password in Cloud SQL must be something else."
fi
