#!/bin/bash

# EasyPay API Key Generation Script
# Generates cryptographically secure API keys for EasyPay integration
# 
# Usage:
#   ./scripts/generate-easypay-api-keys.sh [environment]
#   ./scripts/generate-easypay-api-keys.sh qa
#   ./scripts/generate-easypay-api-keys.sh staging
#   ./scripts/generate-easypay-api-keys.sh production
#
# Output: Generates API keys and provides instructions for storing in Secret Manager

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
log() {
    echo -e "${GREEN}[EasyPay API Key Generator]${NC} $1"
}

warn() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

# Check if environment is provided
ENVIRONMENT=${1:-all}

if [ "$ENVIRONMENT" != "qa" ] && [ "$ENVIRONMENT" != "staging" ] && [ "$ENVIRONMENT" != "production" ] && [ "$ENVIRONMENT" != "all" ]; then
    error "Invalid environment: $ENVIRONMENT"
    echo "Usage: $0 [qa|staging|production|all]"
    exit 1
fi

# Function to generate secure API key
generate_api_key() {
    # Generate 64-character cryptographically secure random string
    # Using /dev/urandom for better security than $RANDOM
    openssl rand -hex 32 | tr -d '\n'
}

# Function to create secret in Google Secret Manager
create_secret() {
    local secret_name=$1
    local api_key=$2
    local project_id=${3:-mymoolah-db}
    
    info "Creating secret: $secret_name"
    
    # Check if secret already exists
    if gcloud secrets describe "$secret_name" --project="$project_id" &>/dev/null; then
        warn "Secret $secret_name already exists. Adding new version..."
        echo -n "$api_key" | gcloud secrets versions add "$secret_name" \
            --project="$project_id" \
            --data-file=-
        log "✅ New version added to existing secret: $secret_name"
    else
        echo -n "$api_key" | gcloud secrets create "$secret_name" \
            --project="$project_id" \
            --data-file=-
        log "✅ Secret created: $secret_name"
    fi
}

# Main execution
log "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
log "EasyPay API Key Generator"
log "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Check if openssl is available
if ! command -v openssl &> /dev/null; then
    error "openssl is required but not installed. Please install openssl first."
    exit 1
fi

# Check if gcloud is available
if ! command -v gcloud &> /dev/null; then
    warn "gcloud CLI not found. API keys will be generated but not stored in Secret Manager."
    warn "You will need to manually create secrets in Google Cloud Console."
    STORE_IN_SECRET_MANAGER=false
else
    STORE_IN_SECRET_MANAGER=true
    info "gcloud CLI found. Secrets will be stored in Secret Manager."
fi

echo ""
log "Generating API keys for environment(s): $ENVIRONMENT"
echo ""

# Generate API keys
declare -A API_KEYS
declare -A SECRET_NAMES

if [ "$ENVIRONMENT" == "qa" ] || [ "$ENVIRONMENT" == "all" ]; then
    API_KEY_QA=$(generate_api_key)
    API_KEYS[qa]=$API_KEY_QA
    SECRET_NAMES[qa]="easypay-api-key-qa"
    log "✅ QA/Test API key generated"
fi

if [ "$ENVIRONMENT" == "staging" ] || [ "$ENVIRONMENT" == "all" ]; then
    API_KEY_STAGING=$(generate_api_key)
    API_KEYS[staging]=$API_KEY_STAGING
    SECRET_NAMES[staging]="easypay-api-key-staging"
    log "✅ Staging API key generated"
fi

if [ "$ENVIRONMENT" == "production" ] || [ "$ENVIRONMENT" == "all" ]; then
    API_KEY_PROD=$(generate_api_key)
    API_KEYS[prod]=$API_KEY_PROD
    SECRET_NAMES[prod]="easypay-api-key-production"
    log "✅ Production API key generated"
fi

echo ""
log "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
log "Generated API Keys"
log "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Display generated keys
if [ "$ENVIRONMENT" == "qa" ] || [ "$ENVIRONMENT" == "all" ]; then
    echo "QA/Test Environment:"
    echo "  API Key: ${API_KEYS[qa]}"
    echo "  Secret Name: ${SECRET_NAMES[qa]}"
    echo ""
fi

if [ "$ENVIRONMENT" == "staging" ] || [ "$ENVIRONMENT" == "all" ]; then
    echo "Staging Environment:"
    echo "  API Key: ${API_KEYS[staging]}"
    echo "  Secret Name: ${SECRET_NAMES[staging]}"
    echo ""
