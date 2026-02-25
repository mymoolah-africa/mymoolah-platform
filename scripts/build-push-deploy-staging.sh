#!/usr/bin/env bash
set -euo pipefail

# Build (no cache) and deploy backend to Cloud Run Staging
# Usage: ./scripts/build-push-deploy-staging.sh [optional-image-tag]
# - Runs locally on Mac where gcloud + Docker Desktop are available
# - Builds linux/amd64, pushes to GCR, then deploys to Cloud Run staging

PROJECT_ID="mymoolah-db"
REGION="africa-south1"
SERVICE_NAME="mymoolah-backend-staging"
SERVICE_ACCOUNT="mymoolah-staging-sa@${PROJECT_ID}.iam.gserviceaccount.com"
CLOUD_SQL_INSTANCE="mymoolah-db:${REGION}:mmtp-pg-staging"
IMAGE_TAG="${1:-$(date +%Y%m%d-%H%M)}"
IMAGE_NAME="gcr.io/${PROJECT_ID}/mymoolah-backend:${IMAGE_TAG}"

log() { echo "📋 [$((SECONDS))s] $*"; }
err() { echo "❌ $*" >&2; exit 1; }

log "Project: ${PROJECT_ID}"
log "Image:   ${IMAGE_NAME}"

# Checks
gcloud config set project "${PROJECT_ID}" >/dev/null
command -v docker >/dev/null || err "Docker not found"
command -v gcloud >/dev/null || err "gcloud not found"

# Build & push (no cache)
log "Building (no cache) and pushing image..."
docker buildx build \
  --no-cache \
  --platform linux/amd64 \
  --tag "${IMAGE_NAME}" \
  --file Dockerfile \
  --push \
  .
log "Image pushed: ${IMAGE_NAME}"

# Deploy to Cloud Run Staging
log "Deploying to Cloud Run (staging)..."
gcloud run deploy "${SERVICE_NAME}" \
  --image "${IMAGE_NAME}" \
  --platform managed \
  --region "${REGION}" \
  --service-account "${SERVICE_ACCOUNT}" \
  --add-cloudsql-instances "${CLOUD_SQL_INSTANCE}" \
  --set-env-vars "NODE_ENV=production,STAGING=true,CLOUD_SQL_INSTANCE=${CLOUD_SQL_INSTANCE},CORS_ORIGINS=https://stagingwallet.mymoolah.africa,DB_SSL=false,DB_HOST=/cloudsql/${CLOUD_SQL_INSTANCE},DB_NAME=mymoolah_staging,DB_USER=mymoolah_app,MOBILEMART_LIVE_INTEGRATION=true,MOBILEMART_SCOPE=api,TLS_ENABLED=false,VAT_RATE=0.15,LEDGER_ACCOUNT_MM_COMMISSION_CLEARING=2200-01-01,LEDGER_ACCOUNT_COMMISSION_REVENUE=4000-10-01,LEDGER_ACCOUNT_VAT_CONTROL=2300-10-01,LEDGER_ACCOUNT_CLIENT_FLOAT=2100-01-01,LEDGER_ACCOUNT_CLIENT_CLEARING=2100-02-01,LEDGER_ACCOUNT_SUPPLIER_CLEARING=2200-02-01,LEDGER_ACCOUNT_INTERCHANGE=1200-05-01,LEDGER_ACCOUNT_BANK=1100-01-01,LEDGER_ACCOUNT_TRANSACTION_FEE_REVENUE=4000-20-01,FLASH_LIVE_INTEGRATION=true,LEDGER_ACCOUNT_FLASH_FLOAT=1200-10-04" \
  --set-secrets "ZAPPER_API_URL=zapper-prod-api-url:latest,ZAPPER_ORG_ID=zapper-prod-org-id:latest,ZAPPER_API_TOKEN=zapper-prod-api-token:latest,ZAPPER_X_API_KEY=zapper-prod-x-api-key:latest,JWT_SECRET=jwt-secret-staging:latest,SESSION_SECRET=session-secret-staging:latest,DB_PASSWORD=db-mmtp-pg-staging-password:latest,MOBILEMART_CLIENT_ID=mobilemart-prod-client-id:latest,MOBILEMART_CLIENT_SECRET=mobilemart-prod-client-secret:latest,MOBILEMART_API_URL=mobilemart-prod-api-url:latest,MOBILEMART_TOKEN_URL=mobilemart-prod-token-url:latest,OPENAI_API_KEY=openai-api-key-staging:latest,EASYPAY_API_KEY=easypay-api-key-staging:latest,FLASH_CONSUMER_KEY=FLASH_CONSUMER_KEY:latest,FLASH_CONSUMER_SECRET=FLASH_CONSUMER_SECRET:latest,FLASH_ACCOUNT_NUMBER=FLASH_ACCOUNT_NUMBER:latest,FLASH_API_URL=FLASH_API_URL:latest" \
  --memory 1Gi \
  --cpu 1 \
  --min-instances 0 \
  --max-instances 10 \
  --timeout 300 \
  --concurrency 80 \
  --allow-unauthenticated \
  --port 8080

log "Deploy complete. Current service URL:"
gcloud run services describe "${SERVICE_NAME}" --region "${REGION}" --format="value(status.url)"
