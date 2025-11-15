#!/usr/bin/env bash

set -euo pipefail

# MyMoolah Wallet Frontend - Cloud Run Staging Deployment
# Banking-Grade, Cost-Optimized Configuration

# Configuration
PROJECT_ID="mymoolah-db"
REGION="africa-south1"
SERVICE_NAME="mymoolah-wallet-staging"
IMAGE_NAME="gcr.io/${PROJECT_ID}/mymoolah-wallet-staging:latest"

# Cost-Optimized Configuration
# - CPU: 0.5 vCPU (static site, minimal CPU needed)
# - Memory: 256Mi (static files, very lightweight)
# - Min Instances: 0 (scale to zero when idle)
# - Max Instances: 10 (can increase for high traffic)

log() {
  echo "📋 [$(date +'%Y-%m-%d %H:%M:%S')] $*"
}

error() {
  echo "❌ [$(date +'%Y-%m-%d %H:%M:%S')] ERROR: $*" >&2
}

success() {
  echo "✅ [$(date +'%Y-%m-%d %H:%M:%S')] $*"
}

warning() {
  echo "⚠️  [$(date +'%Y-%m-%d %H:%M:%S')] WARNING: $*" >&2
}

# Check prerequisites
check_prerequisites() {
  log "Checking prerequisites..."
  
  if ! command -v gcloud &> /dev/null; then
    error "gcloud CLI not found. Please install Google Cloud SDK."
    exit 1
  fi
  
  if ! gcloud auth list --filter=status:ACTIVE --format="value(account)" | grep -q .; then
    error "No active gcloud authentication found. Please run: gcloud auth login"
    exit 1
  fi
  
  success "Prerequisites check passed"
}

# Deploy Cloud Run service
deploy_service() {
  log "Deploying Cloud Run service: ${SERVICE_NAME}"
  
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
    --port 80 || {
    error "Failed to deploy Cloud Run service"
    return 1
  }
  
  success "Cloud Run service deployed successfully"
}

# Get service URL
get_service_url() {
  local url=$(gcloud run services describe "${SERVICE_NAME}" \
    --region "${REGION}" \
    --format="value(status.url)" 2>/dev/null)
  
  if [ -z "${url}" ]; then
    error "Failed to get service URL"
    return 1
  fi
  
  echo "${url}"
}

# Main execution
main() {
  log "🚀 Deploying MyMoolah Wallet Frontend to Cloud Run (Staging)"
  log "Project: ${PROJECT_ID}"
  log "Region: ${REGION}"
  log "Service: ${SERVICE_NAME}"
  echo ""
  
  check_prerequisites
  deploy_service
  
  local service_url=$(get_service_url)
  
  echo ""
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo "📊 Cloud Run Deployment Complete"
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo "Service: ${SERVICE_NAME}"
  echo "URL: ${service_url}"
  echo ""
  echo "Configuration:"
  echo "  - CPU: 1 vCPU"
  echo "  - Memory: 256Mi"
  echo "  - Min Instances: 0 (scale to zero)"
  echo "  - Max Instances: 10"
  echo "  - Concurrency: 1000 requests/instance"
  echo "  - Timeout: 60s"
  echo ""
  echo "🔒 Security:"
  echo "   - TLS 1.3 enforced (Cloud Run default)"
  echo "   - Public access (static site)"
  echo "   - Security headers configured"
  echo ""
  echo "📱 Wallet URLs:"
  echo "   - Dev (Codespaces): http://localhost:3002 (connects to Codespaces backend)"
  echo "   - Staging: ${service_url} (connects to staging backend)"
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo ""
  
  success "✅ Deployment complete!"
}

# Run main function
main "$@"