fi

if [ "$ENVIRONMENT" == "production" ] || [ "$ENVIRONMENT" == "all" ]; then
    echo "Production Environment:"
    echo "  API Key: ${API_KEYS[prod]}"
    echo "  Secret Name: ${SECRET_NAMES[prod]}"
    echo ""
fi

# Store in Secret Manager if gcloud is available
if [ "$STORE_IN_SECRET_MANAGER" == "true" ]; then
    echo ""
    log "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    log "Storing API Keys in Google Secret Manager"
    log "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo ""
    
    if [ "$ENVIRONMENT" == "qa" ] || [ "$ENVIRONMENT" == "all" ]; then
        create_secret "${SECRET_NAMES[qa]}" "${API_KEYS[qa]}"
    fi
    
    if [ "$ENVIRONMENT" == "staging" ] || [ "$ENVIRONMENT" == "all" ]; then
        create_secret "${SECRET_NAMES[staging]}" "${API_KEYS[staging]}"
    fi
    
    if [ "$ENVIRONMENT" == "production" ] || [ "$ENVIRONMENT" == "all" ]; then
        create_secret "${SECRET_NAMES[prod]}" "${API_KEYS[prod]}"
    fi
    
    echo ""
    log "✅ All API keys stored in Secret Manager"
else
    echo ""
    warn "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    warn "Manual Secret Manager Setup Required"
    warn "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo ""
    info "To store API keys in Google Secret Manager manually:"
    echo ""
    
    if [ "$ENVIRONMENT" == "qa" ] || [ "$ENVIRONMENT" == "all" ]; then
        echo "  QA/Test:"
        echo "    echo -n '${API_KEYS[qa]}' | gcloud secrets create ${SECRET_NAMES[qa]} \\"
        echo "      --project=mymoolah-db --data-file=-"
        echo ""
    fi
    
    if [ "$ENVIRONMENT" == "staging" ] || [ "$ENVIRONMENT" == "all" ]; then
        echo "  Staging:"
        echo "    echo -n '${API_KEYS[staging]}' | gcloud secrets create ${SECRET_NAMES[staging]} \\"
        echo "      --project=mymoolah-db --data-file=-"
        echo ""
    fi
    
    if [ "$ENVIRONMENT" == "production" ] || [ "$ENVIRONMENT" == "all" ]; then
        echo "  Production:"
        echo "    echo -n '${API_KEYS[prod]}' | gcloud secrets create ${SECRET_NAMES[prod]} \\"
        echo "      --project=mymoolah-db --data-file=-"
        echo ""
    fi
fi

echo ""
log "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
log "Next Steps"
log "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
info "1. Send API keys to EasyPay via secure channel (separate from documentation)"
if [ "$ENVIRONMENT" == "qa" ] || [ "$ENVIRONMENT" == "all" ]; then
    echo ""
    info "   QA/Test Environment:"
    info "   - Add to local .env file: EASYPAY_API_KEY=${API_KEYS[qa]}"
    info "   - QA/Test uses .env file (NOT Secret Manager)"
    info "   - Used for local development and Codespaces testing"
fi
if [ "$ENVIRONMENT" == "staging" ] || [ "$ENVIRONMENT" == "all" ]; then
    echo ""
    info "   Staging Environment:"
    info "   - Already stored in Secret Manager: ${SECRET_NAMES[staging]}"
    info "   - Automatically loaded by Cloud Run deployment"
fi
if [ "$ENVIRONMENT" == "production" ] || [ "$ENVIRONMENT" == "all" ]; then
    echo ""
    info "   Production Environment:"
    info "   - Already stored in Secret Manager: ${SECRET_NAMES[prod]}"
    info "   - Automatically loaded by Cloud Run deployment (when production is deployed)"
fi
echo ""
info "2. Configure IP whitelisting for EasyPay IP: 20.164.206.68"
info "3. Test API key authentication in each environment"
echo ""
warn "⚠️  IMPORTANT: Store these API keys securely. They will not be displayed again."
warn "⚠️  Send API keys to EasyPay via encrypted email or secure messaging."
if [ "$ENVIRONMENT" == "qa" ] || [ "$ENVIRONMENT" == "all" ]; then
    echo ""
    warn "⚠️  QA/Test: Remember to add the API key to your .env file for local testing."
fi
echo ""
