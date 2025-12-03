#!/bin/bash

##############################################################################
# Verify Staging Password from Secret Manager
# 
# Purpose: Test the password retrieval and see if it's correct
# Usage: ./scripts/verify-staging-password.sh
##############################################################################

set -e

echo "🔍 Verifying Staging Password from Secret Manager"
echo "=================================================="
echo ""

# Get password
echo "Retrieving password..."
PASSWORD_RAW=$(gcloud secrets versions access latest --secret="db-mmtp-pg-staging-password" --project="mymoolah-db")
PASSWORD_TRIMMED=$(echo "$PASSWORD_RAW" | tr -d '\n\r ')

echo "Password length (raw): ${#PASSWORD_RAW} characters"
echo "Password length (trimmed): ${#PASSWORD_TRIMMED} characters"
echo ""
echo "Password (first 10 chars): ${PASSWORD_TRIMMED:0:10}..."
echo "Password (last 10 chars): ...${PASSWORD_TRIMMED: -10}"
echo ""
echo "Hex dump (first 32 bytes):"
echo -n "$PASSWORD_TRIMMED" | head -c 32 | xxd -p | fold -w 2 | head -16
echo ""

# Test if password might have special characters
if echo "$PASSWORD_TRIMMED" | grep -q '[^[:print:]]'; then
  echo "⚠️  Password contains non-printable characters!"
fi

echo ""
echo "💡 If authentication is still failing, the password in Secret Manager"
echo "   might be incorrect. Verify with your team what the correct password should be."
