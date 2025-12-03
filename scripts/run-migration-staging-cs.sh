#!/usr/bin/env bash

set -euo pipefail

# Run Migration for Staging Database in Codespaces
# Usage: ./scripts/run-migration-staging-cs.sh [migration-name]

MIGRATION_NAME="${1:-}"
PROJECT_ID="mymoolah-db"
SECRET_NAME="db-mmtp-pg-staging-password"
DB_USER="mymoolah_app"
DB_NAME="mymoolah_staging"
PROXY_PORT="6544"
DB_HOST="127.0.0.1"

log() {
  echo "📋 $*"
}

error() {
  echo "❌ ERROR: $*" >&2
}

success() {
  echo "✅ $*"
}

warning() {
  echo "⚠️  WARNING: $*" >&2
}

# Check if proxy is running
check_proxy() {
  if ! lsof -ti:${PROXY_PORT} >/dev/null 2>&1; then
    error "Staging Cloud SQL Auth Proxy is NOT running on port ${PROXY_PORT}"
    echo ""
    echo "Please start it first:"
    echo "  ./scripts/start-staging-proxy-cs.sh"
    echo ""
    exit 1
  fi
  success "Staging proxy is running on port ${PROXY_PORT}"
}

# Get password from Secret Manager
get_password() {
  log "Retrieving Staging database password from Secret Manager..."
  
  local password=$(gcloud secrets versions access latest \
    --secret="${SECRET_NAME}" \
    --project="${PROJECT_ID}" 2>/dev/null | tr -d '\n\r')
  
  if [ -z "${password}" ]; then
    error "Failed to retrieve password from Secret Manager"
    exit 1
  fi
  
  echo "${password}"
}

# URL encode password
url_encode() {
  python3 -c "import urllib.parse, sys; print(urllib.parse.quote(sys.stdin.read().strip(), safe=''))" <<< "$1"
}

# Construct DATABASE_URL for Staging
construct_database_url() {
  local password=$(get_password)
  local encoded_password=$(url_encode "${password}")
  
  echo "postgres://${DB_USER}:${encoded_password}@${DB_HOST}:${PROXY_PORT}/${DB_NAME}?sslmode=disable"
}

# Test database connection (IAM auth - no password needed)
test_connection() {
  log "Testing database connection with IAM authentication..."
  
  # With --auto-iam-authn, connect without password - proxy handles IAM auth
  if psql -h "${DB_HOST}" -p "${PROXY_PORT}" -U "${DB_USER}" -d "${DB_NAME}" -c "SELECT current_database(), current_user;" >/dev/null 2>&1; then
    success "Database connection test successful"
    return 0
  else
    error "Database connection test failed"
    warning "Proxy is using IAM authentication (--auto-iam-authn)"
    warning "Please verify:"
    warning "  1. Database '${DB_NAME}' exists"
    warning "  2. User '${DB_USER}' has IAM permissions"
    warning "  3. Check proxy logs: tail -f /tmp/staging-proxy-6544.log"
    return 1
  fi
}

# Run migration
run_migration() {
  # With IAM authentication (--auto-iam-authn), no password needed in connection string
  # Proxy handles authentication automatically
  local database_url="postgres://${DB_USER}@${DB_HOST}:${PROXY_PORT}/${DB_NAME}?sslmode=disable"
  
  log "Setting DATABASE_URL for Staging database (IAM authentication)..."
  log "   Database URL: postgres://${DB_USER}@${DB_HOST}:${PROXY_PORT}/${DB_NAME}"
  log "   Note: Using IAM authentication (no password required)"
  export DATABASE_URL="${database_url}"
  export NODE_ENV="staging"
  
  log "Running migrations (DATABASE_URL is set, will be used automatically)..."
  npx sequelize-cli db:migrate --migrations-path migrations
}

# Main execution
main() {
  echo ""
  echo "🏦 Running Migration for Staging Database (Codespaces)"
  echo "======================================================"
  echo ""
  
  # Check prerequisites
  if ! command -v gcloud &> /dev/null; then
    error "gcloud CLI not found"
    exit 1
  fi
  
  if ! command -v npx &> /dev/null; then
    error "npx not found. Please install Node.js and npm."
    exit 1
  fi
  
  # Check proxy
  check_proxy
  
  # Test connection first
  if ! test_connection; then
    error "Connection test failed. Please fix the connection issue before running migrations."
    exit 1
  fi
  
  # Run migration
  run_migration
  
  success "Migration completed successfully!"
  echo ""
}

main
