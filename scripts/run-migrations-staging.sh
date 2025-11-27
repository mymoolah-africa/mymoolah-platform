#!/usr/bin/env bash

set -euo pipefail

# MyMoolah Treasury Platform - Run Database Migrations on Staging
# Connects via Cloud SQL Auth Proxy and runs Sequelize migrations

# Configuration
PROJECT_ID="mymoolah-db"
REGION="africa-south1"
STAGING_INSTANCE="mmtp-pg-staging"
STAGING_DATABASE="mymoolah_staging"
DB_USER="mymoolah_app"
PROXY_PORT="5434"
CONNECTION_NAME="${PROJECT_ID}:${REGION}:${STAGING_INSTANCE}"

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
  
  if ! command -v psql &> /dev/null; then
    error "psql not found. Please install PostgreSQL client."
    exit 1
  fi
  
  if ! command -v npx &> /dev/null; then
    error "npx not found. Please install Node.js and npm."
    exit 1
  fi
  
  if [ ! -f "./bin/cloud-sql-proxy" ]; then
    error "Cloud SQL Auth Proxy not found. Please run: bash scripts/setup-cloud-sql-proxy.sh"
    exit 1
  fi
  
  success "Prerequisites check passed"
}

# Get database password from Secret Manager
get_database_password() {
  log "Retrieving database password from Secret Manager..."
  
  local password=$(gcloud secrets versions access latest \
    --secret="db-mmtp-pg-staging-password" \
    --project="${PROJECT_ID}" 2>/dev/null)
  
  if [ -z "${password}" ]; then
    error "Failed to retrieve database password from Secret Manager"
    exit 1
  fi
  
  echo "${password}"
}

# Start Cloud SQL Auth Proxy
start_proxy() {
  log "Starting Cloud SQL Auth Proxy on port ${PROXY_PORT}..."
  
  # Check if proxy is already running
  if lsof -Pi :${PROXY_PORT} -sTCP:LISTEN -t >/dev/null 2>&1; then
    warning "Port ${PROXY_PORT} is already in use. Assuming proxy is running."
    return 0
  fi
  
  # Start proxy in background
  ./bin/cloud-sql-proxy "${CONNECTION_NAME}" --port=${PROXY_PORT} > /tmp/cloud-sql-proxy.log 2>&1 &
  local proxy_pid=$!
  
  # Wait for proxy to be ready
  log "Waiting for proxy to be ready..."
  local max_wait=30
  local waited=0
  while ! lsof -Pi :${PROXY_PORT} -sTCP:LISTEN -t >/dev/null 2>&1 && [ ${waited} -lt ${max_wait} ]; do
    sleep 1
    waited=$((waited + 1))
  done
  
  if ! lsof -Pi :${PROXY_PORT} -sTCP:LISTEN -t >/dev/null 2>&1; then
    error "Cloud SQL Auth Proxy failed to start within ${max_wait} seconds"
    cat /tmp/cloud-sql-proxy.log
    kill ${proxy_pid} 2>/dev/null || true
    exit 1
  fi
  
  success "Cloud SQL Auth Proxy started (PID: ${proxy_pid})"
  echo "${proxy_pid}" > /tmp/cloud-sql-proxy-staging.pid
}

# Stop Cloud SQL Auth Proxy
stop_proxy() {
  if [ -f /tmp/cloud-sql-proxy-staging.pid ]; then
    local proxy_pid=$(cat /tmp/cloud-sql-proxy-staging.pid)
    if kill -0 ${proxy_pid} 2>/dev/null; then
      log "Stopping Cloud SQL Auth Proxy (PID: ${proxy_pid})..."
      kill ${proxy_pid} 2>/dev/null || true
      rm -f /tmp/cloud-sql-proxy-staging.pid
      success "Cloud SQL Auth Proxy stopped"
    fi
  fi
}

