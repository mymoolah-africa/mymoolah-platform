#!/bin/bash

##############################################################################
# Debug Staging Password Authentication
# 
# Purpose: Help diagnose why Staging password authentication is failing
# Usage: ./scripts/debug-staging-auth.sh
##############################################################################

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo "🔍 Debugging Staging Password Authentication"
echo "============================================"
echo ""

# Check proxy
STAGING_RUNNING=$(lsof -ti:6544 2>/dev/null || echo "")
if [ -z "$STAGING_RUNNING" ]; then
  echo -e "${RED}❌ Staging proxy NOT running on port 6544${NC}"
  exit 1
fi
echo -e "${GREEN}✅ Staging proxy running on port 6544${NC}"
echo ""

# Get password
echo "1. Retrieving password from Secret Manager..."
PASSWORD=$(gcloud secrets versions access latest --secret="db-mmtp-pg-staging-password" --project="mymoolah-db" 2>&1)
PASSWORD_LENGTH=${#PASSWORD}

if [ $PASSWORD_LENGTH -eq 0 ]; then
  echo -e "${RED}❌ Failed to retrieve password${NC}"
  echo "$PASSWORD"
  exit 1
fi

echo -e "${GREEN}✅ Password retrieved (length: $PASSWORD_LENGTH characters)${NC}"
echo -e "${BLUE}   First 5 chars: ${PASSWORD:0:5}...${NC}"
echo -e "${BLUE}   Last 5 chars: ...${PASSWORD: -5}${NC}"
echo ""

# Check for hidden characters
echo "2. Checking for hidden characters..."
if echo "$PASSWORD" | grep -q $'\r'; then
  echo -e "${YELLOW}⚠️  Password contains carriage return (\\r)${NC}"
fi
if echo "$PASSWORD" | grep -q $'\n'; then
  echo -e "${YELLOW}⚠️  Password contains newline (\\n)${NC}"
fi
PASSWORD_TRIMMED=$(echo "$PASSWORD" | tr -d '\n\r ')
TRIMMED_LENGTH=${#PASSWORD_TRIMMED}
if [ "$PASSWORD_LENGTH" != "$TRIMMED_LENGTH" ]; then
  echo -e "${YELLOW}⚠️  Password has whitespace (original: $PASSWORD_LENGTH, trimmed: $TRIMMED_LENGTH)${NC}"
else
  echo -e "${GREEN}✅ No whitespace issues detected${NC}"
fi
echo ""

# Test connection
echo "3. Testing database connection..."
if command -v psql &> /dev/null; then
  export PGPASSWORD="$PASSWORD"
  CONNECTION_TEST=$(psql -h 127.0.0.1 -p 6544 -U mymoolah_app -d mymoolah_staging -c "SELECT 1;" 2>&1)
  
  if echo "$CONNECTION_TEST" | grep -q "authentication failed"; then
    echo -e "${RED}❌ Authentication failed${NC}"
    echo ""
    echo "Error details:"
    echo "$CONNECTION_TEST"
    echo ""
    echo -e "${YELLOW}💡 Possible issues:${NC}"
    echo "   - Password in Secret Manager might be incorrect"
    echo "   - Database user 'mymoolah_app' might not exist"
    echo "   - Password might have special characters that need encoding"
  elif echo "$CONNECTION_TEST" | grep -q "ERROR"; then
    echo -e "${RED}❌ Connection error${NC}"
    echo "$CONNECTION_TEST"
  else
    echo -e "${GREEN}✅ Connection successful!${NC}"
  fi
else
  echo -e "${YELLOW}⚠️  psql not available - cannot test connection${NC}"
fi

echo ""
echo "4. Summary:"
echo "   Proxy: Running on port 6544"
echo "   Password: Retrieved ($PASSWORD_LENGTH chars)"
echo "   User: mymoolah_app"
echo "   Database: mymoolah_staging"
