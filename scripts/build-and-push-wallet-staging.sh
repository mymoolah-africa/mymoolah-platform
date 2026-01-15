#!/usr/bin/env bash

set -euo pipefail

# MyMoolah Wallet Frontend - Build and Push to GCR (Staging)

# Configuration
PROJECT_ID="mymoolah-db"
REGION="africa-south1"
IMAGE_NAME="gcr.io/${PROJECT_ID}/mymoolah-wallet-staging:latest"
STAGING_BACKEND_URL="https://staging.mymoolah.africa"

log() {
  echo "📋 [$(date +'%Y-%m-%d %H:%M:%S')] $*"
}

error() {
  echo "❌ [$(date +'%Y-%m-%d %H:%M:%S')] ERROR: $*" >&2
}

success() {
  echo "✅ [$(date +'%Y-%m-%d %H:%M:%S')] $*"
}

# Check prerequisites
check_prerequisites() {
  log "Checking prerequisites..."
  
  if ! command -v docker &> /dev/null; then
    error "Docker not found. Please install Docker Desktop."
    exit 1
  fi
  
  if ! docker info &> /dev/null; then
    error "Docker is not running. Please start Docker Desktop."
    exit 1
  fi
  
  if ! command -v gcloud &> /dev/null; then
    error "gcloud CLI not found. Please install Google Cloud SDK."
    exit 1
  fi
  
  success "Prerequisites check passed"
}

# Build and push Docker image
build_and_push() {
  log "Building Docker image for wallet frontend (staging)..."
  log "Backend URL: ${STAGING_BACKEND_URL}"
  
  cd mymoolah-wallet-frontend
  
  # Build for linux/amd64 (Cloud Run requirement), always without cache
  # Use build:staging to skip TypeScript checking (faster builds, UI components work at runtime)
  docker buildx build \
    --no-cache \
    --platform linux/amd64 \
    --build-arg VITE_API_BASE_URL="${STAGING_BACKEND_URL}" \
    --build-arg BUILD_COMMAND="build:staging" \
    --tag "${IMAGE_NAME}" \
    --push \
    . || {
    error "Failed to build and push Docker image"
    cd ..
    return 1
  }
  
  cd ..
  
  success "Docker image built and pushed successfully: ${IMAGE_NAME}"
}

# Main execution
main() {
  log "🚀 Building and Pushing Wallet Frontend to GCR (Staging)"
  log "Project: ${PROJECT_ID}"
  log "Image: ${IMAGE_NAME}"
  echo ""
  
  check_prerequisites
  build_and_push
  
  echo ""
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo "📊 Docker Image Build and Push Complete"
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo "Image: ${IMAGE_NAME}"
  echo "Backend: ${STAGING_BACKEND_URL}"
  echo ""
  echo "Next steps:"
  echo "  1. Deploy to Cloud Run using: scripts/deploy-wallet-staging.sh"
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo ""
  
  success "✅ Docker image ready for deployment!"
}

# Run main function
main "$@"

