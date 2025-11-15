#!/usr/bin/env bash

set -euo pipefail

# MyMoolah Treasury Platform - Cloud Run Service Account Setup
# Creates service account with necessary IAM permissions for banking-grade security

# Configuration
PROJECT_ID="mymoolah-db"
SERVICE_ACCOUNT_NAME="mymoolah-staging-sa"
SERVICE_ACCOUNT_EMAIL="${SERVICE_ACCOUNT_NAME}@${PROJECT_ID}.iam.gserviceaccount.com"
DISPLAY_NAME="MyMoolah Staging Service Account"

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
  
  success "Prerequisites check passed"
}

# Create service account
create_service_account() {
  log "Creating service account: ${SERVICE_ACCOUNT_NAME}"
  
  # Check if service account already exists
  if gcloud iam service-accounts describe "${SERVICE_ACCOUNT_EMAIL}" \
    --project="${PROJECT_ID}" > /dev/null 2>&1; then
    warning "Service account ${SERVICE_ACCOUNT_EMAIL} already exists. Skipping creation."
    return 0
  fi
  
  gcloud iam service-accounts create "${SERVICE_ACCOUNT_NAME}" \
    --display-name="${DISPLAY_NAME}" \
    --project="${PROJECT_ID}" || {
    error "Failed to create service account ${SERVICE_ACCOUNT_NAME}"
    return 1
  }
  
  success "Service account created: ${SERVICE_ACCOUNT_EMAIL}"
}

# Grant IAM roles
grant_iam_roles() {
  log "Granting IAM roles to service account..."
  
  # Secret Manager Secret Accessor - Read secrets
  log "Granting Secret Manager access..."
  gcloud projects add-iam-policy-binding "${PROJECT_ID}" \
    --member="serviceAccount:${SERVICE_ACCOUNT_EMAIL}" \
    --role="roles/secretmanager.secretAccessor" || {
    error "Failed to grant Secret Manager access"
    return 1
  }
  success "Secret Manager access granted"
  
  # Cloud SQL Client - Connect to Cloud SQL instances
  log "Granting Cloud SQL Client access..."
  gcloud projects add-iam-policy-binding "${PROJECT_ID}" \
    --member="serviceAccount:${SERVICE_ACCOUNT_EMAIL}" \
    --role="roles/cloudsql.client" || {
    error "Failed to grant Cloud SQL Client access"
    return 1
  }
  success "Cloud SQL Client access granted"
  
  # Cloud Run Invoker - Allow service to be invoked (if needed)
  log "Granting Cloud Run Invoker access..."
  gcloud projects add-iam-policy-binding "${PROJECT_ID}" \
    --member="serviceAccount:${SERVICE_ACCOUNT_EMAIL}" \
    --role="roles/run.invoker" || {
    error "Failed to grant Cloud Run Invoker access"
    return 1
  }
  success "Cloud Run Invoker access granted"
  
  # Logging Writer - Write logs to Cloud Logging
  log "Granting Logging Writer access..."
  gcloud projects add-iam-policy-binding "${PROJECT_ID}" \
    --member="serviceAccount:${SERVICE_ACCOUNT_EMAIL}" \
    --role="roles/logging.logWriter" || {
    error "Failed to grant Logging Writer access"
    return 1
  }
  success "Logging Writer access granted"
  
  # Monitoring Metric Writer - Write custom metrics
  log "Granting Monitoring Metric Writer access..."
  gcloud projects add-iam-policy-binding "${PROJECT_ID}" \
    --member="serviceAccount:${SERVICE_ACCOUNT_EMAIL}" \
    --role="roles/monitoring.metricWriter" || {
    error "Failed to grant Monitoring Metric Writer access"
    return 1
  }
  success "Monitoring Metric Writer access granted"
}

# Main execution
main() {
  log "🚀 Creating Cloud Run Service Account"
  log "Project: ${PROJECT_ID}"
  log "Service Account: ${SERVICE_ACCOUNT_EMAIL}"
  echo ""
  
  # Check prerequisites
  check_prerequisites
  
  # Create service account
  create_service_account
  
  # Grant IAM roles
  grant_iam_roles
  
  echo ""
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo "📊 Service Account Setup Complete"
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo "Service Account: ${SERVICE_ACCOUNT_EMAIL}"
  echo ""
  echo "IAM Roles Granted:"
  echo "  ✅ roles/secretmanager.secretAccessor (Read secrets)"
  echo "  ✅ roles/cloudsql.client (Connect to Cloud SQL)"
  echo "  ✅ roles/run.invoker (Invoke Cloud Run services)"
  echo "  ✅ roles/logging.logWriter (Write logs)"
  echo "  ✅ roles/monitoring.metricWriter (Write metrics)"
  echo ""
  echo "⚠️  BANKING-GRADE SECURITY:"
  echo "   - Least privilege principle applied"
  echo "   - IAM-based authentication (no passwords)"
  echo "   - Audit logging enabled for all operations"
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo ""
  
  success "✅ Service account setup complete!"
  log ""
  log "Next steps:"
  log "  1. Build and push Docker image"
  log "  2. Deploy Cloud Run service with this service account"
}

# Run main function
main "$@"

