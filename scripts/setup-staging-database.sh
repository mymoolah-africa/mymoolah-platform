#!/usr/bin/env bash

set -euo pipefail

# MyMoolah Treasury Platform - Staging Database Setup Script
# Banking-Grade Security: All credentials stored in Secret Manager

# Configuration
PROJECT_ID="mymoolah-db"
REGION="africa-south1"
STAGING_INSTANCE="mmtp-pg-staging"
STAGING_DATABASE="mymoolah_staging"
DB_USER="mymoolah_app"

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
  
  # Set project
  gcloud config set project "${PROJECT_ID}" > /dev/null 2>&1 || {
    error "Failed to set project ${PROJECT_ID}. Please verify project ID."
    exit 1
  }
  
  success "Prerequisites check passed"
}

# Generate banking-grade secure password
# Requirements: 32+ characters, mixed case, numbers, special chars
generate_password() {
  # Generate 36-character password with banking-grade complexity
  local base_part=$(openssl rand -base64 24 | tr -d "=+/" | head -c 28)
  
  local special_chars="!@#$%^&*"
  local numbers="0123456789"
  local upper="ABCDEFGHIJKLMNOPQRSTUVWXYZ"
  local lower="abcdefghijklmnopqrstuvwxyz"
  
  local special_idx=$((RANDOM % ${#special_chars}))
  local number_idx=$((RANDOM % ${#numbers}))
  local upper_idx=$((RANDOM % ${#upper}))
  local lower_idx=$((RANDOM % ${#lower}))
  
  local special="${special_chars:$special_idx:1}"
  local number="${numbers:$number_idx:1}"
  local upper_char="${upper:$upper_idx:1}"
  local lower_char="${lower:$lower_idx:1}"
  local extra=$(openssl rand -hex 4 | head -c 4)
  
  local combined="${base_part}${special}${number}${upper_char}${lower_char}${extra}"
  
  # Shuffle using Python (more portable than shuf)
  python3 -c "import random, sys; chars = list('${combined}'); random.shuffle(chars); print(''.join(chars))" 2>/dev/null || \
  python -c "import random, sys; chars = list('${combined}'); random.shuffle(chars); print(''.join(chars))" 2>/dev/null || \
  echo "${combined}"
}

# Check instance status
check_instance_status() {
  log "Checking instance status..."
  
  local state=$(gcloud sql instances describe "${STAGING_INSTANCE}" \
    --project="${PROJECT_ID}" \
    --format="value(state)" 2>/dev/null || echo "NOT_FOUND")
  
  if [ "${state}" = "NOT_FOUND" ]; then
    error "Instance ${STAGING_INSTANCE} not found. Please create it first using setup-staging-production-databases.sh"
    exit 1
  fi
  
  if [ "${state}" != "RUNNABLE" ]; then
    warning "Instance is in state: ${state}. Waiting for it to be RUNNABLE..."
    log "This may take a few minutes. Please wait..."
    
    # Wait up to 10 minutes for instance to be ready
    local max_wait=600
    local waited=0
    while [ "${state}" != "RUNNABLE" ] && [ ${waited} -lt ${max_wait} ]; do
      sleep 10
      waited=$((waited + 10))
      state=$(gcloud sql instances describe "${STAGING_INSTANCE}" \
        --project="${PROJECT_ID}" \
        --format="value(state)" 2>/dev/null || echo "UNKNOWN")
      log "Instance state: ${state} (waited ${waited}s)"
    done
    
    if [ "${state}" != "RUNNABLE" ]; then
      error "Instance did not become RUNNABLE within ${max_wait} seconds. Current state: ${state}"
      exit 1
    fi
  fi
  
  success "Instance is RUNNABLE and ready"
}

# Create database
create_database() {
  log "Creating database ${STAGING_DATABASE}..."
  
  # Check if database already exists
  if gcloud sql databases describe "${STAGING_DATABASE}" \
    --instance="${STAGING_INSTANCE}" \
    --project="${PROJECT_ID}" > /dev/null 2>&1; then
    warning "Database ${STAGING_DATABASE} already exists. Skipping creation."
    return 0
  fi
  
  gcloud sql databases create "${STAGING_DATABASE}" \
    --instance="${STAGING_INSTANCE}" \
    --project="${PROJECT_ID}" \
    --charset=UTF8 \
    --collation=en_US.UTF8 || {
    error "Failed to create database ${STAGING_DATABASE}"
    return 1
  }
  
  success "Database ${STAGING_DATABASE} created successfully"
}

# Create user and store password in Secret Manager
create_user_and_store_secret() {
  log "Setting up user ${DB_USER}..."
  
  # Generate banking-grade password
  log "Generating banking-grade password (32+ characters)..."
  local password=$(generate_password)
  
  if [ ${#password} -lt 32 ]; then
    error "Generated password does not meet banking-grade requirements (32+ characters)"
    exit 1
  fi
  
  success "Password generated (${#password} characters)"
  
  # Check if user already exists
  local user_exists=false
  if gcloud sql users describe "${DB_USER}" \
    --instance="${STAGING_INSTANCE}" \
    --project="${PROJECT_ID}" > /dev/null 2>&1; then
    user_exists=true
    warning "User ${DB_USER} already exists. Will reset password."
  fi
  
  # Create or update user
  if [ "${user_exists}" = "true" ]; then
    log "Resetting password for existing user ${DB_USER}..."
    gcloud sql users set-password "${DB_USER}" \
      --instance="${STAGING_INSTANCE}" \
      --project="${PROJECT_ID}" \
      --password="${password}" || {
      error "Failed to reset password for user ${DB_USER}"
      return 1
    }
    success "Password reset for user ${DB_USER}"
  else
    log "Creating new user ${DB_USER}..."
    gcloud sql users create "${DB_USER}" \
      --instance="${STAGING_INSTANCE}" \
      --project="${PROJECT_ID}" \
      --password="${password}" || {
      error "Failed to create user ${DB_USER}"
      return 1
    }
    success "User ${DB_USER} created successfully"
  fi
  
  # Store password in Secret Manager
  log "Storing password in Secret Manager..."
  local secret_name="db-mmtp-pg-staging-password"
  
  # Check if secret already exists
  if gcloud secrets describe "${secret_name}" --project="${PROJECT_ID}" > /dev/null 2>&1; then
    warning "Secret ${secret_name} already exists. Creating new version..."
    echo -n "${password}" | gcloud secrets versions add "${secret_name}" \
      --project="${PROJECT_ID}" \
      --data-file=- || {
      error "Failed to add new version to secret ${secret_name}"
      return 1
    }
    success "New version added to secret ${secret_name}"
  else
    echo -n "${password}" | gcloud secrets create "${secret_name}" \
      --project="${PROJECT_ID}" \
      --data-file=- || {
      error "Failed to create secret ${secret_name}"
      return 1
    }
    success "Secret ${secret_name} created in Secret Manager"
  fi
  
  # Display connection info (password is now in Secret Manager, not displayed)
  echo ""
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo "📊 Staging Database Setup Complete"
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo "Instance: ${STAGING_INSTANCE}"
  echo "Database: ${STAGING_DATABASE}"
  echo "User: ${DB_USER}"
  echo "Password: Stored in Secret Manager (${secret_name})"
  echo ""
  echo "Connection Name: ${PROJECT_ID}:${REGION}:${STAGING_INSTANCE}"
  echo ""
  echo "⚠️  BANKING-GRADE SECURITY:"
  echo "   - Password stored in Secret Manager (not displayed)"
  echo "   - Use IAM service accounts for access"
  echo "   - Use Cloud SQL Auth Proxy for connections"
  echo "   - SSL required for all connections"
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo ""
}

# Main execution
main() {
  log "🚀 Setting up Staging Database"
  log "Project: ${PROJECT_ID}"
  log "Instance: ${STAGING_INSTANCE}"
  log "Database: ${STAGING_DATABASE}"
  echo ""
  
  # Check prerequisites
  check_prerequisites
  
  # Check instance status
  check_instance_status
  
  # Create database
  create_database
  
  # Create user and store password
  create_user_and_store_secret
  
  success "✅ Staging database setup complete!"
  log ""
  log "Next steps:"
  log "  1. Run database migrations: npx sequelize-cli db:migrate"
  log "  2. Store other secrets in Secret Manager"
  log "  3. Deploy Cloud Run service"
}

# Run main function
main "$@"

