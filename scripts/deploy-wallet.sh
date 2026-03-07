#!/usr/bin/env bash
set -euo pipefail

# Build and Deploy MyMoolah Wallet Frontend to Cloud Run
# Uses Google Cloud Build (no local Docker required)
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
          ENVIRONMENT="$arg"
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
  BUILD_COMMAND="build:staging"
else
  BACKEND_URL="https://api-mm.mymoolah.africa"
  BUILD_COMMAND="build"
fi

log() { echo "📋 [$((SECONDS))s] $*"; }
err() { echo "❌ $*" >&2; exit 1; }

ENV_UPPER=$(echo "$ENVIRONMENT" | tr '[:lower:]' '[:upper:]')
log "🚀 Build and Deploy Wallet Frontend -> ${ENV_UPPER}"
log "Project:     ${PROJECT_ID}"
log "Image:       ${IMAGE_NAME}"
log "Backend API: ${BACKEND_URL}"
echo ""

# Only gcloud is required (no local Docker needed)
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
      if gcloud auth login; then
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

  if ! gcloud auth print-access-token >/dev/null 2>&1; then
    log "⚠️  Auth token expired — re-authenticating..."
    gcloud auth revoke --all --quiet 2>/dev/null || true
    if [ -t 0 ] && [ -t 1 ]; then
      gcloud auth login || err "Re-authentication failed"
      log "✅ Re-authenticated successfully"
    else
      err "Auth token expired. Run: gcloud auth revoke --all && gcloud auth login"
    fi
  fi
}

ensure_gcloud_auth

# Step 1: Build with Google Cloud Build (builds on Google's servers, pushes directly to GCR)
# Uses --config to pass build args (VITE_API_BASE_URL, BUILD_COMMAND) to the Dockerfile
log "Building wallet image with Google Cloud Build for ${ENVIRONMENT}..."

CLOUDBUILD_FILE=$(mktemp)
cat > "${CLOUDBUILD_FILE}" <<YAML
steps:
  - name: 'gcr.io/cloud-builders/docker'
    args:
      - 'build'
      - '--build-arg'
      - 'VITE_API_BASE_URL=${BACKEND_URL}'
      - '--build-arg'
      - 'BUILD_COMMAND=${BUILD_COMMAND}'
      - '-t'
      - '${IMAGE_NAME}'
      - '.'
images:
  - '${IMAGE_NAME}'
timeout: '1200s'
YAML

gcloud builds submit \
  --config "${CLOUDBUILD_FILE}" \
  --project "${PROJECT_ID}" \
  --quiet \
  mymoolah-wallet-frontend/ || { rm -f "${CLOUDBUILD_FILE}"; err "Cloud Build failed"; }

rm -f "${CLOUDBUILD_FILE}"
log "✅ Wallet image built and pushed: ${IMAGE_NAME}"
echo ""

# Step 2: Deploy to Cloud Run
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
  --port 80 || err "Failed to deploy Cloud Run service"

echo ""
log "✅ ${ENV_UPPER} wallet deployed successfully!"
SERVICE_URL=$(gcloud run services describe "${SERVICE_NAME}" --region "${REGION}" --format="value(status.url)")
log "Service URL: ${SERVICE_URL}"

if [ "$ENVIRONMENT" == "production" ]; then
  log "Production Wallet: https://wallet-mm.mymoolah.africa"
else
  log "Staging Wallet connecting to ${BACKEND_URL}"
fi
