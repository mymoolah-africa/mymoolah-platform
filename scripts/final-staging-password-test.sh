#!/bin/bash

##############################################################################
# Final Staging Password Test
# 
# Run this AFTER setting password via Cloud Console UI
# Waits 2 minutes then tests with the working method
##############################################################################

echo "🧪 Final Staging Password Test"
echo "==============================="
echo ""
echo "This assumes you've set the password via Cloud Console UI:"
echo "   Password: B0t3s@Mymoolahstaging"
echo "   Database: mymoolah_staging"
echo "   User: mymoolah_app"
echo ""
echo "⏰ Waiting 2 minutes for Cloud SQL password to propagate..."
sleep 120
echo ""

# Check proxy
if ! lsof -ti:6544 > /dev/null 2>&1; then
  echo "❌ Staging proxy NOT running on port 6544"
  exit 1
fi
echo "✅ Staging proxy running"
echo ""

# Test with the working method (Node.js Sequelize)
echo "Testing connection using Sequelize (working method)..."
node scripts/test-staging-exact-working-method.js 2>&1

if [ $? -eq 0 ]; then
  echo ""
  echo "✅✅✅ SUCCESS! Connection works! ✅✅✅"
else
  echo ""
  echo "❌ Still failing - password in Cloud SQL may be different"
  echo ""
  echo "💡 Verify in Cloud Console:"
  echo "   1. Go to Cloud SQL > mmtp-pg-staging > Users"
  echo "   2. Check password for mymoolah_app"
  echo "   3. Make sure it's exactly: B0t3s@Mymoolahstaging"
fi
