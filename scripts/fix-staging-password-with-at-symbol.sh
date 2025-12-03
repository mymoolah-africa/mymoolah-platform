#!/bin/bash

##############################################################################
# Fix Staging Password - Handle @ Symbol Correctly
# 
# The password B0t3s@Mymoolahstaging contains "@" which can be problematic.
# This script ensures the password is set and tested correctly.
##############################################################################

set -e

PROJECT_ID="mymoolah-db"
INSTANCE_NAME="mmtp-pg-staging"
DB_USER="mymoolah_app"
SECRET_NAME="db-mmtp-pg-staging-password"

# Exact password - with @ symbol
RAW_PASSWORD="B0t3s@Mymoolahstaging"

GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo "🔐 Fixing Staging Password with @ Symbol"
echo "========================================="
echo ""
echo "Password: $RAW_PASSWORD"
echo "Note: Password contains '@' which requires special handling"
echo ""

# Step 1: Verify what's currently in Secret Manager
echo "Step 1: Checking current Secret Manager password..."
CURRENT_SECRET=$(gcloud secrets versions access latest --secret="$SECRET_NAME" --project="$PROJECT_ID" 2>/dev/null | tr -d '\n\r ' || echo "")
echo "   Current Secret Manager: ${CURRENT_SECRET:0:10}... (length: ${#CURRENT_SECRET})"
echo "   Expected password:      ${RAW_PASSWORD:0:10}... (length: ${#RAW_PASSWORD})"

if [ "$CURRENT_SECRET" != "$RAW_PASSWORD" ]; then
  echo "   ⚠️  Secret Manager doesn't match - updating..."
  echo -n "$RAW_PASSWORD" | gcloud secrets versions add "$SECRET_NAME" --project="$PROJECT_ID" --data-file=- > /dev/null 2>&1
  echo "   ✅ Secret Manager updated"
else
  echo "   ✅ Secret Manager matches"
fi

echo ""
echo "Step 2: Setting password in Cloud SQL (with proper quoting)..."
# Use printf to ensure @ symbol is passed correctly without bash interpretation
if printf '%s' "$RAW_PASSWORD" | gcloud sql users set-password "$DB_USER" \
  --instance="$INSTANCE_NAME" \
  --password="$(printf '%s' "$RAW_PASSWORD")" \
  --project="$PROJECT_ID" 2>&1; then
  echo -e "${GREEN}✅ Password set in Cloud SQL${NC}"
else
  echo -e "${RED}❌ Failed to set password${NC}"
  exit 1
fi

echo ""
echo -e "${YELLOW}⏰ Waiting 45 seconds for Cloud SQL password to propagate...${NC}"
sleep 45

echo ""
echo "Step 3: Testing connection methods..."
echo ""

# Method 1: Direct psql with PGPASSWORD (raw password)
echo "Method 1: Testing with PGPASSWORD (raw password)..."
export PGPASSWORD="$RAW_PASSWORD"
if psql -h 127.0.0.1 -p 6544 -U "$DB_USER" -d mymoolah_staging -c "SELECT current_database(), current_user;" 2>&1 | grep -q "mymoolah_staging"; then
  echo -e "${GREEN}✅ Method 1: Connection works with raw password!${NC}"
  exit 0
else
  echo -e "${RED}❌ Method 1: Failed with raw password${NC}"
fi

# Method 2: URL-encoded password in connection string
echo ""
echo "Method 2: Testing with URL-encoded password (%40 for @)..."
# URL encode @ as %40
ENCODED_PASSWORD=$(printf '%s' "$RAW_PASSWORD" | python3 -c "import sys, urllib.parse; print(urllib.parse.quote(sys.stdin.read().strip(), safe=''))" 2>/dev/null || echo "$RAW_PASSWORD")
echo "   Encoded password: ${ENCODED_PASSWORD:0:15}..."
export PGPASSWORD="$RAW_PASSWORD"  # Still use raw for PGPASSWORD
CONNECTION_URL="postgres://${DB_USER}:${ENCODED_PASSWORD}@127.0.0.1:6544/mymoolah_staging?sslmode=disable"
if psql "$CONNECTION_URL" -c "SELECT current_database(), current_user;" 2>&1 | grep -q "mymoolah_staging"; then
  echo -e "${GREEN}✅ Method 2: Connection works with URL-encoded password!${NC}"
  echo ""
  echo "💡 The password needs to be URL-encoded when used in connection URLs"
  echo "   But Cloud SQL should store the RAW password (with @)"
  exit 0
else
  echo -e "${RED}❌ Method 2: Failed with URL-encoded password${NC}"
fi

# Method 3: Check if Cloud SQL actually stored the password correctly
echo ""
echo "Method 3: Verifying password was stored correctly in Cloud SQL..."
echo "   ⚠️  Cannot directly verify Cloud SQL stored password"
echo "   💡 May need to check via Cloud Console UI"
echo ""
echo -e "${YELLOW}Possible solutions:${NC}"
echo "1. Wait 1-2 more minutes for password propagation"
echo "2. Set password via Cloud Console UI (more reliable for special chars)"
echo "3. Verify the password in Cloud SQL matches exactly: B0t3s@Mymoolahstaging"
