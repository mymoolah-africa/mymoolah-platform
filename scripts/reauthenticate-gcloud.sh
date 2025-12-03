#!/bin/bash

##############################################################################
# Re-authenticate gcloud for Codespaces
# 
# Purpose: Refresh gcloud authentication for non-interactive access
# Usage: ./scripts/reauthenticate-gcloud.sh
##############################################################################

set -e

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo "🔐 Re-authenticating gcloud..."
echo ""

# Check current account
CURRENT_ACCOUNT=$(gcloud config get-value account 2>/dev/null || echo "")
if [ -n "$CURRENT_ACCOUNT" ]; then
  echo "Current account: $CURRENT_ACCOUNT"
  echo ""
fi

echo "Option 1: Login with Application Default Credentials (Recommended for scripts)"
echo "This allows non-interactive access:"
echo ""
gcloud auth application-default login

echo ""
echo -e "${GREEN}✅ Application Default Credentials configured!${NC}"
echo ""
echo "💡 You can also use: gcloud auth login (but this requires interactive browser)"
echo "💡 For service accounts: gcloud auth activate-service-account"
