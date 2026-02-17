#!/usr/bin/env bash

set -euo pipefail

# MyMoolah Treasury Platform - Production Secrets Setup Script
# Stores all required credentials in Google Secret Manager for Production
# Banking-Grade: Unique JWT/session per environment; API keys as configured

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
  
  if ! gcloud projects describe "${PROJECT_ID}" > /dev/null 2>&1; then
    error "Project ${PROJECT_ID} not found or you don't have access."
    exit 1
  fi
  
  gcloud config set project "${PROJECT_ID}" > /dev/null 2>&1
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
      --replication-policy="automatic" || {
      error "Failed to create secret ${secret_name}"
      return 1
    }
    success "Secret created: ${secret_name}"
  fi
}

# Store application secrets (MUST be unique per environment)
store_application_secrets() {
  log "Storing Production application secrets..."
  
  if [ -z "${JWT_SECRET:-}" ]; then
    log "Generating JWT secret..."
    JWT_SECRET=$(openssl rand -base64 48 | tr -d "=+/" | head -c 64)
    log "JWT secret generated (64 characters)"
  fi
  
  if [ -z "${SESSION_SECRET:-}" ]; then
    log "Generating session secret..."
    SESSION_SECRET=$(openssl rand -base64 48 | tr -d "=+/" | head -c 64)
    log "Session secret generated (64 characters)"
  fi
  
  create_or_update_secret "jwt-secret-production" "${JWT_SECRET}" "JWT Secret for Production"
  create_or_update_secret "session-secret-production" "${SESSION_SECRET}" "Session Secret for Production"
  
  success "Application secrets stored"
}

# Zapper/MobileMart - reuse same prod credentials (shared across staging/production)
# No action needed - zapper-prod-*, mobilemart-prod-* already in Secret Manager from staging setup

# Store EasyPay API key
store_easypay_credentials() {
  log "Storing EasyPay API credentials..."
  
  if [ -z "${EASYPAY_API_KEY:-}" ]; then
    warning "EASYPAY_API_KEY not provided. Set: export EASYPAY_API_KEY='...'"
    warning "Skipping. EasyPay settlement callbacks will fail without it."
    return 0
  fi
  
  create_or_update_secret "easypay-api-key-production" "${EASYPAY_API_KEY}" "EasyPay API Key for Production"
  success "EasyPay API key stored"
}

# Store OpenAI API key
store_openai_api_key() {
  log "Storing OpenAI API key..."
  
  if [ -z "${OPENAI_API_KEY:-}" ]; then
    warning "OPENAI_API_KEY not provided. Support engine will not work."
    return 0
  fi
  
  create_or_update_secret "openai-api-key-production" "${OPENAI_API_KEY}" "OpenAI API Key for Production"
  success "OpenAI API key stored"
}

# Store VALR API credentials (USDC Send)
store_valr_credentials() {
  log "Storing VALR API credentials..."
  
  if [ -z "${VALR_API_KEY:-}" ] || [ -z "${VALR_API_SECRET:-}" ]; then
    warning "VALR_API_KEY or VALR_API_SECRET not provided."
    warning "USDC quote/send will return 503 without them."
    return 0
  fi
  
  create_or_update_secret "valr-api-key-production" "${VALR_API_KEY}" "VALR API Key for Production"
  create_or_update_secret "valr-api-secret-production" "${VALR_API_SECRET}" "VALR API Secret for Production"
  success "VALR API credentials stored"
}

# Verify db-mmtp-pg-production-password exists
verify_db_password() {
  log "Verifying Production database password..."
  
  if ! gcloud secrets describe "db-mmtp-pg-production-password" --project="${PROJECT_ID}" > /dev/null 2>&1; then
    error "db-mmtp-pg-production-password not found in Secret Manager"
    error "Run ./scripts/reset-production-password.sh or create manually"
    exit 1
  fi
  
  success "Database password secret exists"
}

# Main execution
main() {
  log "🚀 Setting up Production Secrets in Secret Manager"
  log "Project: ${PROJECT_ID}"
  echo ""
  
  check_prerequisites
  verify_db_password
  store_application_secrets
  store_easypay_credentials
  store_openai_api_key
  store_valr_credentials
  
  echo ""
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo "📊 Production Secrets Setup Complete"
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo ""
  echo "Production-specific secrets:"
  echo "  - jwt-secret-production"
  echo "  - session-secret-production"
  echo "  - db-mmtp-pg-production-password (verified)"
  echo "  - easypay-api-key-production (if provided)"
  echo "  - openai-api-key-production (if provided)"
  echo "  - valr-api-key-production (if provided)"
  echo "  - valr-api-secret-production (if provided)"
  echo ""
  echo "Shared prod credentials (from staging setup):"
  echo "  - zapper-prod-org-id, zapper-prod-api-token, zapper-prod-x-api-key, zapper-prod-api-url"
  echo "  - mobilemart-prod-client-id, mobilemart-prod-client-secret, mobilemart-prod-api-url, mobilemart-prod-token-url"
  echo "  - vas-failover-enabled (VAS Error 1002 exhaustive failover)"
  echo ""
  echo "Next: ./scripts/build-push-deploy-production.sh"
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo ""
  
  success "✅ Production secrets setup complete!"
}

main "$@"
