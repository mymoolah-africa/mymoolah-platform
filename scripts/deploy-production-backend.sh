#!/usr/bin/env bash
set -euo pipefail

# Build and Deploy Production Backend (API)
# Usage: ./scripts/deploy-production-backend.sh [optional-image-tag]
# - Builds backend Docker image (no cache, --pull)
# - Pushes to GCR
# - Deploys to Cloud Run mymoolah-backend-production

PROJECT_ID="mymoolah-db"
REGION="africa-south1"
SERVICE_NAME="mymoolah-backend-production"
SERVICE_ACCOUNT="mymoolah-production-sa@${PROJECT_ID}.iam.gserviceaccount.com"
CLOUD_SQL_INSTANCE="mymoolah-db:${REGION}:mmtp-pg-production"
IMAGE_TAG="${1:-$(date +%Y%m%d-%H%M)}"
IMAGE_NAME="gcr.io/${PROJECT_ID}/mymoolah-backend:${IMAGE_TAG}"

log() { echo "📋 [$(date +'%H:%M:%S')] $*"; }
err() { echo "❌ $*" >&2; exit 1; }

log "🚀 Build and Deploy Production Backend (API)"
log "Project: ${PROJECT_ID}"
log "Image:   ${IMAGE_NAME}"
echo ""

# Checks
gcloud config set project "${PROJECT_ID}" >/dev/null
command -v docker >/dev/null || err "Docker not found"
command -v gcloud >/dev/null || err "gcloud not found"

# Verify .env in .dockerignore (prevents staging DB URL in image)
if ! grep -qE "^\.env$" .dockerignore 2>/dev/null; then
  log "⚠️  Adding .env to .dockerignore"
  echo ".env" >> .dockerignore
fi

# Build optional secrets (only include if secret exists)
build_secrets_args() {
  local base="DATABASE_URL=database-url-production:latest,ZAPPER_API_URL=zapper-prod-api-url:latest,ZAPPER_ORG_ID=zapper-prod-org-id:latest,ZAPPER_API_TOKEN=zapper-prod-api-token:latest,ZAPPER_X_API_KEY=zapper-prod-x-api-key:latest,JWT_SECRET=jwt-secret-production:latest,SESSION_SECRET=session-secret-production:latest,DB_PASSWORD=db-mmtp-pg-production-password:latest,MOBILEMART_CLIENT_ID=mobilemart-prod-client-id:latest,MOBILEMART_CLIENT_SECRET=mobilemart-prod-client-secret:latest,MOBILEMART_API_URL=mobilemart-prod-api-url:latest,MOBILEMART_TOKEN_URL=mobilemart-prod-token-url:latest"
  for name in easypay-api-key-production openai-api-key-production valr-api-key-production valr-api-secret-production; do
    if gcloud secrets describe "${name}" --project="${PROJECT_ID}" >/dev/null 2>&1; then
      case "${name}" in
        easypay-api-key-production) base="${base},EASYPAY_API_KEY=${name}:latest" ;;
        openai-api-key-production)  base="${base},OPENAI_API_KEY=${name}:latest" ;;
        valr-api-key-production)    base="${base},VALR_API_KEY=${name}:latest" ;;
        valr-api-secret-production) base="${base},VALR_API_SECRET=${name}:latest" ;;
      esac
    fi
  done
  echo "${base}"
}

# Step 1: Build and push
log "Building Docker image (no cache, --pull)..."
docker buildx build \
  --no-cache \
  --pull \
  --platform linux/amd64 \
  --tag "${IMAGE_NAME}" \
  --file Dockerfile \
  --push \
  .
log "✅ Image pushed: ${IMAGE_NAME}"
echo ""

# Step 2: Deploy
SECRETS_STR=$(build_secrets_args)
log "Deploying to Cloud Run..."
gcloud run deploy "${SERVICE_NAME}" \
  --image "${IMAGE_NAME}" \
  --platform managed \
  --region "${REGION}" \
  --service-account "${SERVICE_ACCOUNT}" \
  --add-cloudsql-instances "${CLOUD_SQL_INSTANCE}" \
  --set-env-vars "NODE_ENV=production,STAGING=false,CLOUD_SQL_INSTANCE=${CLOUD_SQL_INSTANCE},CORS_ORIGINS=https://wallet-mm.mymoolah.africa,DB_SSL=false,DB_HOST=/cloudsql/${CLOUD_SQL_INSTANCE},DB_NAME=mymoolah_production,DB_USER=mymoolah_app,MOBILEMART_LIVE_INTEGRATION=true,MOBILEMART_SCOPE=api,TLS_ENABLED=false,VAT_RATE=0.15,LEDGER_ACCOUNT_MM_COMMISSION_CLEARING=2200-01-01,LEDGER_ACCOUNT_COMMISSION_REVENUE=4000-10-01,LEDGER_ACCOUNT_VAT_CONTROL=2300-10-01,LEDGER_ACCOUNT_CLIENT_FLOAT=2100-01-01,LEDGER_ACCOUNT_CLIENT_CLEARING=2100-02-01,LEDGER_ACCOUNT_SUPPLIER_CLEARING=2200-02-01,LEDGER_ACCOUNT_INTERCHANGE=1200-05-01,LEDGER_ACCOUNT_BANK=1100-01-01,LEDGER_ACCOUNT_TRANSACTION_FEE_REVENUE=4000-20-01" \
  --set-secrets "${SECRETS_STR}" \
  --memory 1Gi \
  --cpu 1 \
  --min-instances 0 \
  --max-instances 10 \
  --timeout 300 \
  --concurrency 80 \
  --allow-unauthenticated \
  --port 8080

echo ""
log "✅ Production backend deployed"
log "Service URL: $(gcloud run services describe ${SERVICE_NAME} --region ${REGION} --format='value(status.url)')"
log "Production API: https://api-mm.mymoolah.africa"
