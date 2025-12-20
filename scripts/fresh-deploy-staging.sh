#!/usr/bin/env bash

set -euo pipefail

# MyMoolah Treasury Platform - Fresh Staging Deployment (No Cache)
# Builds a completely fresh Docker image without cache and deploys to Cloud Run Staging
# Use this when you need to ensure all latest code changes are included

# Configuration
PROJECT_ID="mymoolah-db"
REGION="africa-south1"
SERVICE_NAME="mymoolah-backend-staging"
IMAGE_NAME="mymoolah-backend"
IMAGE_TAG="${1:-latest}"
FULL_IMAGE_NAME="gcr.io/${PROJECT_ID}/${IMAGE_NAME}:${IMAGE_TAG}"
SERVICE_ACCOUNT="mymoolah-staging-sa@${PROJECT_ID}.iam.gserviceaccount.com"
CLOUD_SQL_INSTANCE="mymoolah-db:${REGION}:mmtp-pg-staging"

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
  
  if ! command -v docker &> /dev/null; then
    error "Docker not found. Please install Docker."
    exit 1
  fi
  
  if ! docker info &> /dev/null; then
    error "Docker is not running. Please start Docker."
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

# Clean up Docker cache and old images
cleanup_docker() {
  log "Cleaning up Docker cache and old images..."
  
  # Remove unused Docker resources (images, containers, volumes, networks)
  docker system prune -a --volumes -f > /dev/null 2>&1 || {
    warning "Docker cleanup had some issues (may be normal)"
  }
  
  success "Docker cleanup complete"
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

# Build Docker image WITHOUT cache
build_fresh_image() {
  log "Building FRESH Docker image (NO CACHE): ${FULL_IMAGE_NAME}"
  log "Platform: linux/amd64 (required for Cloud Run)"
  log "⚠️  This will take longer as it rebuilds everything from scratch"
  
  # Use buildx to build for linux/amd64 with --no-cache
  docker buildx build \
    --platform linux/amd64 \
    --no-cache \
    --tag "${FULL_IMAGE_NAME}" \
    --file Dockerfile \
    --push \
    . || {
    error "Failed to build and push Docker image"
    return 1
  }
  
  success "Fresh Docker image built and pushed successfully: ${FULL_IMAGE_NAME}"
}

# Deploy to Cloud Run
deploy_to_cloud_run() {
  log "Deploying fresh image to Cloud Run: ${SERVICE_NAME}"
  
  gcloud run deploy "${SERVICE_NAME}" \
    --image "${FULL_IMAGE_NAME}" \
    --platform managed \
    --region "${REGION}" \
    --service-account "${SERVICE_ACCOUNT}" \
    --add-cloudsql-instances "${CLOUD_SQL_INSTANCE}" \
    --set-env-vars "NODE_ENV=production,STAGING=true,CLOUD_SQL_INSTANCE=${CLOUD_SQL_INSTANCE},CORS_ORIGINS=https://stagingwallet.mymoolah.africa,DB_SSL=false,DB_HOST=/cloudsql/${CLOUD_SQL_INSTANCE},DB_NAME=mymoolah_staging,DB_USER=mymoolah_app,MOBILEMART_LIVE_INTEGRATION=true,MOBILEMART_SCOPE=api,TLS_ENABLED=false" \
    --set-secrets "ZAPPER_API_URL=zapper-prod-api-url:latest,ZAPPER_ORG_ID=zapper-prod-org-id:latest,ZAPPER_API_TOKEN=zapper-prod-api-token:latest,ZAPPER_X_API_KEY=zapper-prod-x-api-key:latest,JWT_SECRET=jwt-secret-staging:latest,SESSION_SECRET=session-secret-staging:latest,DB_PASSWORD=db-mmtp-pg-staging-password:latest,MOBILEMART_CLIENT_ID=mobilemart-prod-client-id:latest,MOBILEMART_CLIENT_SECRET=mobilemart-prod-client-secret:latest,MOBILEMART_API_URL=mobilemart-prod-api-url:latest,MOBILEMART_TOKEN_URL=mobilemart-prod-token-url:latest,OPENAI_API_KEY=openai-api-key-staging:latest" \
    --memory 1Gi \
    --cpu 1 \
    --min-instances 0 \
    --max-instances 10 \
    --timeout 300 \
    --concurrency 80 \
    --allow-unauthenticated \
    --port 8080 || {
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

# Get latest revision
get_latest_revision() {
  local revision=$(gcloud run revisions list \
    --service="${SERVICE_NAME}" \
    --region="${REGION}" \
    --format="value(name)" \
    --limit=1 2>/dev/null)
  
  if [ -z "${revision}" ]; then
    error "Failed to get latest revision"
    return 1
  fi
  
  echo "${revision}"
}

# Check deployment health
check_deployment_health() {
  log "Checking deployment health..."
  
  local service_url=$(get_service_url)
  local max_attempts=10
  local attempt=1
  
  while [ ${attempt} -le ${max_attempts} ]; do
    log "Health check attempt ${attempt}/${max_attempts}..."
    
    if curl -f -s "${service_url}/health" > /dev/null 2>&1; then
      success "Service is healthy!"
      return 0
    fi
    
    if [ ${attempt} -lt ${max_attempts} ]; then
      log "Service not ready yet, waiting 10 seconds..."
      sleep 10
    fi
    
    attempt=$((attempt + 1))
  done
  
  warning "Service health check failed after ${max_attempts} attempts"
  warning "Service may still be starting up. Check logs:"
  warning "  gcloud logging read \"resource.type=cloud_run_revision AND resource.labels.service_name=${SERVICE_NAME}\" --limit=50"
  return 1
}

# Check for errors in logs
check_deployment_errors() {
  log "Checking for deployment errors..."
  
  local revision=$(get_latest_revision)
  
  if [ -z "${revision}" ]; then
    warning "Could not get revision name, skipping error check"
    return 0
  fi
  
  log "Checking logs for revision: ${revision}"
  
  local errors=$(gcloud logging read \
    "resource.type=cloud_run_revision AND resource.labels.service_name=${SERVICE_NAME} AND resource.labels.revision_name=${revision} AND severity>=ERROR" \
    --limit=10 \
    --format="value(textPayload,jsonPayload.message)" \
    2>/dev/null || echo "")
  
  if [ -n "${errors}" ]; then
    warning "Found errors in deployment logs:"
    echo "${errors}" | head -5
    warning "View full logs: gcloud logging read \"resource.type=cloud_run_revision AND resource.labels.service_name=${SERVICE_NAME} AND resource.labels.revision_name=${revision}\" --limit=50"
  else
    success "No errors found in deployment logs"
  fi
}

# Main execution
main() {
  echo ""
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo "🚀 FRESH STAGING DEPLOYMENT (NO CACHE)"
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo "Project: ${PROJECT_ID}"
  echo "Region: ${REGION}"
  echo "Service: ${SERVICE_NAME}"
  echo "Image: ${FULL_IMAGE_NAME}"
  echo ""
  echo "⚠️  This will:"
  echo "   1. Clean Docker cache"
  echo "   2. Build FRESH image (NO CACHE - takes longer)"
  echo "   3. Push to Google Container Registry"
  echo "   4. Deploy to Cloud Run Staging"
  echo "   5. Verify deployment"
  echo ""
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo ""
  
  # Check prerequisites
  check_prerequisites
  
  # Clean up Docker
  cleanup_docker
  
  # Configure Docker
  configure_docker
  
  # Build fresh image (no cache)
  build_fresh_image
  
  # Deploy to Cloud Run
  deploy_to_cloud_run
  
  # Get service URL
  local service_url=$(get_service_url)
  local revision=$(get_latest_revision)
  
  # Wait a bit for service to start
  log "Waiting 15 seconds for service to initialize..."
  sleep 15
  
  # Check health
  check_deployment_health || true
  
  # Check for errors
  check_deployment_errors
  
  # Final summary
  echo ""
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo "📊 FRESH DEPLOYMENT COMPLETE"
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo "Service: ${SERVICE_NAME}"
  echo "URL: ${service_url}"
  echo "Revision: ${revision}"
  echo "Image: ${FULL_IMAGE_NAME}"
  echo ""
  echo "Configuration:"
  echo "  - CPU: 1 vCPU"
  echo "  - Memory: 1Gi"
  echo "  - Min Instances: 0 (scale to zero)"
  echo "  - Max Instances: 10"
  echo "  - Concurrency: 80 requests/instance"
  echo "  - Timeout: 300s"
  echo ""
  echo "✅ Next Steps:"
  echo "  1. Test service: curl ${service_url}/health"
  echo "  2. Run database migrations: ./scripts/run-migrations-staging.sh"
  echo "  3. Sync database schema: node scripts/sync-staging-to-uat.js"
  echo "  4. Test Zapper integration: curl ${service_url}/api/v1/zapper/health"
  echo "  5. Test MobileMart integration: curl ${service_url}/api/v1/mobilemart/health"
  echo ""
  echo "📋 View Logs:"
  echo "  gcloud logging read \"resource.type=cloud_run_revision AND resource.labels.service_name=${SERVICE_NAME}\" --limit=50"
  echo ""
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo ""
  
  success "✅ Fresh deployment complete!"
}

# Run main function
main "$@"
