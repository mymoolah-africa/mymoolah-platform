#!/usr/bin/env bash
set -euo pipefail

# Build and Deploy MyMoolah Backend to Cloud Run
# Run from: LOCAL MAC (Docker + gcloud required)
# Usage: ./scripts/deploy-backend.sh [--staging | --production] [optional-image-tag]

ENVIRONMENT=""
IMAGE_TAG="$(date +%Y%m%d-%H%M)"

for arg in "$@"; do
  case $arg in
    --staging)
      ENVIRONMENT="staging"
      ;;
    --production)
      ENVIRONMENT="production"
      ;;
    *)
      if [[ -z "$ENVIRONMENT" && "$arg" != -* ]]; then
          ENVIRONMENT="$arg" # fallback if they didn't use flag
      else
          IMAGE_TAG="$arg"
      fi
      ;;
  esac
done

if [[ "$ENVIRONMENT" != "staging" && "$ENVIRONMENT" != "production" ]]; then
  echo "❌ Error: Please specify environment with --staging or --production" >&2
  exit 1
fi

PROJECT_ID="mymoolah-db"
REGION="africa-south1"
SERVICE_NAME="mymoolah-backend-${ENVIRONMENT}"
SERVICE_ACCOUNT="mymoolah-${ENVIRONMENT}-sa@${PROJECT_ID}.iam.gserviceaccount.com"
CLOUD_SQL_INSTANCE="mymoolah-db:${REGION}:mmtp-pg-${ENVIRONMENT}"
IMAGE_NAME="gcr.io/${PROJECT_ID}/mymoolah-backend:${IMAGE_TAG}"

if [ "$ENVIRONMENT" == "staging" ]; then
  CORS_ORIGINS="https://stagingwallet.mymoolah.africa"
  STAGING_FLAG="true"
else
  CORS_ORIGINS="https://wallet.mymoolah.africa"
  STAGING_FLAG="false"
fi

log() { echo "📋 [$((SECONDS))s] $*"; }
err() { echo "❌ $*" >&2; exit 1; }

ENV_UPPER=$(echo "$ENVIRONMENT" | tr '[:lower:]' '[:upper:]')
log "🚀 Build and Deploy Backend -> ${ENV_UPPER}"
log "Project: ${PROJECT_ID}"
log "Image:   ${IMAGE_NAME}"
echo ""

# Checks
command -v docker >/dev/null || err "Docker not found"
docker info >/dev/null 2>&1 || err "Docker daemon is not running"
command -v gcloud >/dev/null || err "gcloud not found"

# Authenticate with Google Cloud
ensure_gcloud_auth() {
  local active_account
  active_account=$(gcloud auth list --filter=status:ACTIVE --format="value(account)" 2>/dev/null || true)

  if [ -n "$active_account" ]; then
    log "✅ Authenticated as: ${active_account}"
  else
    log "⚠️  No active gcloud authentication found"
    if [ -t 0 ] && [ -t 1 ]; then
      log "Starting interactive login..."
      if gcloud auth login --no-launch-browser; then
        log "✅ Authentication successful"
      else
        err "gcloud auth login failed. Please run manually: gcloud auth login"
      fi
    else
      err "No active gcloud auth (non-interactive). Run: gcloud auth login"
    fi
  fi

  local current_project
  current_project=$(gcloud config get-value project 2>/dev/null || true)
  if [ "$current_project" != "${PROJECT_ID}" ]; then
    log "Setting project to ${PROJECT_ID}..."
    gcloud config set project "${PROJECT_ID}" >/dev/null 2>&1 || err "Failed to set project"
  fi
  log "✅ Project: ${PROJECT_ID}"

  # Configure Docker to use gcloud credentials for GCR
  log "Configuring Docker for GCR authentication..."
  gcloud auth configure-docker gcr.io --quiet 2>/dev/null || true
  log "✅ Docker configured for gcr.io"
}

ensure_gcloud_auth

# Verify .env in .dockerignore
if ! grep -qE "^\.env$" .dockerignore 2>/dev/null; then
  log "⚠️  Adding .env to .dockerignore"
  echo ".env" >> .dockerignore
fi

