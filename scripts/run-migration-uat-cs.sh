#!/usr/bin/env bash

set -euo pipefail

# Run Migration for UAT Database in Codespaces
# Usage: ./scripts/run-migration-uat-cs.sh [migration-name]

MIGRATION_NAME="${1:-}"
DB_USER="mymoolah_app"
DB_NAME="mymoolah"
PROXY_PORT="6543"
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

# Load .env file (safely handle comments and invalid lines)
load_env() {
  local env_file="${1:-.env}"
  local script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
  local project_root="$(cd "${script_dir}/.." && pwd)"
  local env_path="${project_root}/${env_file}"
  
  if [ -f "${env_path}" ]; then
    log "Loading environment variables from ${env_path}..."
    
    # Read .env file line by line, safely exporting only valid KEY=VALUE pairs
    set -a
    while IFS= read -r line || [ -n "$line" ]; do
      # Trim whitespace
      line=$(echo "$line" | sed 's/^[[:space:]]*//;s/[[:space:]]*$//')
      
      # Skip empty lines
      [ -z "$line" ] && continue
      
      # Skip lines starting with # (comments)
      [[ "$line" =~ ^# ]] && continue
      
      # Skip lines starting with = (separators/invalid)
      [[ "$line" =~ ^= ]] && continue
      
      # Skip lines that don't contain = (not valid env vars)
      [[ ! "$line" =~ = ]] && continue
      
      # Only process lines that match KEY=VALUE format (KEY starts with letter/underscore)
      if [[ "$line" =~ ^[A-Za-z_][A-Za-z0-9_]*= ]]; then
        # Extract KEY and VALUE safely
        key="${line%%=*}"
        value="${line#*=}"
        
        # Remove quotes if present
        value=$(echo "$value" | sed -e 's/^"//' -e 's/"$//' -e "s/^'//" -e "s/'$//")
        
        # Export safely
        export "${key}"="${value}" 2>/dev/null || true
      fi
    done < "${env_path}"
    set +a
    
    success "Environment variables loaded from ${env_path}"
    
    # Verify DATABASE_URL or DB_PASSWORD is set (both are optional - we'll handle in run_migration)
    # Don't fail here - let run_migration handle it
  else
    warning ".env file not found at ${env_path}"
    warning "Will try to use existing environment variables"
  fi
}

# Check if proxy is running
check_proxy() {
  if ! lsof -ti:${PROXY_PORT} >/dev/null 2>&1; then
    error "UAT Cloud SQL Auth Proxy is NOT running on port ${PROXY_PORT}"
    echo ""
    echo "Please start it first:"
    echo "  ./scripts/ensure-proxies-running.sh"
    echo ""
    exit 1
  fi
  success "UAT proxy is running on port ${PROXY_PORT}"
}

# Get UAT password from .env
get_uat_password() {
  log "Retrieving UAT database password from .env file..."
  
  # Try DATABASE_URL first
  if [ -n "${DATABASE_URL:-}" ]; then
    log "Using DATABASE_URL from environment..."
    
    # Parse password from DATABASE_URL
    # Format: postgres://user:password@host:port/database
    local url="${DATABASE_URL}"
    if [[ "${url}" =~ postgres://[^:]+:([^@]+)@ ]]; then
      local password="${BASH_REMATCH[1]}"
      # URL decode if needed
      password=$(python3 -c "import urllib.parse, sys; print(urllib.parse.unquote(sys.stdin.read().strip()))" <<< "${password}")
      echo "${password}"
      return 0
    fi
  fi
  
  # Try DB_PASSWORD
  if [ -n "${DB_PASSWORD:-}" ]; then
    log "Using DB_PASSWORD from environment..."
    echo "${DB_PASSWORD}"
    return 0
  fi
  
  error "UAT password not found. Please set DATABASE_URL or DB_PASSWORD in .env file."
  exit 1
}

# URL encode password
url_encode() {
  python3 -c "import urllib.parse, sys; print(urllib.parse.quote(sys.stdin.read().strip(), safe=''))" <<< "$1"
}

# Construct DATABASE_URL for UAT
construct_database_url() {
  local password=$(get_uat_password)
  local encoded_password=$(url_encode "${password}")
  
  echo "postgres://${DB_USER}:${encoded_password}@${DB_HOST}:${PROXY_PORT}/${DB_NAME}?sslmode=disable"
}

# Test database connection (optional - Sequelize will test it anyway)
test_connection() {
  log "Testing database connection..."
  
  # Check if psql is available
  if ! command -v psql &> /dev/null; then
    warning "psql not found - skipping connection test"
    warning "Sequelize CLI will test the connection when running migrations"
    return 0
  fi
  
  local password=$(get_uat_password)
  
  # Test with psql (if available)
  if PGPASSWORD="${password}" psql -h "${DB_HOST}" -p "${PROXY_PORT}" -U "${DB_USER}" -d "${DB_NAME}" -c "SELECT current_database(), current_user;" >/dev/null 2>&1; then
    success "Database connection test successful"
    return 0
  else
    warning "Connection test with psql failed"
    warning "This is okay - Sequelize CLI will test the connection when running migrations"
    warning "If migrations fail, check:"
    warning "  1. Database '${DB_NAME}' exists"
    warning "  2. User '${DB_USER}' has correct permissions"
    warning "  3. Proxy is running and accessible on port ${PROXY_PORT}"
    warning "  4. Password is correct in .env file"
    return 0  # Don't fail - let Sequelize handle it
  fi
}

# Run migration
run_migration() {
  # Check if DATABASE_URL exists and points to UAT (port 6543)
  if [ -n "${DATABASE_URL:-}" ] && [[ "${DATABASE_URL}" =~ :6543/ ]]; then
    log "Using DATABASE_URL from .env file (already configured for UAT)"
  else
    # Construct DATABASE_URL if not set or doesn't point to UAT
    log "Constructing DATABASE_URL for UAT..."
    
    local password
    if [ -n "${DB_PASSWORD:-}" ]; then
      password="${DB_PASSWORD}"
    else
      # Extract from DATABASE_URL if it exists but wrong port
      if [ -n "${DATABASE_URL:-}" ]; then
        # Try to extract password from existing DATABASE_URL
        if [[ "${DATABASE_URL}" =~ postgres://[^:]+:([^@]+)@ ]]; then
          password="${BASH_REMATCH[1]}"
          # URL decode if needed
          password=$(python3 -c "import urllib.parse; print(urllib.parse.unquote('${password}'))" 2>/dev/null || echo "${password}")
        fi
      fi
    fi
    
    if [ -z "${password:-}" ]; then
      error "Could not determine UAT password"
      error "Please set DB_PASSWORD in .env file or ensure DATABASE_URL is set correctly"
      exit 1
    fi
    
    # URL encode the password (critical for special characters like @)
    local encoded_password=$(python3 -c "import urllib.parse; print(urllib.parse.quote('${password}', safe=''))")
    
    export DATABASE_URL="postgres://${DB_USER}:${encoded_password}@${DB_HOST}:${PROXY_PORT}/${DB_NAME}?sslmode=disable"
    log "Constructed DATABASE_URL for UAT database"
  fi
  
  export NODE_ENV="development"
  
  log "Running migrations..."
  if [ -n "${MIGRATION_NAME}" ]; then
    log "Running specific migration: ${MIGRATION_NAME}"
    npx sequelize-cli db:migrate --name "${MIGRATION_NAME}" --migrations-path migrations
  else
    log "Running all pending migrations..."
    npx sequelize-cli db:migrate --migrations-path migrations
  fi
}

# Main execution
main() {
  echo ""
  echo "🏦 Running Migration for UAT Database (Codespaces)"
  echo "=================================================="
  echo ""
  
  # Check prerequisites
  if ! command -v npx &> /dev/null; then
    error "npx not found. Please install Node.js and npm."
    exit 1
  fi
  
  # Load .env file
  load_env
  
  # Check proxy
  check_proxy
  
  # Skip connection test - Sequelize CLI will handle it
  # If DATABASE_URL is already set correctly in .env, use it directly
  
  # Run migration (Sequelize CLI will test connection itself)
  run_migration
  
  success "Migration completed successfully!"
  echo ""
}

main
