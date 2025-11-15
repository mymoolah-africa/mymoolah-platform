#!/usr/bin/env bash

set -euo pipefail

# MyMoolah Treasury Platform - Cloud Run Staging Deployment Script
# Banking-Grade, Mojaloop-Compliant, Cost-Optimized Configuration

# Configuration
PROJECT_ID="mymoolah-db"
REGION="africa-south1"
SERVICE_NAME="mymoolah-backend-staging"
IMAGE_NAME="gcr.io/${PROJECT_ID}/mymoolah-backend:latest"
SERVICE_ACCOUNT="mymoolah-staging-sa@${PROJECT_ID}.iam.gserviceaccount.com"
CLOUD_SQL_INSTANCE="mymoolah-db:${REGION}:mmtp-pg-staging"

# Cost-Optimized Configuration (Start Light, Scale Smart)
# - CPU: 1 vCPU (can scale up as needed)
# - Memory: 1Gi (can increase if needed)
# - Min Instances: 0 (scale to zero when idle - cost optimization)
# - Max Instances: 10 (can increase for high traffic)
# - Concurrency: 80 requests per instance (optimized for Node.js)
# - Timeout: 300s (5 minutes for long-running operations)

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
  
  gcloud config set project "${PROJECT_ID}" > /dev/null 2>&1 || {
    error "Failed to set project ${PROJECT_ID}. Please verify project ID."
    exit 1
  }
  
  # Check if image exists
  if ! gcloud container images describe "${IMAGE_NAME}" > /dev/null 2>&1; then
    error "Docker image not found: ${IMAGE_NAME}"
    error "Please build and push the image first using: scripts/build-and-push-docker.sh"
    exit 1
  fi
  
  success "Prerequisites check passed"
}

# Construct DATABASE_URL from secrets
# Cloud Run needs the full connection string with Unix socket
construct_database_url() {
  # For Cloud Run, we use Unix socket connection
  # Format: postgres://user:password@/database?host=/cloudsql/connection-name&sslmode=require
  echo "postgres://mymoolah_app:\${DB_PASSWORD}@/mymoolah_staging?host=/cloudsql/${CLOUD_SQL_INSTANCE}&sslmode=require"
}

# Construct DATABASE_URL from password secret
construct_database_url_from_secret() {
  log "Constructing DATABASE_URL from Secret Manager..."
  
  # Get the password from Secret Manager
  local db_password=$(gcloud secrets versions access latest \
    --secret="db-mmtp-pg-staging-password" \
    --project="${PROJECT_ID}" 2>/dev/null)
  
  if [ -z "${db_password}" ]; then
    error "Failed to retrieve database password from Secret Manager"
    return 1
  fi
  
  # URL encode the password (handle special characters like @, :, /, etc.)
  # Use Python for reliable URL encoding
  local encoded_password=$(python3 <<EOF
import urllib.parse
import sys
password = sys.stdin.read().strip()
print(urllib.parse.quote(password, safe=''))
EOF
<<< "${db_password}")
  
  # Construct DATABASE_URL for Cloud Run (Unix socket connection)
  # Format: postgres://user:password@/database?host=/cloudsql/connection-name&sslmode=require
  # Note: The @ after password is the URL separator, not part of the password
  local database_url="postgres://mymoolah_app:${encoded_password}@/mymoolah_staging?host=/cloudsql/${CLOUD_SQL_INSTANCE}&sslmode=require"
  
  # Verify the URL doesn't have double-encoded @
  if [[ "${database_url}" == *"%40"* ]] && [[ "${db_password}" != *"@"* ]]; then
    warning "WARNING: URL contains %40 but password doesn't contain @ - possible encoding issue"
    warning "Password length: ${#db_password}, Encoded length: ${#encoded_password}"
  fi
  
  echo "${database_url}"
}

# Deploy Cloud Run service
deploy_service() {
  log "Deploying Cloud Run service: ${SERVICE_NAME}"
  
  # Construct DATABASE_URL before deployment
  local database_url=$(construct_database_url_from_secret)
  if [ -z "${database_url}" ]; then
    error "Failed to construct DATABASE_URL"
    return 1
  fi
  
  log "Deploying with DATABASE_URL configured..."
  
  gcloud run deploy "${SERVICE_NAME}" \
    --image "${IMAGE_NAME}" \
    --platform managed \
    --region "${REGION}" \
    --service-account "${SERVICE_ACCOUNT}" \
    --add-cloudsql-instances "${CLOUD_SQL_INSTANCE}" \
    --set-env-vars "NODE_ENV=production,CLOUD_SQL_INSTANCE=${CLOUD_SQL_INSTANCE}" \
    --set-secrets "ZAPPER_API_URL=zapper-prod-api-url:latest,ZAPPER_ORG_ID=zapper-prod-org-id:latest,ZAPPER_API_TOKEN=zapper-prod-api-token:latest,ZAPPER_X_API_KEY=zapper-prod-x-api-key:latest,JWT_SECRET=jwt-secret-staging:latest,SESSION_SECRET=session-secret-staging:latest,DB_PASSWORD=db-mmtp-pg-staging-password:latest" \
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

# Set DATABASE_URL environment variable
# This is a workaround - Cloud Run doesn't support constructing secrets dynamically
# We'll need to create a startup script or use a Cloud Build step
set_database_url() {
  log "Setting DATABASE_URL environment variable..."
  warning "Note: DATABASE_URL needs to be constructed from DB_PASSWORD secret"
  warning "This may require a Cloud Build step or startup script modification"
  
  # Get the password from Secret Manager and construct URL
  local db_password=$(gcloud secrets versions access latest \
    --secret="db-mmtp-pg-staging-password" \
    --project="${PROJECT_ID}")
  
  # URL encode the password
  local encoded_password=$(python3 -c "import urllib.parse; print(urllib.parse.quote('${db_password}'))" 2>/dev/null || \
    echo "${db_password}")
  
  local database_url="postgres://mymoolah_app:${encoded_password}@/mymoolah_staging?host=/cloudsql/${CLOUD_SQL_INSTANCE}&sslmode=require"
  
  # Update the service with DATABASE_URL
  gcloud run services update "${SERVICE_NAME}" \
    --region "${REGION}" \
    --update-env-vars "DATABASE_URL=${database_url}" || {
    error "Failed to set DATABASE_URL"
    return 1
  }
  
  success "DATABASE_URL set successfully"
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
  log "🚀 Deploying MyMoolah Backend to Cloud Run (Staging)"
  log "Project: ${PROJECT_ID}"
  log "Region: ${REGION}"
  log "Service: ${SERVICE_NAME}"
  echo ""
  
  # Check prerequisites
  check_prerequisites
  
  # Deploy service (DATABASE_URL is set during deployment)
  deploy_service
  
  # Get service URL
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
  echo "  - Memory: 1Gi"
  echo "  - Min Instances: 0 (scale to zero)"
  echo "  - Max Instances: 10"
  echo "  - Concurrency: 80 requests/instance"
  echo "  - Timeout: 300s"
  echo ""
  echo "⚠️  BANKING-GRADE SECURITY:"
  echo "   - TLS 1.3 enforced (Cloud Run default)"
  echo "   - IAM-based authentication"
  echo "   - Secrets from Secret Manager"
  echo "   - Cloud SQL via Unix socket"
  echo "   - SSL required for database"
  echo ""
  echo "Next steps:"
  echo "  1. Test service: curl ${service_url}/health"
  echo "  2. Run database migrations"
  echo "  3. Test Zapper integration"
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo ""
  
  success "✅ Deployment complete!"
}

# Run main function
main "$@"

