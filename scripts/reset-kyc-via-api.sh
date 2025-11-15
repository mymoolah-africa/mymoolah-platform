#!/bin/bash

# Reset KYC for user ID 1 via API endpoint
# This uses the running backend server's database connection

USER_ID=1
API_URL="http://localhost:3001/api/v1/kyc/reset/${USER_ID}"

# Get admin key from environment or use default
ADMIN_KEY="${ADMIN_API_KEY:-your-admin-key-here}"

echo "🔄 Resetting KYC status for user ID ${USER_ID} via API..."

curl -X POST "${API_URL}" \
  -H "Content-Type: application/json" \
  -H "x-admin-key: ${ADMIN_KEY}" \
  -w "\n" \
  -s

echo ""
echo "✅ Done!"

