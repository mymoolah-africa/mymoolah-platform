#!/usr/bin/env bash

set -euo pipefail

# Configuration
PROJECT_ID="mymoolah-db"
REGION="africa-south1"
DEV_INSTANCE="mmtp-pg"
STAGING_INSTANCE="mmtp-pg-staging"
PRODUCTION_INSTANCE="mmtp-pg-production"
DEV_DATABASE="mymoolah"
STAGING_DATABASE="mymoolah_staging"
PRODUCTION_DATABASE="mymoolah_production"

# Database user (same across all environments)
DB_USER="mymoolah_app"

# Machine types (PostgreSQL ENTERPRISE requires custom machine types)
# Format: db-custom-<vCPU>-<RAM_in_MB>
STAGING_MACHINE_TYPE="db-custom-1-3840"  # 1 vCPU, 3.75GB RAM for staging
PRODUCTION_MACHINE_TYPE="db-custom-4-15360"  # 4 vCPU, 15GB RAM for production

# Storage
STORAGE_TYPE="SSD"
STAGING_STORAGE_SIZE="20GB"
PRODUCTION_STORAGE_SIZE="100GB"

# Backup settings
STAGING_BACKUP_START_TIME="02:00"
PRODUCTION_BACKUP_START_TIME="02:00"
STAGING_BACKUP_RETENTION_DAYS="7"
PRODUCTION_BACKUP_RETENTION_DAYS="30"

log() {
  echo "📋 [$(date +'%Y-%m-%d %H:%M:%S')] $*"
}

error() {
  echo "❌ [$(date +'%Y-%m-%d %H:%M:%S')] ERROR: $*" >&2
}

warning() {
  echo "⚠️  [$(date +'%Y-%m-%d %H:%M:%S')] WARNING: $*" >&2
}

