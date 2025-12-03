#!/bin/bash

##############################################################################
# Test gcloud Authentication
# 
# Purpose: Verify gcloud can access Secret Manager
# Usage: ./scripts/test-gcloud-auth.sh
##############################################################################

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo "🧪 Testing gcloud authentication..."
echo ""

# Test 1: Check if authenticated
echo "Test 1: Checking active authentication..."
ACCOUNT=$(gcloud auth list --filter=status:ACTIVE --format="value(account)" 2>/dev/null | head -1)
if [ -n "$ACCOUNT" ]; then
  echo -e "${GREEN}✅ Authenticated as: $ACCOUNT${NC}"
else
  echo -e "${RED}❌ No active authentication found${NC}"
  exit 1
fi
echo ""

# Test 2: Try to access Secret Manager
echo "Test 2: Testing Secret Manager access..."
SECRET_NAME="db-mmtp-pg-staging-password"
PROJECT="mymoolah-db"

if gcloud secrets versions access latest --secret="$SECRET_NAME" --project="$PROJECT" >/dev/null 2>&1; then
  echo -e "${GREEN}✅ Secret Manager access working!${NC}"
  echo ""
  echo "Password preview (first 5 chars):"
  PASSWORD=$(gcloud secrets versions access latest --secret="$SECRET_NAME" --project="$PROJECT" 2>/dev/null)
  echo "${PASSWORD:0:5}..."
else
  echo -e "${RED}❌ Secret Manager access failed${NC}"
  echo ""
  echo "💡 Try running: ./scripts/reauthenticate-gcloud.sh"
  echo "💡 Or: gcloud auth application-default login"
  exit 1
fi

echo ""
echo -e "${GREEN}✅ All authentication tests passed!${NC}"
