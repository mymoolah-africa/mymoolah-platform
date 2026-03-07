#!/usr/bin/env bash
set -euo pipefail

# Build and Deploy MyMoolah Wallet Frontend to Cloud Run
# Run from: LOCAL MAC (Docker + gcloud required)
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

ENV_UPPER=$(echo "$ENVIRONMENT" | tr '[:lower:]' '[:upper:]')
log "🚀 Build and Deploy Wallet Frontend -> ${ENV_UPPER}"
log "Project:     ${PROJECT_ID}"
log "Image:       ${IMAGE_NAME}"
log "Backend API: ${BACKEND_URL}"
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
}

ensure_gcloud_auth

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
