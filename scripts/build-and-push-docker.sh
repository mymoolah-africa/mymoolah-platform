#!/usr/bin/env bash

set -euo pipefail

# MyMoolah Treasury Platform - Docker Build and Push Script
# Builds Docker image and pushes to Google Container Registry

# Configuration
PROJECT_ID="mymoolah-db"
REGION="africa-south1"
IMAGE_NAME="mymoolah-backend"
IMAGE_TAG="${1:-latest}"
FULL_IMAGE_NAME="gcr.io/${PROJECT_ID}/${IMAGE_NAME}:${IMAGE_TAG}"

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
    error "Docker not found. Please install Docker."
    exit 1
  fi
  
  if ! command -v gcloud &> /dev/null; then
    error "gcloud CLI not found. Please install Google Cloud SDK."
    exit 1
  fi
  
  if ! gcloud auth list --filter=status:ACTIVE --format="value(account)" | grep -q .; then
    error "No active gcloud authentication found. Please run: gcloud auth login"
    exit 1
  fi
  
  gcloud config set project "${PROJECT_ID}" > /dev/null 2>&1 || {
    error "Failed to set project ${PROJECT_ID}. Please verify project ID."
    exit 1
  }
  
  success "Prerequisites check passed"
}

# Configure Docker for GCR
configure_docker() {
  log "Configuring Docker for Google Container Registry..."
  gcloud auth configure-docker gcr.io --quiet || {
    error "Failed to configure Docker for GCR"
    return 1
  }
  success "Docker configured for GCR"
}

# Build and push Docker image (using buildx for cross-platform support)
build_and_push_image() {
  log "Building and pushing Docker image: ${FULL_IMAGE_NAME}"
  log "Platform: linux/amd64 (required for Cloud Run)"
  
  # Use buildx to build for linux/amd64 and push directly
  docker buildx build \
    --platform linux/amd64 \
    --tag "${FULL_IMAGE_NAME}" \
    --file Dockerfile \
    --push \
    . || {
    error "Failed to build and push Docker image"
    return 1
  }
  
  success "Docker image built and pushed successfully: ${FULL_IMAGE_NAME}"
}

# Main execution
main() {
  log "🚀 Building and Pushing Docker Image"
  log "Project: ${PROJECT_ID}"
  log "Image: ${FULL_IMAGE_NAME}"
  echo ""
  
  # Check prerequisites
  check_prerequisites
  
  # Configure Docker
  configure_docker
  
  # Build and push image (single command for efficiency)
  build_and_push_image
  
  echo ""
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo "📊 Docker Image Build and Push Complete"
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo "Image: ${FULL_IMAGE_NAME}"
  echo ""
  echo "Next steps:"
  echo "  1. Deploy to Cloud Run using: scripts/deploy-cloud-run-staging.sh"
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo ""
  
  success "✅ Docker image ready for deployment!"
}

# Run main function
main "$@"

