#!/bin/bash

##############################################################################
# Update Cloud SQL Password Only
# 
# Purpose: Update password in Cloud SQL to match Secret Manager
# Usage: ./scripts/update-cloud-sql-password-only.sh
#
# This script will:
# 1. Retrieve the current password from Secret Manager
# 2. Update the password in Cloud SQL to match
##############################################################################

set -e

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

PROJECT_ID="mymoolah-db"
INSTANCE_NAME="mmtp-pg-staging"
DB_USER="mymoolah_app"
SECRET_NAME="db-mmtp-pg-staging-password"

echo "🔐 Update Cloud SQL Password to Match Secret Manager"
echo "====================================================="
echo ""

# Step 1: Get password from Secret Manager
echo "Step 1: Retrieving password from Secret Manager..."
PASSWORD=$(gcloud secrets versions access latest \
  --secret="$SECRET_NAME" \
  --project="$PROJECT_ID" 2>/dev/null | tr -d '\n\r ' || echo "")

if [ -z "$PASSWORD" ]; then
  echo -e "${RED}❌ Failed to retrieve password from Secret Manager${NC}"
  exit 1
fi

PASSWORD_LENGTH=${#PASSWORD}
echo -e "${GREEN}✅ Password retrieved (length: $PASSWORD_LENGTH characters)${NC}"
echo -e "${BLUE}   First 10 chars: ${PASSWORD:0:10}...${NC}"
echo ""

# Step 2: Update Cloud SQL password
echo "Step 2: Updating password in Cloud SQL database..."
echo -e "${YELLOW}   This will set the Cloud SQL password to match Secret Manager${NC}"
echo ""

if gcloud sql users set-password "$DB_USER" \
  --instance="$INSTANCE_NAME" \
  --password="$PASSWORD" \
  --project="$PROJECT_ID"; then
  echo ""
  echo -e "${GREEN}✅ Password updated in Cloud SQL${NC}"
else
  echo ""
  echo -e "${RED}❌ Failed to update password in Cloud SQL${NC}"
  exit 1
fi

echo ""
echo -e "${GREEN}✅ Password sync completed!${NC}"
echo ""
echo "📋 Next steps:"
echo "   1. Wait 1-2 minutes for password changes to propagate"
echo "   2. Test the connection: ./scripts/test-staging-password-direct.sh"
echo "   3. Run schema comparison: ./scripts/run-compare-schemas-in-codespaces.sh"