# Build secrets string dynamically based on environment
build_secrets_args() {
  local ext=""
  if [ "$ENVIRONMENT" == "production" ]; then
    ext="-production"
  else
    ext="-staging"
  fi

  local base="ZAPPER_API_URL=zapper-prod-api-url:latest,ZAPPER_ORG_ID=zapper-prod-org-id:latest,ZAPPER_API_TOKEN=zapper-prod-api-token:latest,ZAPPER_X_API_KEY=zapper-prod-x-api-key:latest,MOBILEMART_CLIENT_ID=mobilemart-prod-client-id:latest,MOBILEMART_CLIENT_SECRET=mobilemart-prod-client-secret:latest,MOBILEMART_API_URL=mobilemart-prod-api-url:latest,MOBILEMART_TOKEN_URL=mobilemart-prod-token-url:latest,FLASH_CONSUMER_KEY=FLASH_CONSUMER_KEY:latest,FLASH_CONSUMER_SECRET=FLASH_CONSUMER_SECRET:latest,FLASH_ACCOUNT_NUMBER=FLASH_ACCOUNT_NUMBER:latest,FLASH_API_URL=FLASH_API_URL:latest,FLASH_TOKEN_URL=FLASH_TOKEN_URL:latest,VAS_FAILOVER_ENABLED=vas-failover-enabled:latest"
  
  # Environment specific base secrets
  if [ "$ENVIRONMENT" == "production" ]; then
    base="${base},JWT_SECRET=jwt-secret-production:latest,SESSION_SECRET=session-secret-production:latest,DB_PASSWORD=db-mmtp-pg-production-password:latest"
  else
    base="${base},JWT_SECRET=jwt-secret-staging:latest,SESSION_SECRET=session-secret-staging:latest,DB_PASSWORD=db-mmtp-pg-staging-password:latest"
  fi

  for name in "easypay-api-key${ext}" "openai-api-key${ext}" "valr-api-key${ext}" "valr-api-secret${ext}"; do
    if gcloud secrets describe "${name}" --project="${PROJECT_ID}" >/dev/null 2>&1; then
      case "${name}" in
        easypay-api-key*) base="${base},EASYPAY_API_KEY=${name}:latest" ;;
        openai-api-key*)  base="${base},OPENAI_API_KEY=${name}:latest" ;;
        valr-api-key*)    base="${base},VALR_API_KEY=${name}:latest" ;;
        valr-api-secret*) base="${base},VALR_API_SECRET=${name}:latest" ;;
      esac
    fi
  done
  echo "${base}"
}

# Step 1: Build and push
log "Building (no cache) and pushing image for ${ENVIRONMENT}..."
docker buildx build \
  --no-cache \
  --platform linux/amd64 \
  --tag "${IMAGE_NAME}" \
  --file Dockerfile \
  --push \
  . || err "Docker build/push failed"
log "✅ Image pushed: ${IMAGE_NAME}"
echo ""

# Step 2: Deploy
SECRETS_STR=$(build_secrets_args)
log "Deploying to Cloud Run (${ENVIRONMENT})..."

gcloud run deploy "${SERVICE_NAME}" \
  --image "${IMAGE_NAME}" \
  --platform managed \
  --region "${REGION}" \
  --service-account "${SERVICE_ACCOUNT}" \
  --add-cloudsql-instances "${CLOUD_SQL_INSTANCE}" \
  --set-env-vars "NODE_ENV=production,STAGING=${STAGING_FLAG},CLOUD_SQL_INSTANCE=${CLOUD_SQL_INSTANCE},CORS_ORIGINS=${CORS_ORIGINS},DB_SSL=false,DB_HOST=/cloudsql/${CLOUD_SQL_INSTANCE},DB_NAME=mymoolah_${ENVIRONMENT},DB_USER=mymoolah_app,MOBILEMART_LIVE_INTEGRATION=true,MOBILEMART_SCOPE=api,TLS_ENABLED=false,VAT_RATE=0.15,LEDGER_ACCOUNT_MM_COMMISSION_CLEARING=2200-01-01,LEDGER_ACCOUNT_COMMISSION_REVENUE=4000-10-01,LEDGER_ACCOUNT_VAT_CONTROL=2300-10-01,LEDGER_ACCOUNT_CLIENT_FLOAT=2100-01-01,LEDGER_ACCOUNT_CLIENT_CLEARING=2100-02-01,LEDGER_ACCOUNT_SUPPLIER_CLEARING=2200-02-01,LEDGER_ACCOUNT_INTERCHANGE=1200-05-01,LEDGER_ACCOUNT_BANK=1100-01-01,LEDGER_ACCOUNT_TRANSACTION_FEE_REVENUE=4000-20-01,FLASH_LIVE_INTEGRATION=true,LEDGER_ACCOUNT_FLASH_FLOAT=1200-10-04,ENABLE_CATALOG_SYNC=true" \
  --set-secrets "${SECRETS_STR}" \
  --memory 1Gi \
  --cpu 1 \
  --min-instances 0 \
  --max-instances 10 \
  --timeout 300 \
  --concurrency 80 \
  --allow-unauthenticated \
  --port 8080 || err "Cloud Run deployment failed"

echo ""
log "✅ ${ENV_UPPER} backend deployed successfully!"
SERVICE_URL=$(gcloud run services describe "${SERVICE_NAME}" --region "${REGION}" --format='value(status.url)')
log "Service URL: ${SERVICE_URL}"

if [ "$ENVIRONMENT" == "production" ]; then
    log "Production API: https://api-mm.mymoolah.africa"
fi
