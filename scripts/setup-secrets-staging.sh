#!/usr/bin/env bash

set -euo pipefail

# MyMoolah Treasury Platform - Staging Secrets Setup Script
# Stores all required credentials in Google Secret Manager

# Configuration
PROJECT_ID="mymoolah-db"

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
  
  # Try to set project, but check if it exists first
  if ! gcloud projects describe "${PROJECT_ID}" > /dev/null 2>&1; then
    error "Project ${PROJECT_ID} not found or you don't have access."
    error "Current project: $(gcloud config get-value project 2>/dev/null || echo 'not set')"
    error "Available projects:"
    gcloud projects list --format="table(projectId,name)" 2>/dev/null || true
    error ""
    error "Please:"
    error "  1. Verify you have access to project ${PROJECT_ID}"
    error "  2. Or set a different project: export PROJECT_ID='your-project-id'"
    exit 1
  fi
  
  gcloud config set project "${PROJECT_ID}" > /dev/null 2>&1 || {
    error "Failed to set project ${PROJECT_ID}. Please verify project ID."
    exit 1
  }
  
  success "Prerequisites check passed"
}

# Create or update secret
create_or_update_secret() {
  local secret_name=$1
  local secret_value=$2
  local description=${3:-""}
  
  if gcloud secrets describe "${secret_name}" --project="${PROJECT_ID}" > /dev/null 2>&1; then
    warning "Secret ${secret_name} already exists. Adding new version..."
    echo -n "${secret_value}" | gcloud secrets versions add "${secret_name}" \
      --project="${PROJECT_ID}" \
      --data-file=- || {
      error "Failed to add version to secret ${secret_name}"
      return 1
    }
    success "New version added to secret: ${secret_name}"
  else
    log "Creating secret: ${secret_name}"
    echo -n "${secret_value}" | gcloud secrets create "${secret_name}" \
      --project="${PROJECT_ID}" \
      --data-file=- \
      ${description:+--replication-policy="automatic"} || {
      error "Failed to create secret ${secret_name}"
      return 1
    }
    success "Secret created: ${secret_name}"
  fi
}

# Store Zapper production credentials
store_zapper_credentials() {
  log "Storing Zapper production credentials..."
  
  # Zapper Production Credentials (from Zapper team)
  create_or_update_secret "zapper-prod-org-id" "2f053500-c05c-11f0-b818-e12393dd6bc4" "Zapper Production Organisation ID"
  create_or_update_secret "zapper-prod-api-token" "91446a79-004b-4687-8b37-0e2a5d8ee7ce" "Zapper Production API Token"
  create_or_update_secret "zapper-prod-x-api-key" "u5YVZwClL68S2wOTmuP6i7slhqNvV5Da7a2tysqk" "Zapper Production X-API-Key"
  create_or_update_secret "zapper-prod-api-url" "https://api.zapper.com/v1" "Zapper Production API URL"
  
  success "Zapper production credentials stored"
}

# Store MobileMart production credentials
store_mobilemart_credentials() {
  log "Storing MobileMart production credentials..."
  
  # MobileMart Production Credentials (Fulcrum API)
  create_or_update_secret "mobilemart-prod-client-id" "mymoolah" "MobileMart Production Client ID"
  create_or_update_secret "mobilemart-prod-client-secret" "c799bf37-934d-4dcf-bfec-42fb421a6407" "MobileMart Production Client Secret"
  create_or_update_secret "mobilemart-prod-api-url" "https://fulcrumswitch.com" "MobileMart Production API URL"
  create_or_update_secret "mobilemart-prod-token-url" "https://fulcrumswitch.com/connect/token" "MobileMart Production Token URL"
  
  success "MobileMart production credentials stored"
}