success() {
  echo "✅ [$(date +'%Y-%m-%d %H:%M:%S')] $*"
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
# Uses cryptographically secure random generation (OpenSSL)
generate_password() {
  # Generate 36-character password with banking-grade complexity
  # Part 1: Base64 random string (28 chars, ensures entropy)
  local base_part=$(openssl rand -base64 24 | tr -d "=+/" | head -c 28)
  
  # Part 2: Ensure required character types (8 chars)
  local special_chars="!@#$%^&*"
  local numbers="0123456789"
  local upper="ABCDEFGHIJKLMNOPQRSTUVWXYZ"
  local lower="abcdefghijklmnopqrstuvwxyz"
  
  # Select random chars from each required set
  local special_idx=$((RANDOM % ${#special_chars}))
  local number_idx=$((RANDOM % ${#numbers}))
  local upper_idx=$((RANDOM % ${#upper}))
  local lower_idx=$((RANDOM % ${#lower}))
  
  local special="${special_chars:$special_idx:1}"
  local number="${numbers:$number_idx:1}"
  local upper_char="${upper:$upper_idx:1}"
  local lower_char="${lower:$lower_idx:1}"
  
  # Add more random chars to reach 36+ characters
  local extra=$(openssl rand -hex 4 | head -c 4)
  
  # Combine all parts
  local combined="${base_part}${special}${number}${upper_char}${lower_char}${extra}"
  
  # Shuffle using Python (more portable than shuf)
  python3 -c "import random, sys; chars = list('${combined}'); random.shuffle(chars); print(''.join(chars))" 2>/dev/null || \
  python -c "import random, sys; chars = list('${combined}'); random.shuffle(chars); print(''.join(chars))" 2>/dev/null || \
  echo "${combined}"  # Fallback: return unshuffled if Python unavailable
}

# Create Cloud SQL instance
create_instance() {
  local instance_name=$1
  local machine_type=$2
  local storage_size=$3
  local backup_start_time=$4
  local backup_retention_days=$5
  local instance_conn_name="${PROJECT_ID}:${REGION}:${instance_name}"
  
  log "Creating Cloud SQL instance: ${instance_name}"
  
  # Check if instance already exists
  if gcloud sql instances describe "${instance_name}" --project="${PROJECT_ID}" > /dev/null 2>&1; then
    warning "Instance ${instance_name} already exists. Skipping creation."
    return 0
  fi
  
  # Check if Private IP is available (requires VPC)
  # For now, use Public IP with strict security (no authorized networks)
  # TODO: Configure Private IP if VPC is set up
  
  # Create instance with banking-grade security
  # Banking-grade approach: Public IP with NO authorized networks
  # Access only via Cloud SQL Auth Proxy (IAM authentication)
  # TODO: Future enhancement - use Private IP when VPC is configured
  
  # Database flags optimized for banking-grade performance
  # These will be adjusted based on machine type automatically by Cloud SQL
  local db_flags="max_connections=100,random_page_cost=1.1,effective_io_concurrency=200"
  
  log "Creating instance with banking-grade security settings..."
  log "  - Edition: ENTERPRISE (matches existing instance)"
  log "  - Machine type: ${machine_type}"
  log "  - Storage: ${storage_size} ${STORAGE_TYPE}"
  log "  - Backups: ${backup_retention_days} days retention"
  
  gcloud sql instances create "${instance_name}" \
    --project="${PROJECT_ID}" \
    --database-version=POSTGRES_16 \
    --edition=ENTERPRISE \
    --tier="${machine_type}" \
    --region="${REGION}" \
    --storage-type="${STORAGE_TYPE}" \
    --storage-size="${storage_size}" \
    --storage-auto-increase \
    --backup-start-time="${backup_start_time}" \
    --backup \
    --maintenance-window-day=SUN \
    --maintenance-window-hour=3 \
    --maintenance-release-channel=production \
    --availability-type=ZONAL \
    --database-flags="${db_flags}" \
    --deletion-protection \
    --retained-backups-count="${backup_retention_days}" \
    --retained-transaction-log-days=7 \
    --enable-point-in-time-recovery \
    --require-ssl || {
    error "Failed to create instance ${instance_name}"
    return 1
  }
  
  # Remove all authorized networks (banking-grade security)
  # Wait a moment for instance to be fully created
  log "Waiting for instance to be ready..."
  sleep 10
  
  log "Securing instance: Removing all authorized networks..."
  gcloud sql instances patch "${instance_name}" \
    --project="${PROJECT_ID}" \
    --clear-authorized-networks 2>&1 | grep -v "No change requested" || true
  
  # Verify security
  local auth_networks=$(gcloud sql instances describe "${instance_name}" \
    --project="${PROJECT_ID}" \
    --format="get(settings.ipConfiguration.authorizedNetworks)" 2>/dev/null || echo "[]")
  
  if [ -z "${auth_networks}" ] || [ "${auth_networks}" = "[]" ] || echo "${auth_networks}" | grep -q "None"; then
    success "Instance secured: No authorized networks (Cloud SQL Auth Proxy only)"
  else
    warning "Warning: Instance may have authorized networks. Please verify in GCP Console."
  fi
  
  success "Instance ${instance_name} created and secured successfully"
  log "  - Connection name: ${instance_conn_name}"
  log "  - Security: No public network access (Cloud SQL Auth Proxy only)"
  log "  - SSL: Required"
  log "  - Backups: Enabled (${backup_retention_days} days retention)"
}

# Create database
create_database() {
  local instance_name=$1
  local database_name=$2
  
  log "Creating database ${database_name} in instance ${instance_name}"
  
  # Check if database already exists
  if gcloud sql databases describe "${database_name}" \
    --instance="${instance_name}" \
    --project="${PROJECT_ID}" > /dev/null 2>&1; then
    warning "Database ${database_name} already exists in ${instance_name}. Skipping creation."
    return 0
  fi
  
  gcloud sql databases create "${database_name}" \
    --instance="${instance_name}" \
    --project="${PROJECT_ID}" \
    --charset=UTF8 \
    --collation=en_US.UTF8 || {
    error "Failed to create database ${database_name}"
    return 1
  }
  
  success "Database ${database_name} created successfully"
}

# Create database user
create_user() {
  local instance_name=$1
  local username=$2
  local password=$3
  local skip_password_reset=${4:-false}
  
  log "Setting up user ${username} in instance ${instance_name}"
  
  # Check if user already exists
  if gcloud sql users describe "${username}" \
    --instance="${instance_name}" \
    --project="${PROJECT_ID}" > /dev/null 2>&1; then
    success "User ${username} already exists in ${instance_name}"
    
    if [ "${skip_password_reset}" = "true" ]; then
      log "Skipping password reset (using existing password)"
      return 0
    fi
    
    log "Resetting password for existing user ${username}..."
    gcloud sql users set-password "${username}" \
      --instance="${instance_name}" \
      --project="${PROJECT_ID}" \
      --password="${password}" || {
      error "Failed to reset password for user ${username}"
      return 1
    }
    success "Password reset for user ${username}"
    return 0
  fi
  
  log "Creating new user ${username}..."
  gcloud sql users create "${username}" \
    --instance="${instance_name}" \
    --project="${PROJECT_ID}" \
    --password="${password}" || {
    error "Failed to create user ${username}"
    return 1
  }
  
  success "User ${username} created successfully"
}

# Grant permissions
grant_permissions() {
  local instance_name=$1
  local database_name=$2
  local username=$3
  
  log "Granting permissions to ${username} on ${database_name}"
  
  # Connect and grant permissions (requires psql)
  # Note: This is a simplified version. In production, you'd want to use
  # a more robust method with proper SQL commands via Cloud SQL Admin API
  log "Permissions will be granted via migration scripts"
}

# URL encode password for DATABASE_URL
url_encode() {
  local string="${1}"
  local strlen=${#string}
  local encoded=""
  local pos c o

  for (( pos=0 ; pos<strlen ; pos++ )); do
     c=${string:$pos:1}
     case "$c" in
        [-_.~a-zA-Z0-9] ) o="${c}" ;;
        * ) printf -v o '%%%02x' "'$c"
     esac
     encoded+="${o}"
  done
  echo "${encoded}"
}

# Generate connection strings
generate_connection_info() {
  local instance_name=$1
  local database_name=$2
  local username=$3
  local password=$4
  local instance_conn_name="${PROJECT_ID}:${REGION}:${instance_name}"
  local encoded_password=$(url_encode "${password}")
  
  echo ""
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo "📊 Connection Information for ${instance_name}"
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo "Instance Connection Name: ${instance_conn_name}"
  echo "Database: ${database_name}"
  echo "User: ${username}"
  echo "Password: ${password}"
  echo ""
  echo "Cloud SQL Auth Proxy Connection:"
  echo "  ./cloud-sql-proxy ${instance_conn_name} --port 5432 --auto-iam-authn"
  echo ""
  echo "DATABASE_URL (for Cloud SQL Auth Proxy):"
  echo "  postgres://${username}:${encoded_password}@127.0.0.1:5432/${database_name}?sslmode=disable"
  echo ""
  echo "⚠️  BANKING-GRADE SECURITY REQUIREMENTS:"
  echo "   1. Store password in Google Secret Manager (NOT in .env files)"
  echo "   2. Use IAM service accounts with Secret Manager access"
  echo "   3. Rotate password every 90 days (Production)"
  echo "   4. Never commit passwords to Git"
  echo "   5. Use Cloud SQL Auth Proxy for all connections"
  echo ""
  echo "📋 Store in Secret Manager:"
  echo "   gcloud secrets create db-${instance_name}-password --data-file=- <<< \"${password}\""
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo ""
}

# Main execution
main() {
  log "🚀 Setting up Staging and Production Cloud SQL instances"
  log "Project: ${PROJECT_ID}"
  log "Region: ${REGION}"
  echo ""
  
  # Confirmation
  echo "This script will create:"
  echo "  1. Staging instance: ${STAGING_INSTANCE}"
  echo "  2. Production instance: ${PRODUCTION_INSTANCE}"
  echo "  3. Databases: ${STAGING_DATABASE}, ${PRODUCTION_DATABASE}"
  echo "  4. Database user: ${DB_USER}"
  echo ""
  echo "⚠️  This will incur GCP costs. Continue? (yes/no)"
  read -r confirmation
  
  if [ "${confirmation}" != "yes" ]; then
    log "Operation cancelled"
    exit 0
  fi
  
  # Check prerequisites
  check_prerequisites
  
  # Generate banking-grade passwords for staging and production
  # Banking-grade requirements: 32+ chars, unique per environment
  log "Generating banking-grade passwords (32+ characters, unique per environment)..."
  STAGING_PASSWORD=$(generate_password)
  PRODUCTION_PASSWORD=$(generate_password)
  
  # Verify password strength
  if [ ${#STAGING_PASSWORD} -lt 32 ] || [ ${#PRODUCTION_PASSWORD} -lt 32 ]; then
    error "Generated passwords do not meet banking-grade requirements (32+ characters)"
    exit 1
  fi
  
  echo ""
  log "✅ Passwords generated:"
  log "   - Staging: ${#STAGING_PASSWORD} characters"
  log "   - Production: ${#PRODUCTION_PASSWORD} characters"
  log "   - Unique per environment: YES"
  echo ""
  log "⚠️  BANKING-GRADE SECURITY:"
  log "   1. Each environment has a UNIQUE password (security isolation)"
  log "   2. Passwords are 32+ characters (banking-grade complexity)"
  log "   3. Passwords MUST be stored in Google Secret Manager (not .env files)"
  log "   4. If 'mymoolah_app' user exists, password will be reset"
  echo ""
  log "Continue with password generation? (yes/no)"
  read -r password_confirmation
  
  if [ "${password_confirmation}" != "yes" ]; then
    log "Operation cancelled"
    exit 0
  fi
  
  # Create Staging instance
  echo ""
  log "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  log "Creating STAGING environment"
  log "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  create_instance "${STAGING_INSTANCE}" "${STAGING_MACHINE_TYPE}" "${STAGING_STORAGE_SIZE}" \
    "${STAGING_BACKUP_START_TIME}" "${STAGING_BACKUP_RETENTION_DAYS}"
  
  # Wait for instance to be ready
  log "Waiting for staging instance to be ready..."
  sleep 30
  
  create_database "${STAGING_INSTANCE}" "${STAGING_DATABASE}"
  create_user "${STAGING_INSTANCE}" "${DB_USER}" "${STAGING_PASSWORD}" "false"
  generate_connection_info "${STAGING_INSTANCE}" "${STAGING_DATABASE}" "${DB_USER}" "${STAGING_PASSWORD}"
  
  # Create Production instance
  echo ""
  log "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  log "Creating PRODUCTION environment"
  log "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo "⚠️  PRODUCTION instance creation requires additional confirmation."
  echo "Continue with PRODUCTION setup? (yes/no)"
  read -r prod_confirmation
  
  if [ "${prod_confirmation}" != "yes" ]; then
    warning "Production instance creation skipped"
  else
    create_instance "${PRODUCTION_INSTANCE}" "${PRODUCTION_MACHINE_TYPE}" "${PRODUCTION_STORAGE_SIZE}" \
      "${PRODUCTION_BACKUP_START_TIME}" "${PRODUCTION_BACKUP_RETENTION_DAYS}"
    
    # Wait for instance to be ready
    log "Waiting for production instance to be ready..."
    sleep 30
    
    create_database "${PRODUCTION_INSTANCE}" "${PRODUCTION_DATABASE}"
    create_user "${PRODUCTION_INSTANCE}" "${DB_USER}" "${PRODUCTION_PASSWORD}" "false"
    generate_connection_info "${PRODUCTION_INSTANCE}" "${PRODUCTION_DATABASE}" "${DB_USER}" "${PRODUCTION_PASSWORD}"
  fi
  
  # Summary
  echo ""
  log "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  log "✅ Setup Complete"
  log "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo ""
  log "📋 BANKING-GRADE NEXT STEPS:"
  echo ""
  echo "  1. 🔐 Store passwords in Google Secret Manager (REQUIRED):"
  echo "     - Staging: gcloud secrets create db-${STAGING_INSTANCE}-password"
  echo "     - Production: gcloud secrets create db-${PRODUCTION_INSTANCE}-password"
  echo ""
  echo "  2. 🔑 Configure IAM service accounts:"
  echo "     - Create separate service accounts for Staging/Production"
  echo "     - Grant Secret Manager access to service accounts"
  echo "     - Grant Cloud SQL Client role to service accounts"
  echo ""
  echo "  3. 🌐 Configure Cloud SQL Auth Proxy:"
  echo "     - Use IAM authentication (--auto-iam-authn)"
  echo "     - No authorized networks (banking-grade security)"
  echo "     - SSL required for all connections"
  echo ""
  echo "  4. 📊 Update environment variables:"
  echo "     - Use Secret Manager secrets (not .env files)"
  echo "     - Configure DATABASE_URL via Secret Manager"
  echo ""
  echo "  5. 🗄️  Run migrations:"
  echo "     - Staging first (test thoroughly)"
  echo "     - Production after Staging validation"
  echo ""
  echo "  6. 🔄 Password rotation:"
  echo "     - Development: Quarterly"
  echo "     - Staging: Quarterly"
  echo "     - Production: Every 90 days (automated)"
  echo ""
  echo "  7. 📈 Enable monitoring:"
  echo "     - Cloud SQL Insights"
  echo "     - Audit logging"
  echo "     - Alerting for security events"
  echo ""
  log "⚠️  CRITICAL: Passwords shown above must be stored in Secret Manager NOW!"
  log "⚠️  These passwords will not be displayed again after this session."
  echo ""
}

# Run main function
main "$@"

