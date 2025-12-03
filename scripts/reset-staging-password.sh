#!/bin/bash

##############################################################################
# Reset Staging Database Password
# 
# Purpose: Generate new password and update both Cloud SQL and Secret Manager
# Usage: ./scripts/reset-staging-password.sh
#
# This script will:
# 1. Generate a new secure password
# 2. Update the password in Cloud SQL database
# 3. Update the password in Secret Manager
# 4. Verify the update
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

echo "🔐 Reset Staging Database Password"
echo "==================================="
echo ""
echo "This script will:"
echo "  1. Generate a new secure password"
echo "  2. Update password in Cloud SQL database"
echo "  3. Update password in Secret Manager"
echo ""

# Confirm before proceeding
read -p "Do you want to proceed? (yes/no): " CONFIRM
CONFIRM_LOWER=$(echo "$CONFIRM" | tr '[:upper:]' '[:lower:]')
if [ "$CONFIRM_LOWER" != "yes" ] && [ "$CONFIRM_LOWER" != "y" ]; then
  echo "Cancelled."
  exit 0
fi

echo ""
echo "Step 1: Generating new secure password..."
NEW_PASSWORD=$(openssl rand -base64 48 | tr -d "=+/" | cut -c1-64)
PASSWORD_LENGTH=${#NEW_PASSWORD}

echo -e "${GREEN}✅ Password generated (length: $PASSWORD_LENGTH characters)${NC}"
echo -e "${BLUE}   First 10 chars: ${NEW_PASSWORD:0:10}...${NC}"
echo -e "${BLUE}   Last 10 chars: ...${NEW_PASSWORD: -10}${NC}"
echo ""
echo -e "${YELLOW}⚠️  IMPORTANT: Save this password securely!${NC}"
echo "   Password: $NEW_PASSWORD"
echo ""

# Confirm password before proceeding
read -p "Have you saved the password? Continue with update? (yes/no): " CONFIRM2
CONFIRM2_LOWER=$(echo "$CONFIRM2" | tr '[:upper:]' '[:lower:]')
if [ "$CONFIRM2_LOWER" != "yes" ] && [ "$CONFIRM2_LOWER" != "y" ]; then
  echo "Cancelled."
  exit 0
fi

echo ""
echo "Step 2: Updating password in Cloud SQL database..."
if gcloud sql users set-password "$DB_USER" \
  --instance="$INSTANCE_NAME" \
  --password="$NEW_PASSWORD" \
  --project="$PROJECT_ID" >/dev/null 2>&1; then
  echo -e "${GREEN}✅ Password updated in Cloud SQL${NC}"
else
  echo -e "${RED}❌ Failed to update password in Cloud SQL${NC}"
  echo "   Error details:"
  gcloud sql users set-password "$DB_USER" \
    --instance="$INSTANCE_NAME" \
    --password="$NEW_PASSWORD" \
    --project="$PROJECT_ID" 2>&1 || true
  exit 1
fi

echo ""
echo "Step 3: Updating password in Secret Manager..."
if echo -n "$NEW_PASSWORD" | gcloud secrets versions add "$SECRET_NAME" \
  --project="$PROJECT_ID" \
  --data-file=- >/dev/null 2>&1; then
  echo -e "${GREEN}✅ Password updated in Secret Manager${NC}"
else
  echo -e "${RED}❌ Failed to update password in Secret Manager${NC}"
  echo "   Error details:"
  echo -n "$NEW_PASSWORD" | gcloud secrets versions add "$SECRET_NAME" \
    --project="$PROJECT_ID" \
    --data-file=- 2>&1 || true
  exit 1
fi

echo ""
echo "Step 4: Verifying the update..."
sleep 2  # Wait a moment for Secret Manager to update

RETRIEVED_PASSWORD=$(gcloud secrets versions access latest \
  --secret="$SECRET_NAME" \
  --project="$PROJECT_ID" 2>/dev/null | tr -d '\n\r ' || echo "")

if [ "$RETRIEVED_PASSWORD" = "$NEW_PASSWORD" ]; then
  echo -e "${GREEN}✅ Password verified in Secret Manager${NC}"
else
  echo -e "${YELLOW}⚠️  Warning: Retrieved password doesn't match${NC}"
  echo "   This might be a timing issue. Please verify manually."
fi

echo ""
echo -e "${GREEN}✅ Password reset completed!${NC}"
echo ""
echo "📋 Next steps:"
echo "   1. Test the connection: ./scripts/test-staging-password-direct.sh"
echo "   2. Run schema comparison: ./scripts/run-compare-schemas-in-codespaces.sh"
echo "   3. Run sync script: ./scripts/run-sync-in-codespaces.sh --dry-run"
echo ""
echo -e "${YELLOW}⚠️  Remember: Save the password in a secure location!${NC}"
echo "   Password: $NEW_PASSWORD"
