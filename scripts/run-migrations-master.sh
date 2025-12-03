#!/usr/bin/env bash

set -euo pipefail

# ============================================================================
# MASTER MIGRATION SCRIPT - UAT & STAGING
# ============================================================================
# 
# This is the ONLY script you need for running migrations
# Handles all connection, password, and proxy management automatically
#
# Usage:
#   ./scripts/run-migrations-master.sh [uat|staging] [migration-name]
#
# Examples:
#   ./scripts/run-migrations-master.sh uat              # Run all UAT migrations
#   ./scripts/run-migrations-master.sh staging          # Run all Staging migrations
#   ./scripts/run-migrations-master.sh uat 20251203_01  # Run specific migration
# ============================================================================

ENVIRONMENT="${1:-}"
MIGRATION_NAME="${2:-}"

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

# Show usage
show_usage() {
  echo ""
  echo "🏦 Master Migration Script"
  echo "=========================="
  echo ""
  echo "Usage: $0 [uat|staging] [migration-name]"
  echo ""
  echo "Examples:"
  echo "  $0 uat                    # Run all pending UAT migrations"
  echo "  $0 staging                # Run all pending Staging migrations"
  echo "  $0 uat 20251203_01        # Run specific UAT migration"
  echo "  $0 staging 20251203_01    # Run specific Staging migration"
  echo ""
}

# Validate environment
if [ -z "${ENVIRONMENT}" ] || [[ ! "${ENVIRONMENT}" =~ ^(uat|staging)$ ]]; then
  error "Invalid or missing environment"
  show_usage
  exit 1
fi

# Check prerequisites
if ! command -v node &> /dev/null; then
  error "Node.js not found. Please install Node.js."
  exit 1
fi

if ! command -v npx &> /dev/null; then
  error "npx not found. Please install npm."
  exit 1
fi

# Ensure proxies are running
check_proxies() {
  log "Checking Cloud SQL Auth Proxies..."
  
  # Check UAT proxy (6543)
  if ! lsof -ti:6543 >/dev/null 2>&1; then
    warning "UAT proxy not running on port 6543"
    log "Starting UAT proxy..."
    cd "$(dirname "$0")/.." || exit 1
    ./scripts/ensure-proxies-running.sh 2>/dev/null || {
      error "Failed to start proxies. Run manually: ./scripts/ensure-proxies-running.sh"
      exit 1
    }
  fi
  
  # Check Staging proxy (6544)
  if ! lsof -ti:6544 >/dev/null 2>&1; then
    warning "Staging proxy not running on port 6544"
    log "Starting Staging proxy..."
    cd "$(dirname "$0")/.." || exit 1
    ./scripts/ensure-proxies-running.sh 2>/dev/null || {
      error "Failed to start proxies. Run manually: ./scripts/ensure-proxies-running.sh"
      exit 1
    }
  fi
  
  success "All proxies are running"
}

# Run migrations using Node.js helper
run_migrations() {
  log "Running migrations for ${ENVIRONMENT}..."
  
  # Create temp script that uses our connection helper
  local temp_script=$(mktemp)
  cat > "${temp_script}" << 'EOF'
require('dotenv').config();
const { getUATDatabaseURL, getStagingDatabaseURL, CONFIG } = require('./scripts/db-connection-helper');

const environment = process.env.MIGRATION_ENV;
const migrationName = process.env.MIGRATION_NAME;

try {
  let databaseURL;
  if (environment === 'uat') {
    databaseURL = getUATDatabaseURL();
    console.log('✅ Using UAT database connection');
  } else if (environment === 'staging') {
    databaseURL = getStagingDatabaseURL();
    console.log('✅ Using Staging database connection');
  } else {
    throw new Error(`Invalid environment: ${environment}`);
  }

  process.env.DATABASE_URL = databaseURL;
  process.env.NODE_ENV = environment === 'uat' ? 'development' : 'staging';

  const { execSync } = require('child_process');
  const cmd = migrationName 
    ? `npx sequelize-cli db:migrate --name ${migrationName} --migrations-path migrations`
    : 'npx sequelize-cli db:migrate --migrations-path migrations';
  
  execSync(cmd, { stdio: 'inherit', env: process.env });
} catch (error) {
  console.error('❌ Migration failed:', error.message);
  process.exit(1);
}
EOF

  export MIGRATION_ENV="${ENVIRONMENT}"
  export MIGRATION_NAME="${MIGRATION_NAME}"
  
  node "${temp_script}"
  local exit_code=$?
  
  rm -f "${temp_script}"
  return $exit_code
}

# Main execution
main() {
  echo ""
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo "  🏦 MASTER MIGRATION SCRIPT"
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo ""
  
  log "Environment: ${ENVIRONMENT}"
  if [ -n "${MIGRATION_NAME}" ]; then
    log "Migration: ${MIGRATION_NAME}"
  else
    log "Migration: All pending"
  fi
  echo ""
  
  # Check proxies
  check_proxies
  echo ""
  
  # Run migrations
  if run_migrations; then
    echo ""
    success "Migration completed successfully!"
    echo ""
    exit 0
  else
    echo ""
    error "Migration failed"
    echo ""
    exit 1
  fi
}

main