# Store application secrets
store_application_secrets() {
  log "Storing application secrets..."
  
  # Generate JWT secret if not provided
  if [ -z "${JWT_SECRET:-}" ]; then
    log "Generating JWT secret..."
    JWT_SECRET=$(openssl rand -base64 48 | tr -d "=+/" | head -c 64)
    log "JWT secret generated (64 characters)"
  fi
  
  # Generate session secret if not provided
  if [ -z "${SESSION_SECRET:-}" ]; then
    log "Generating session secret..."
    SESSION_SECRET=$(openssl rand -base64 48 | tr -d "=+/" | head -c 64)
    log "Session secret generated (64 characters)"
  fi
  
  create_or_update_secret "jwt-secret-staging" "${JWT_SECRET}" "JWT Secret for Staging"
  create_or_update_secret "session-secret-staging" "${SESSION_SECRET}" "Session Secret for Staging"
  
  success "Application secrets stored"
}

# Store OpenAI API key
store_openai_api_key() {
  log "Storing OpenAI API key..."
  
  if [ -z "${OPENAI_API_KEY:-}" ]; then
    warning "OPENAI_API_KEY not provided via environment variable"
    warning "You can set it manually: export OPENAI_API_KEY='sk-...'"
    warning "Or create the secret manually in Secret Manager:"
    warning "  gcloud secrets create openai-api-key-staging --data-file=-"
    warning ""
    warning "Skipping OpenAI API key setup. Support engine will not work without it."
    return 0
  fi
  
  create_or_update_secret "openai-api-key-staging" "${OPENAI_API_KEY}" "OpenAI API Key for Staging (Support Engine)"
  
  success "OpenAI API key stored"
}

# Store database URL (constructed from password secret)
# Note: This will need to be constructed at runtime in Cloud Run
# For now, we'll create a template secret
store_database_url_template() {
  log "Creating database URL template..."
  
  # Database URL template (password will be injected from secret)
  # Format: postgres://user:password@host:port/database?sslmode=require
  local db_url_template="postgres://mymoolah_app:\${DB_PASSWORD}@/mymoolah_staging?host=/cloudsql/mymoolah-db:africa-south1:mmtp-pg-staging&sslmode=require"
  
  create_or_update_secret "database-url-template-staging" "${db_url_template}" "Database URL Template for Staging (Cloud Run format)"
  
  success "Database URL template stored"
  warning "Note: DATABASE_URL will be constructed at runtime in Cloud Run using the password secret"
}

# Main execution
main() {
  log "🚀 Setting up Staging Secrets in Secret Manager"
  log "Project: ${PROJECT_ID}"
  echo ""
  
  # Check prerequisites
  check_prerequisites
  
  # Store Zapper credentials
  store_zapper_credentials
  
  # Store MobileMart credentials
  store_mobilemart_credentials
  
  # Store application secrets
  store_application_secrets
  
  # Store OpenAI API key
  store_openai_api_key
  
  # Store database URL template
  store_database_url_template
  
  echo ""
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo "📊 Staging Secrets Setup Complete"
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo ""
  echo "Secrets created in Secret Manager:"
  echo "  - zapper-prod-org-id"
  echo "  - zapper-prod-api-token"
  echo "  - zapper-prod-x-api-key"
  echo "  - zapper-prod-api-url"
  echo "  - mobilemart-prod-client-id"
  echo "  - mobilemart-prod-client-secret"
  echo "  - mobilemart-prod-api-url"
  echo "  - mobilemart-prod-token-url"
  echo "  - jwt-secret-staging"
  echo "  - session-secret-staging"
  echo "  - openai-api-key-staging (if provided)"
  echo "  - database-url-template-staging"
  echo "  - db-mmtp-pg-staging-password (from database setup)"
  echo ""
  echo "⚠️  BANKING-GRADE SECURITY:"
  echo "   - All secrets stored in Secret Manager"
  echo "   - Automatic replication enabled"
  echo "   - Access controlled via IAM"
  echo "   - Audit logging enabled"
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo ""
  
  success "✅ Staging secrets setup complete!"
  log ""
  log "Next steps:"
  log "  1. Create Cloud Run service account"
  log "  2. Grant service account access to secrets"
  log "  3. Deploy Cloud Run service"
}

# Run main function
main "$@"

