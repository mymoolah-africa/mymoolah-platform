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

# Run migration
run_migration() {
  local database_url=$(construct_database_url)
  
  log "Setting DATABASE_URL for Staging database..."
  export DATABASE_URL="${database_url}"
  
  log "Running migration..."
  
  if [ -n "${MIGRATION_NAME}" ]; then
    log "Running specific migration: ${MIGRATION_NAME}"
    npx sequelize-cli db:migrate --migrations-path migrations --name "${MIGRATION_NAME}"
  else
    log "Running all pending migrations..."
    npx sequelize-cli db:migrate --migrations-path migrations
  fi
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
  
  # Run migration
  run_migration
  
  success "Migration completed successfully!"
  echo ""
}

main
