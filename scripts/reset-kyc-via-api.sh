#!/bin/bash

###############################################################################
# KYC Reset Script - Via API Endpoint
###############################################################################
# 
# Purpose: Reset KYC status for a user via API endpoint
#          Uses the running backend server's database connection
#
# Usage:
#   ./scripts/reset-kyc-via-api.sh [USER_ID]
#
# Examples:
#   ./scripts/reset-kyc-via-api.sh        # Reset user ID 1 (default)
#   ./scripts/reset-kyc-via-api.sh 5      # Reset user ID 5
#
# Requirements:
#   - Backend server must be running on port 3001
#   - ADMIN_API_KEY environment variable (or any value if not set)
#
# What it does:
#   1. Deletes all KYC records for the specified user
#   2. Resets wallet KYC verification to false
#   3. Resets user KYC status to 'not_started'
#
# Created: 2025-11-15
# Last Updated: 2025-11-15
#
###############################################################################

# Get user ID from command line argument or default to 1
USER_ID="${1:-1}"

# API endpoint
API_URL="http://localhost:3001/api/v1/kyc/reset/${USER_ID}"

# Get admin key from environment or use default
ADMIN_KEY="${ADMIN_API_KEY:-b0tesa@mymoolah}"

echo "🔄 Resetting KYC status for user ID ${USER_ID} via API..."
echo "📍 Endpoint: ${API_URL}"

# Make API call
RESPONSE=$(curl -X POST "${API_URL}" \
  -H "Content-Type: application/json" \
  -H "x-admin-key: ${ADMIN_KEY}" \
  -w "\n" \
  -s)

# Check if response indicates success
if echo "$RESPONSE" | grep -q '"success":true'; then
  echo "✅ KYC reset completed successfully!"
  echo "$RESPONSE" | jq '.' 2>/dev/null || echo "$RESPONSE"
else
  echo "❌ KYC reset failed!"
  echo "$RESPONSE"
  exit 1
fi

