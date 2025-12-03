#!/usr/bin/env bash

set -euo pipefail

# Run Migration for UAT Database - SIMPLIFIED VERSION
# Usage: ./scripts/run-migration-uat-simple.sh

MIGRATION_NAME="${1:-}"
PROXY_PORT="6543"

log() {
  echo "📋 $*"
}

error() {
  echo "❌ ERROR: $*" >&2
}

success() {
  echo "✅ $*"
}

# Load .env file
load_env() {
  local script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
  local project_root="$(cd "${script_dir}/.." && pwd)"
  local env_path="${project_root}/.env"
  
  if [ -f "${env_path}" ]; then
    log "Loading environment variables from ${env_path}..."
    set -a
    while IFS= read -r line || [ -n "$line" ]; do
      line=$(echo "$line" | sed 's/^[[:space:]]*//;s/[[:space:]]*$//')
      [ -z "$line" ] && continue
      [[ "$line" =~ ^# ]] && continue
      [[ "$line" =~ ^= ]] && continue
      [[ ! "$line" =~ = ]] && continue
      if [[ "$line" =~ ^[A-Za-z_][A-Za-z0-9_]*= ]]; then
        key="${line%%=*}"
        value="${line#*=}"
        value=$(echo "$value" | sed -e 's/^"//' -e 's/"$//' -e "s/^'//" -e "s/'$//")
        export "${key}"="${value}" 2>/dev/null || true
      fi
    done < "${env_path}"
    set +a
    success "Environment variables loaded"
  else
    error ".env file not found at ${env_path}"
    exit 1
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

# Main execution
main() {
  echo ""
  echo "🏦 Running Migration for UAT Database (SIMPLIFIED)"
  echo "=================================================="
  echo ""
  
  if ! command -v npx &> /dev/null; then
    error "npx not found. Please install Node.js and npm."
    exit 1
  fi
  
  load_env
  
  if [ -z "${DATABASE_URL:-}" ]; then
    error "DATABASE_URL not found in .env file"
    error ""
    error "Please ensure DATABASE_URL is set in your .env file"
    error "Example format:"
    error "  DATABASE_URL=postgres://mymoolah_app:B0t3s%40Mymoolah@127.0.0.1:6543/mymoolah?sslmode=disable"
    error ""
    error "Note: Password with @ symbol must be URL-encoded (@ becomes %40)"
    exit 1
  fi
  
  check_proxy
  
  # Ensure DATABASE_URL uses proxy (127.0.0.1:6543) not direct connection
  # Replace any host:port with 127.0.0.1:6543 to force proxy usage
  if [[ ! "${DATABASE_URL}" =~ @127\.0\.0\.1:6543/ ]]; then
    log "Rewriting DATABASE_URL to use proxy (127.0.0.1:6543) instead of direct connection"
    # Extract user, password, database, and params from existing URL
    # Format: postgres://user:password@host:port/database?params
    if [[ "${DATABASE_URL}" =~ postgres://([^:]+):([^@]+)@([^/]+)/([^?]+)(\?.*)? ]]; then
      local user="${BASH_REMATCH[1]}"
      local password="${BASH_REMATCH[2]}"
      local database="${BASH_REMATCH[4]}"
      local params="${BASH_REMATCH[5]:-?sslmode=disable}"
      
      # Reconstruct URL with proxy host:port
      export DATABASE_URL="postgres://${user}:${password}@127.0.0.1:6543/${database}${params}"
      log "Updated DATABASE_URL to use proxy"
    else
      error "Could not parse DATABASE_URL format"
      error "Expected format: postgres://user:password@host:port/database?params"
      exit 1
    fi
  else
    log "DATABASE_URL already points to proxy (127.0.0.1:6543)"
  fi
  
  log "Using DATABASE_URL: postgres://${DATABASE_URL#postgres://}"
  export NODE_ENV="development"
  
  log "Running migrations..."
  if [ -n "${MIGRATION_NAME}" ]; then
    npx sequelize-cli db:migrate --name "${MIGRATION_NAME}" --migrations-path migrations
  else
    npx sequelize-cli db:migrate --migrations-path migrations
  fi
  
  success "Migration completed successfully!"
  echo ""
}

main
