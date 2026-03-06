#!/usr/bin/env bash
set -euo pipefail

# Build and Deploy MyMoolah Wallet Frontend to Cloud Run
# Usage: ./scripts/deploy-wallet.sh [--staging | --production] [optional-image-tag]

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
          ENVIRONMENT="$arg" # fallback
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
SERVICE_NAME="mymoolah-wallet-${ENVIRONMENT}"
IMAGE_NAME="gcr.io/${PROJECT_ID}/mymoolah-wallet-${ENVIRONMENT}:${IMAGE_TAG}"

if [ "$ENVIRONMENT" == "staging" ]; then
  BACKEND_URL="https://staging.mymoolah.africa"
else
  BACKEND_URL="https://api-mm.mymoolah.africa"
fi

log() { echo "📋 [$((SECONDS))s] $*"; }
err() { echo "❌ $*" >&2; exit 1; }
success() { echo "✅ $*"; }

log "🚀 Build and Deploy Wallet Frontend -> ${ENVIRONMENT^^}"
log "Project:     ${PROJECT_ID}"
log "Image:       ${IMAGE_NAME}"
log "Backend API: ${BACKEND_URL}"
echo ""

# Checks
if ! command -v docker &> /dev/null; then err "Docker not found"; fi
if ! docker info &> /dev/null; then err "Docker daemon is not running"; fi
if ! command -v gcloud &> /dev/null; then err "gcloud not found"; fi

if ! gcloud auth list --filter=status:ACTIVE --format="value(account)" | grep -q .; then
  err "No active gcloud authentication found. Please run: gcloud auth login"
fi

gcloud config set project "${PROJECT_ID}" >/dev/null 2>&1 || err "Failed to set project"

cd mymoolah-wallet-frontend

# Build & Push Docker image
log "Building Docker image for wallet frontend (${ENVIRONMENT})..."
docker buildx build \
  --no-cache \
  --pull \
  --platform linux/amd64 \
  --build-arg VITE_API_BASE_URL="${BACKEND_URL}" \
  --build-arg BUILD_COMMAND="build:staging" \
  --tag "${IMAGE_NAME}" \
  --push \
  . || { err "Failed to build and push Docker image"; }

cd ..
success "Docker image pushed: ${IMAGE_NAME}"
echo ""

# Deploy to Cloud Run
log "Deploying to Cloud Run (${ENVIRONMENT})..."
gcloud run deploy "${SERVICE_NAME}" \
  --image "${IMAGE_NAME}" \
  --platform managed \
  --region "${REGION}" \
  --memory 256Mi \
  --cpu 1 \
  --min-instances 0 \
  --max-instances 10 \
  --timeout 60 \
  --concurrency 1000 \
  --allow-unauthenticated \
  --port 80 || { err "Failed to deploy Cloud Run service"; }

echo ""
success "Deployment complete!"
SERVICE_URL=$(gcloud run services describe "${SERVICE_NAME}" --region "${REGION}" --format="value(status.url)")
log "Service URL: ${SERVICE_URL}"

if [ "$ENVIRONMENT" == "production" ]; then
  log "Production Wallet: https://wallet-mm.mymoolah.africa"
else
  log "Staging Wallet connecting to ${BACKEND_URL}"
fi
