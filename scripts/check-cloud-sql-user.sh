#!/bin/bash

##############################################################################
# Check Cloud SQL Users
# 
# Purpose: List all users in the Staging Cloud SQL instance
# Usage: ./scripts/check-cloud-sql-user.sh
##############################################################################

echo "👥 Checking Cloud SQL Users"
echo "============================"
echo ""
echo "Instance: mmtp-pg-staging"
echo "Project: mymoolah-db"
echo ""

echo "Listing all database users:"
echo ""
gcloud sql users list \
  --instance=mmtp-pg-staging \
  --project=mymoolah-db

echo ""
echo "💡 If 'mymoolah_app' is not listed, you may need to create it."
echo "💡 Or the user might exist but with a different password."
