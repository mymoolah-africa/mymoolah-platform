#!/usr/bin/env bash

set -euo pipefail

# ============================================================================
# MASTER MIGRATION SCRIPT - UAT, STAGING & PRODUCTION
# ============================================================================
# 
# This is the ONLY script you need for running migrations
# Handles all connection, password, and proxy management automatically
#
# Run from: CODESPACES (Cloud SQL Auth Proxy must be running)
#
# Usage:
#   ./scripts/run-migrations-master.sh [uat|staging|production] [migration-name]
#
# Examples:
#   ./scripts/run-migrations-master.sh uat              # Run all UAT migrations
#   ./scripts/run-migrations-master.sh staging          # Run all Staging migrations
#   ./scripts/run-migrations-master.sh production      # Run all Production migrations
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
  echo "Usage: $0 [uat|staging|production] [migration-name]"
  echo ""
  echo "Examples:"
  echo "  $0 uat                    # Run all pending UAT migrations"
  echo "  $0 staging                # Run all pending Staging migrations"
  echo "  $0 production             # Run all pending Production migrations"
  echo "  $0 uat 20251203_01        # Run specific UAT migration"
  echo "  $0 staging 20251203_01    # Run specific Staging migration"
  echo ""
}

# Validate environment
if [ -z "${ENVIRONMENT}" ] || [[ ! "${ENVIRONMENT}" =~ ^(uat|staging|production)$ ]]; then
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

# Ensure the required proxy is running (only starts the one we need)
check_proxies() {
  log "Checking Cloud SQL Auth Proxy for ${ENVIRONMENT}..."

  local port
  case "${ENVIRONMENT}" in
    uat)        port=6543 ;;
    staging)    port=6544 ;;
    production) port=6545 ;;
  esac

  if lsof -ti:${port} >/dev/null 2>&1; then
    success "Required proxy is running on port ${port}"
    return 0
  fi

  warning "${ENVIRONMENT} proxy not running on port ${port}"
  log "Starting ${ENVIRONMENT} proxy..."
  local script_dir
  script_dir="$(cd "$(dirname "$0")" && pwd)"
  "${script_dir}/ensure-proxies-running.sh" "${ENVIRONMENT}" || {
    error "Failed to start proxy. Run manually: ./scripts/ensure-proxies-running.sh ${ENVIRONMENT}"
    exit 1
  }

  success "Required proxy is running on port ${port}"
}

# Run migrations using Node.js helper
run_migrations() {
  log "Running migrations for ${ENVIRONMENT}..."
  
  # Create temp script that uses our connection helper
  local temp_script=$(mktemp)
  local root_dir
  root_dir="$(cd "$(dirname "$0")/.." && pwd)"
  cat > "${temp_script}" << 'EOF'
const path = require('path');

const rootDir = process.env.MIGRATION_ROOT;
if (!rootDir) {
  console.error('❌ Missing MIGRATION_ROOT env var');
  process.exit(1);
}

require('dotenv').config({ path: path.join(rootDir, '.env') });

const helper = require(path.join(rootDir, 'scripts', 'db-connection-helper'));

const environment = process.env.MIGRATION_ENV;
const migrationName = process.env.MIGRATION_NAME;

(async () => {
  try {
    let databaseURL;
    let getAdminClient;
    if (environment === 'uat') {
      databaseURL = helper.getUATAdminDatabaseURL();
      getAdminClient = helper.getUATAdminClient;
      console.log('✅ Using UAT admin database connection (postgres user)');
    } else if (environment === 'staging') {
      databaseURL = helper.getStagingAdminDatabaseURL();
      getAdminClient = helper.getStagingAdminClient;
      console.log('✅ Using Staging admin database connection (postgres user)');
    } else if (environment === 'production') {
      databaseURL = helper.getProductionAdminDatabaseURL();
      getAdminClient = helper.getProductionAdminClient;
      console.log('✅ Using Production admin database connection (postgres user)');
    } else {
      throw new Error(`Invalid environment: ${environment}`);
    }

    process.env.DATABASE_URL = databaseURL;
    process.env.NODE_ENV = environment === 'uat' ? 'development' : (environment === 'staging' ? 'staging' : 'production-proxy');

    // Fix SequelizeMeta permissions before running migrations.
    // In Cloud SQL, postgres (cloudsqlsuperuser) cannot access tables created
    // by mymoolah_app. We connect as mymoolah_app (table owner) to grant
    // access, then connect as postgres (admin) to transfer ownership.
    let appClient;
    try {
      const getAppClient = environment === 'uat' ? helper.getUATClient
        : environment === 'staging' ? helper.getStagingClient
        : helper.getProductionClient;
      appClient = await getAppClient();
      await appClient.query(`
        DO $$
        BEGIN
          IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'SequelizeMeta') THEN
            EXECUTE 'GRANT ALL ON TABLE "SequelizeMeta" TO postgres';
            RAISE NOTICE 'SequelizeMeta: granted ALL to postgres';
          END IF;
        END $$;
      `);
      console.log('✅ SequelizeMeta permissions granted to postgres (via app user)');
    } catch (permErr) {
      console.warn('⚠️  Could not fix SequelizeMeta permissions (non-fatal):', permErr.message);
    } finally {
      if (appClient) appClient.release();
    }

    // Now as admin, take ownership so future sequelize-cli runs work
    let adminClient;
    try {
      adminClient = await getAdminClient();
      await adminClient.query(`
        DO $$
        BEGIN
          IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'SequelizeMeta') THEN
            EXECUTE 'ALTER TABLE "SequelizeMeta" OWNER TO postgres';
            RAISE NOTICE 'SequelizeMeta: ownership transferred to postgres';
          END IF;
        END $$;
      `);
      console.log('✅ SequelizeMeta ownership transferred to postgres');
    } catch (ownerErr) {
      console.warn('⚠️  Could not transfer SequelizeMeta ownership (non-fatal):', ownerErr.message);
    } finally {
      if (adminClient) adminClient.release();
    }

    const { execSync } = require('child_process');
    const cmd = migrationName
      ? `npx sequelize-cli db:migrate --name ${migrationName} --migrations-path migrations`
      : 'npx sequelize-cli db:migrate --migrations-path migrations';

    execSync(cmd, { stdio: 'inherit', env: process.env });
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    process.exit(1);
  }
})();
EOF

  export MIGRATION_ENV="${ENVIRONMENT}"
  export MIGRATION_NAME="${MIGRATION_NAME}"
  export MIGRATION_ROOT="${root_dir}"
  
  NODE_PATH="${root_dir}/node_modules" node "${temp_script}"
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