# Test database connection
test_connection() {
  local password=$1
  log "Testing database connection..."
  
  local error_output=$(PGPASSWORD="${password}" psql \
    -h 127.0.0.1 \
    -p ${PROXY_PORT} \
    -U ${DB_USER} \
    -d ${STAGING_DATABASE} \
    -c "SELECT version();" 2>&1)
  
  if [ $? -eq 0 ]; then
    success "Database connection successful"
    return 0
  else
    error "Failed to connect to database"
    error "Connection details:"
    error "  Host: 127.0.0.1"
    error "  Port: ${PROXY_PORT}"
    error "  User: ${DB_USER}"
    error "  Database: ${STAGING_DATABASE}"
    error "Error output: ${error_output}"
    
    # Check if proxy is actually running
    if ! lsof -Pi :${PROXY_PORT} -sTCP:LISTEN -t >/dev/null 2>&1; then
      error "Port ${PROXY_PORT} is not listening. Proxy may not be running correctly."
      error "Please check: ps aux | grep cloud-sql-proxy"
    fi
    
    return 1
  fi
}

# URL encode password for DATABASE_URL using Python (more reliable)
url_encode() {
  local string="${1}"
  echo -n "${string}" | python3 -c "import sys, urllib.parse; print(urllib.parse.quote(sys.stdin.read(), safe=''))"
}

# Run migrations
run_migrations() {
  local password=$1
  log "Running database migrations..."
  
  # URL encode password for DATABASE_URL (handles special characters)
  local encoded_password=$(url_encode "${password}")
  
  # Set DATABASE_URL
  export DATABASE_URL="postgres://${DB_USER}:${encoded_password}@127.0.0.1:${PROXY_PORT}/${STAGING_DATABASE}?sslmode=disable"
  export NODE_ENV=staging
  
  # Run migrations
  npx sequelize-cli db:migrate || {
    error "Database migrations failed"
    return 1
  }
  
  success "Database migrations completed successfully"
}

# Verify migrations
verify_migrations() {
  local password=$1
  log "Verifying migrations..."
  
  # Count tables
  local table_count=$(PGPASSWORD="${password}" psql \
    -h 127.0.0.1 \
    -p ${PROXY_PORT} \
    -U ${DB_USER} \
    -d ${STAGING_DATABASE} \
    -t -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public';" 2>/dev/null | tr -d ' ')
  
  if [ -z "${table_count}" ] || [ "${table_count}" = "0" ]; then
    error "No tables found after migrations"
    return 1
  fi
  
  success "Migrations verified: ${table_count} tables created"
  
  # List key tables
  log "Key tables:"
  PGPASSWORD="${password}" psql \
    -h 127.0.0.1 \
    -p ${PROXY_PORT} \
    -U ${DB_USER} \
    -d ${STAGING_DATABASE} \
    -c "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name LIMIT 20;" 2>/dev/null || true
}

# Cleanup on exit
cleanup() {
  stop_proxy
}

trap cleanup EXIT INT TERM

# Main execution
main() {
  log "🚀 Running Database Migrations on Staging"
  log "Instance: ${STAGING_INSTANCE}"
  log "Database: ${STAGING_DATABASE}"
  echo ""
  
  # Check prerequisites
  check_prerequisites
  
  # Get database password
  local password=$(get_database_password)
  
  # Start proxy
  start_proxy
  
  # Test connection
  test_connection "${password}"
  
  # Run migrations
  run_migrations "${password}"
  
  # Verify migrations
  verify_migrations "${password}"
  
  echo ""
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo "📊 Database Migrations Complete"
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo "Database: ${STAGING_DATABASE}"
  echo "Status: ✅ Migrations completed successfully"
  echo ""
  echo "Next steps:"
  echo "  1. Test Cloud Run service"
  echo "  2. Test Zapper integration"
  echo "  3. Verify all endpoints"
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo ""
  
  success "✅ Migrations complete!"
}

# Run main function
main "$@"

