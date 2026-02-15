#!/usr/bin/env bash
set -euo pipefail

# Create DATABASE_URL secret for production Cloud Run
# This constructs the full connection string from the DB password

PROJECT_ID="mymoolah-db"
REGION="africa-south1"
CLOUD_SQL_INSTANCE="mymoolah-db:${REGION}:mmtp-pg-production"
DB_NAME="mymoolah_production"
DB_USER="mymoolah_app"

echo "📋 Creating database-url-production secret..."

# Get the DB password from Secret Manager
DB_PASSWORD=$(gcloud secrets versions access latest --secret="db-mmtp-pg-production-password" --project="${PROJECT_ID}")

if [ -z "${DB_PASSWORD}" ]; then
  echo "❌ Failed to retrieve db-mmtp-pg-production-password"
  exit 1
fi

# Construct DATABASE_URL for Cloud SQL Unix socket connection
DATABASE_URL="postgres://${DB_USER}:${DB_PASSWORD}@/${DB_NAME}?host=/cloudsql/${CLOUD_SQL_INSTANCE}&sslmode=disable"

# Check if secret already exists
if gcloud secrets describe "database-url-production" --project="${PROJECT_ID}" >/dev/null 2>&1; then
  echo "📋 Secret exists, adding new version..."
  echo -n "${DATABASE_URL}" | gcloud secrets versions add "database-url-production" --data-file=- --project="${PROJECT_ID}"
else
  echo "📋 Creating new secret..."
  echo -n "${DATABASE_URL}" | gcloud secrets create "database-url-production" --data-file=- --replication-policy="automatic" --project="${PROJECT_ID}"
fi

# Grant the production service account access
echo "📋 Granting access to production service account..."
gcloud secrets add-iam-policy-binding "database-url-production" \
  --member="serviceAccount:mymoolah-production-sa@${PROJECT_ID}.iam.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor" \
  --project="${PROJECT_ID}" || true

echo "✅ database-url-production secret created/updated"
echo "📋 Now run: ./scripts/deploy-backend-production-direct.sh"
