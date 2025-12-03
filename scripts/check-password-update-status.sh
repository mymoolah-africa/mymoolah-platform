#!/bin/bash

##############################################################################
# Check Password Update Status
# 
# Purpose: Verify if password update actually worked in Cloud SQL
# Usage: ./scripts/check-password-update-status.sh
##############################################################################

echo "🔍 Checking Password Update Status"
echo "==================================="
echo ""

# Check Secret Manager password
echo "1. Password in Secret Manager:"
SECRET_PW=$(gcloud secrets versions access latest \
  --secret="db-mmtp-pg-staging-password" \
  --project="mymoolah-db" 2>/dev/null | tr -d '\n\r ')
echo "   Length: ${#SECRET_PW} characters"
echo "   First 10: ${SECRET_PW:0:10}..."
echo ""

# Check Cloud SQL user
echo "2. Cloud SQL User Status:"
gcloud sql users list \
  --instance=mmtp-pg-staging \
  --project=mymoolah-db 2>&1 | grep mymoolah_app || echo "   User not found"
echo ""

echo "💡 Note: Cloud SQL doesn't expose password details for security."
echo ""
echo "💡 If authentication is still failing, try:"
echo "   1. Verify password update command succeeded (check for errors)"
echo "   2. Wait 5-10 minutes for propagation"
echo "   3. Check if password needs to be reset again"
echo ""
echo "💡 Alternative: Try updating password via Google Cloud Console UI"
echo "   (Sometimes UI updates work better than CLI)"
