#!/bin/bash

# Run Sweep Patterns Cache Migration
# Creates the sweep_patterns_cache table for banking-grade persistence
#
# Usage:
#   ./scripts/run-sweep-patterns-migration.sh [uat|staging]
#
# Examples:
#   ./scripts/run-sweep-patterns-migration.sh uat      # Run on UAT
#   ./scripts/run-sweep-patterns-migration.sh staging # Run on Staging
#   ./scripts/run-sweep-patterns-migration.sh         # Auto-detect (UAT if available)

set -euo pipefail

ENVIRONMENT="${1:-}"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

log() {
  echo -e "${BLUE}📋${NC} $*"
}

error() {
  echo -e "${RED}❌ ERROR:${NC} $*" >&2
}

success() {
  echo -e "${GREEN}✅${NC} $*"
}

warning() {
  echo -e "${YELLOW}⚠️  WARNING:${NC} $*" >&2
}

# Check if master migration script exists (preferred method)
if [ -f "./scripts/run-migrations-master.sh" ]; then
  log "Using master migration script (recommended)..."
  echo ""
  ./scripts/run-migrations-master.sh "${ENVIRONMENT:-uat}" 20251220_create_sweep_patterns_cache
  exit $?
fi

# Fallback: Direct migration (for local development)
log "Running Sweep Patterns Cache Migration (direct mode)..."
echo ""

# Load .env file if it exists
if [ -f .env ]; then
  log "Loading .env file..."
  # Export variables from .env, ignoring comments, empty lines, and separator lines
  while IFS= read -r line || [ -n "$line" ]; do
    # Skip comments, empty lines, and lines that don't contain '='
    if [[ "$line" =~ ^[[:space:]]*# ]] || [[ -z "$line" ]] || [[ ! "$line" =~ = ]]; then
      continue
    fi
    # Export the variable
    export "$line"
  done < .env
  success ".env file loaded"
  
  # Check if Cloud SQL Auth Proxy is running (Codespaces)
  PROXY_PORT="6543"
  proxy_running=false
  
  # Check if proxy is running on port 6543
  if command -v nc >/dev/null 2>&1; then
    if nc -z 127.0.0.1 ${PROXY_PORT} 2>/dev/null; then
      proxy_running=true
    fi
  elif command -v pgrep >/dev/null 2>&1; then
    if pgrep -f "cloud-sql-proxy.*${PROXY_PORT}" >/dev/null 2>&1; then
      proxy_running=true
    fi
  fi
  
  # If proxy is running, update DATABASE_URL to use it
  if [ "$proxy_running" = true ] && [ -n "$DATABASE_URL" ]; then
    log "Cloud SQL Auth Proxy detected on port ${PROXY_PORT}"
    # Update DATABASE_URL to use proxy (127.0.0.1:6543)
    export DATABASE_URL=$(node -e "
      const u = new URL(process.env.DATABASE_URL);
      u.hostname = '127.0.0.1';
      u.port = '${PROXY_PORT}';
      u.searchParams.set('sslmode', 'disable');
      console.log(u.toString());
    " 2>/dev/null || echo "$DATABASE_URL")
    success "Updated DATABASE_URL to use proxy connection"
  elif [ -n "$DATABASE_URL" ]; then
    # Check if DATABASE_URL points to a local database
    if [[ "$DATABASE_URL" == *"127.0.0.1"* ]] || [[ "$DATABASE_URL" == *"localhost"* ]]; then
      warning "Local database connection detected"
      log "If database is not running, you may need to:"
      log "  1. Start local PostgreSQL, OR"
      log "  2. Use master migration script: ./scripts/run-migrations-master.sh uat"
      log "  3. Start Cloud SQL Auth Proxy: ./scripts/ensure-proxies-running.sh"
    fi
  fi
  echo ""
else
  warning ".env file not found"
  log "Please ensure DATABASE_URL is set in your environment"
  echo ""
fi

# Run the specific migration
log "Running sweep patterns cache migration..."
log "Migration: 20251220_create_sweep_patterns_cache.js"
echo ""

if npx sequelize-cli db:migrate --name 20251220_create_sweep_patterns_cache; then
  echo ""
  success "Migration completed successfully"
  echo ""
  log "Summary:"
  echo "  ✅ sweep_patterns_cache table created"
  echo "  ✅ Indexes created for fast lookups"
  echo "  ✅ Unique constraint on (patternType, patternValue)"
  echo ""
  log "Next steps:"
  echo "  1. Restart backend to load patterns from database"
  echo "  2. Check logs for: 'Sweep patterns loaded from DB'"
  echo "  3. Verify patterns are working in support queries"
else
  echo ""
  error "Migration failed"
  echo ""
  log "Troubleshooting:"
  echo "  1. Check database connection: Ensure DATABASE_URL is correct"
  echo "  2. For UAT/Staging: Use master script: ./scripts/run-migrations-master.sh uat"
  echo "  3. For local dev: Ensure PostgreSQL is running on the configured port"
  echo "  4. Check Cloud SQL Auth Proxy: ./scripts/ensure-proxies-running.sh"
  exit 1
fi

echo ""
success "Sweep Patterns Cache migration completed successfully!"
echo ""

