#!/bin/bash

##############################################################################
# Comprehensive Password Diagnosis
# 
# Purpose: Diagnose why password authentication is still failing
# Usage: ./scripts/diagnose-password-issue.sh
##############################################################################

set -e

echo "🔍 Comprehensive Password Diagnosis"
echo "===================================="
echo ""

# Step 1: Get password from Secret Manager
echo "Step 1: Retrieving password from Secret Manager..."
PASSWORD_RAW=$(gcloud secrets versions access latest \
  --secret="db-mmtp-pg-staging-password" \
  --project="mymoolah-db" 2>&1)

PASSWORD=$(echo -n "$PASSWORD_RAW" | tr -d '\n\r\t ')

echo "✅ Password retrieved"
echo "   Raw length: ${#PASSWORD_RAW} characters"
echo "   Trimmed length: ${#PASSWORD} characters"
echo "   First 10 chars: ${PASSWORD:0:10}..."
echo "   Last 10 chars: ...${PASSWORD: -10}"
echo "   Contains @: $([ "$PASSWORD" != "${PASSWORD/@/}" ] && echo "YES" || echo "NO")"
echo ""

# Step 2: Check password contents for special characters
echo "Step 2: Analyzing password for special characters..."
echo "   Full password (visible): $PASSWORD"
echo "   Password hex dump:"
echo -n "$PASSWORD" | xxd -p | fold -w 2 | head -20
echo ""

# Step 3: Verify Cloud SQL user exists and check last update
echo "Step 3: Verifying Cloud SQL user configuration..."
gcloud sql users list \
  --instance=mmtp-pg-staging \
  --project=mymoolah-db 2>&1 | grep mymoolah_app || echo "   ⚠️  User not found in list"
echo ""

# Step 4: Try connection with explicit password handling
echo "Step 4: Testing connection methods..."
echo ""

# Method 1: Using PGPASSWORD
echo "   Method 1: Using PGPASSWORD environment variable..."
export PGPASSWORD="$PASSWORD"
if psql -h 127.0.0.1 -p 6544 -U mymoolah_app -d mymoolah_staging -c "SELECT current_user;" >/dev/null 2>&1; then
  echo "   ✅ Connection works with PGPASSWORD"
else
  ERROR=$(psql -h 127.0.0.1 -p 6544 -U mymoolah_app -d mymoolah_staging -c "SELECT 1;" 2>&1)
  echo "   ❌ Failed: $(echo "$ERROR" | grep FATAL || echo "$ERROR")"
fi
echo ""

# Method 2: Using connection string with URL encoding
echo "   Method 2: Using connection string (URL encoded)..."
PASSWORD_URL_ENCODED=$(printf '%s' "$PASSWORD" | jq -sRr @uri 2>/dev/null || echo "$PASSWORD")
CONNECTION_STRING="postgresql://mymoolah_app:${PASSWORD_URL_ENCODED}@127.0.0.1:6544/mymoolah_staging?sslmode=disable"
if psql "$CONNECTION_STRING" -c "SELECT current_user;" >/dev/null 2>&1; then
  echo "   ✅ Connection works with URL-encoded connection string"
else
  ERROR=$(psql "$CONNECTION_STRING" -c "SELECT 1;" 2>&1)
  echo "   ❌ Failed: $(echo "$ERROR" | grep FATAL || echo "$ERROR")"
fi
echo ""

# Step 5: Check if password needs to be reset via Cloud Console
echo "Step 5: Recommendations..."
echo ""
echo "💡 If both methods failed, try:"
echo "   1. Reset password via Cloud Console UI (more reliable)"
echo "   2. Use a password without special characters (no @, $, etc.)"
echo "   3. Check Cloud SQL logs for authentication errors"
echo "   4. Verify the password update actually took effect in Cloud SQL"
echo ""
