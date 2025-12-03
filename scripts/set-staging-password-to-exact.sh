#!/bin/bash

##############################################################################
# Set Staging Password to Exact Value Provided by User
# 
# This script will:
# 1. Set Cloud SQL password to: B0t3s@Mymoolahstaging
# 2. Set Secret Manager password to: B0t3s@Mymoolahstaging
# 3. Test the connection
##############################################################################

set -e

PROJECT_ID="mymoolah-db"
INSTANCE_NAME="mmtp-pg-staging"
DB_USER="mymoolah_app"
SECRET_NAME="db-mmtp-pg-staging-password"

# Exact password from user
EXACT_PASSWORD="B0t3s@Mymoolahstaging"

GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo "🔐 Setting Staging Password to Exact Value"
echo "==========================================="
echo ""
echo "Password: $EXACT_PASSWORD"
echo "Database: mymoolah_staging"
echo "User: $DB_USER"
echo ""

# Step 1: Update Cloud SQL password
echo "Step 1: Updating password in Cloud SQL..."
if gcloud sql users set-password "$DB_USER" \
  --instance="$INSTANCE_NAME" \
  --password="$EXACT_PASSWORD" \
  --project="$PROJECT_ID" 2>&1; then
  echo -e "${GREEN}✅ Password updated in Cloud SQL${NC}"
else
  echo -e "${RED}❌ Failed to update Cloud SQL password${NC}"
  exit 1
fi

echo ""
echo "Step 2: Updating password in Secret Manager..."
echo -n "$EXACT_PASSWORD" | gcloud secrets versions add "$SECRET_NAME" \
  --project="$PROJECT_ID" \
  --data-file=- > /dev/null 2>&1

if [ $? -eq 0 ]; then
  echo -e "${GREEN}✅ Password updated in Secret Manager${NC}"
else
  echo -e "${RED}❌ Failed to update Secret Manager password${NC}"
  exit 1
fi

echo ""
echo -e "${YELLOW}⏰ Waiting 30 seconds for Cloud SQL password to propagate...${NC}"
sleep 30

echo ""
echo "Step 3: Testing connection..."
export PGPASSWORD="$EXACT_PASSWORD"

if psql -h 127.0.0.1 -p 6544 -U "$DB_USER" -d mymoolah_staging -c "SELECT current_database(), current_user;" 2>&1; then
  echo ""
  echo -e "${GREEN}✅✅✅ CONNECTION SUCCESSFUL! ✅✅✅${NC}"
  echo ""
  echo "The password $EXACT_PASSWORD is now working!"
else
  echo ""
  echo -e "${RED}❌ Connection still failing${NC}"
  echo ""
  echo "Possible reasons:"
  echo "  1. Password propagation may take longer (wait 1-2 more minutes)"
  echo "  2. Check if proxy is running on port 6544"
  echo "  3. Verify database 'mymoolah_staging' exists"
fi
