#!/bin/bash

##############################################################################
# Complete gcloud Authentication Fix for Codespaces
# 
# Purpose: Fix both Application Default Credentials AND user account auth
# Usage: ./scripts/fix-gcloud-auth-complete.sh
#
# This script will:
# 1. Check current auth status
# 2. Refresh user account auth (if needed)
# 3. Set up Application Default Credentials (if needed)
# 4. Test Secret Manager access
##############################################################################

set -e

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo "🔐 Complete gcloud Authentication Fix"
echo "======================================"
echo ""

# Step 1: Check current account
echo "Step 1: Checking current authentication..."
CURRENT_ACCOUNT=$(gcloud config get-value account 2>/dev/null || echo "")
if [ -n "$CURRENT_ACCOUNT" ]; then
  echo -e "${GREEN}Current account: $CURRENT_ACCOUNT${NC}"
else
  echo -e "${RED}No account configured${NC}"
fi
echo ""

# Step 2: Try to refresh user account
echo "Step 2: Refreshing user account credentials..."
echo -e "${YELLOW}⚠️  Note: This may require interactive browser login${NC}"
echo ""

# Check if we can access secrets without refresh
echo "Testing current access..."
if gcloud secrets versions access latest --secret="db-mmtp-pg-staging-password" --project="mymoolah-db" >/dev/null 2>&1; then
  echo -e "${GREEN}✅ User account credentials are working!${NC}"
  USER_AUTH_OK=true
else
  echo -e "${YELLOW}⚠️  User account credentials need refresh${NC}"
  USER_AUTH_OK=false
fi
echo ""

if [ "$USER_AUTH_OK" = false ]; then
  echo -e "${BLUE}Attempting to refresh credentials...${NC}"
  echo ""
  
  # Try to list accounts - if multiple, we can use existing
  ACCOUNTS=$(gcloud auth list --format="value(account)" 2>/dev/null || echo "")
  
  if [ -n "$ACCOUNTS" ]; then
    echo "Found authenticated accounts:"
    echo "$ACCOUNTS" | while read account; do
      echo "  - $account"
    done
    echo ""
    
    # Use the first account
    FIRST_ACCOUNT=$(echo "$ACCOUNTS" | head -1)
    echo "Setting active account to: $FIRST_ACCOUNT"
    gcloud config set account "$FIRST_ACCOUNT" 2>/dev/null || true
    
    echo ""
    echo -e "${YELLOW}If credentials still expired, you need to run manually:${NC}"
    echo "  gcloud auth login"
    echo ""
    echo "This will open a browser for interactive login."
  else
    echo -e "${RED}No authenticated accounts found${NC}"
    echo ""
    echo -e "${YELLOW}Please run manually in an interactive terminal:${NC}"
    echo "  gcloud auth login"
    echo ""
    exit 1
  fi
fi

# Step 3: Set up Application Default Credentials
echo "Step 3: Setting up Application Default Credentials..."
if [ -f "$HOME/.config/gcloud/application_default_credentials.json" ]; then
  echo -e "${GREEN}✅ Application Default Credentials already exist${NC}"
else
  echo "Setting up Application Default Credentials..."
  echo -e "${YELLOW}⚠️  This will open a browser window${NC}"
  gcloud auth application-default login 2>/dev/null || {
    echo -e "${YELLOW}⚠️  Could not set up Application Default Credentials automatically${NC}"
    echo "   You may need to run manually: gcloud auth application-default login"
  }
fi
echo ""

# Step 4: Final test
echo "Step 4: Testing Secret Manager access..."
SECRET_NAME="db-mmtp-pg-staging-password"
PROJECT="mymoolah-db"

if gcloud secrets versions access latest --secret="$SECRET_NAME" --project="$PROJECT" >/dev/null 2>&1; then
  echo -e "${GREEN}✅ Secret Manager access working!${NC}"
  echo ""
  PASSWORD_PREVIEW=$(gcloud secrets versions access latest --secret="$SECRET_NAME" --project="$PROJECT" 2>/dev/null | head -c 5)
  echo "Password preview: ${PASSWORD_PREVIEW}... (first 5 chars)"
  echo ""
  echo -e "${GREEN}✅ All authentication is working!${NC}"
else
  echo -e "${RED}❌ Secret Manager access still failing${NC}"
  echo ""
  echo -e "${YELLOW}Manual steps required:${NC}"
  echo "1. Run in an interactive terminal:"
  echo "   gcloud auth login"
  echo ""
  echo "2. This will open your browser - complete the login"
  echo ""
  echo "3. Then test again:"
  echo "   gcloud secrets versions access latest --secret=\"db-mmtp-pg-staging-password\" --project=\"mymoolah-db\""
  exit 1
fi
