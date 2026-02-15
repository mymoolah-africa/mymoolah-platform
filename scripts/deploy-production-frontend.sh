#!/usr/bin/env bash
set -euo pipefail

# Build and Deploy Production Frontend (Wallet)
# Usage: ./scripts/deploy-production-frontend.sh
# - Builds wallet Docker image (no cache, --pull)
# - Pushes to GCR
# - Deploys to Cloud Run mymoolah-wallet-production

PROJECT_ID="mymoolah-db"
REGION="africa-south1"
SERVICE_NAME="mymoolah-wallet-production"
IMAGE_NAME="gcr.io/${PROJECT_ID}/mymoolah-wallet-production:latest"
PRODUCTION_BACKEND_URL="https://api-mm.mymoolah.africa"

log() { echo "📋 [$(date +'%H:%M:%S')] $*"; }
err() { echo "❌ $*" >&2; exit 1; }

log "🚀 Build and Deploy Production Frontend (Wallet)"
log "Project: ${PROJECT_ID}"
log "Backend URL: ${PRODUCTION_BACKEND_URL}"
echo ""

# Checks
command -v docker >/dev/null || err "Docker not found"
command -v gcloud >/dev/null || err "gcloud not found"
docker info &>/dev/null || err "Docker is not running"
gcloud auth list --filter=status:ACTIVE --format="value(account)" | grep -q . || err "Run: gcloud auth login"

# Step 1: Build and push
log "Building Docker image (no cache, --pull)..."
cd mymoolah-wallet-frontend
docker buildx build \
  --no-cache \
  --pull \
  --platform linux/amd64 \
  --build-arg VITE_API_BASE_URL="${PRODUCTION_BACKEND_URL}" \
  --build-arg BUILD_COMMAND="build:staging" \
  --tag "${IMAGE_NAME}" \
  --push \
  . || { cd ..; err "Build failed"; }
cd ..
log "✅ Image pushed: ${IMAGE_NAME}"
echo ""

# Step 2: Deploy
log "Deploying to Cloud Run..."
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
  --port 80

SERVICE_URL=$(gcloud run services describe "${SERVICE_NAME}" --region "${REGION}" --format="value(status.url)")
echo ""
log "✅ Production frontend deployed"
log "Direct URL: ${SERVICE_URL}"
log "Production Wallet: https://wallet-mm.mymoolah.africa"
