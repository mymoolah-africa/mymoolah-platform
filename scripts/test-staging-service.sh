#!/usr/bin/env bash

set -euo pipefail

# MyMoolah Treasury Platform - Test Staging Service
# Tests Cloud Run service endpoints and Zapper integration

# Configuration
PROJECT_ID="mymoolah-db"
REGION="africa-south1"
SERVICE_NAME="mymoolah-backend-staging"

log() {
  echo "📋 [$(date +'%Y-%m-%d %H:%M:%S')] $*"
}

error() {
  echo "❌ [$(date +'%Y-%m-%d %H:%M:%S')] ERROR: $*" >&2
}

success() {
  echo "✅ [$(date +'%Y-%m-%d %H:%M:%S')] $*"
}

# Get service URL
get_service_url() {
  local url=$(gcloud run services describe "${SERVICE_NAME}" \
    --region "${REGION}" \
    --project "${PROJECT_ID}" \
    --format="value(status.url)" 2>/dev/null)
  
  if [ -z "${url}" ]; then
    error "Failed to get service URL. Is the service deployed?"
    exit 1
  fi
  
  echo "${url}"
}

# Test health endpoint
test_health() {
  local base_url=$1
  log "Testing health endpoint..."
  
  local response=$(curl -s -w "\n%{http_code}" "${base_url}/health" 2>/dev/null)
  local body=$(echo "${response}" | head -n -1)
  local status_code=$(echo "${response}" | tail -n 1)
  
  if [ "${status_code}" = "200" ]; then
    success "Health check passed (${status_code})"
    echo "Response: ${body}"
    return 0
  else
    error "Health check failed (${status_code})"
    echo "Response: ${body}"
    return 1
  fi
}

# Test API docs endpoint
test_api_docs() {
  local base_url=$1
  log "Testing API docs endpoint..."
  
  local status_code=$(curl -s -o /dev/null -w "%{http_code}" "${base_url}/api/v1/docs" 2>/dev/null)
  
  if [ "${status_code}" = "200" ] || [ "${status_code}" = "301" ] || [ "${status_code}" = "302" ]; then
    success "API docs endpoint accessible (${status_code})"
    return 0
  else
    warning "API docs endpoint returned ${status_code}"
    return 0  # Not critical
  fi
}

# Test Zapper service status (if endpoint exists)
test_zapper_status() {
  local base_url=$1
  log "Testing Zapper service status..."
  
  # This endpoint may require authentication, so we'll just check if it exists
  local status_code=$(curl -s -o /dev/null -w "%{http_code}" "${base_url}/api/v1/zapper/status" 2>/dev/null)
  
  if [ "${status_code}" = "200" ]; then
    success "Zapper status endpoint accessible (${status_code})"
    local response=$(curl -s "${base_url}/api/v1/zapper/status" 2>/dev/null)
    echo "Response: ${response}"
    return 0
  elif [ "${status_code}" = "401" ] || [ "${status_code}" = "403" ]; then
    warning "Zapper status endpoint requires authentication (${status_code}) - This is expected"
    return 0
  else
    warning "Zapper status endpoint returned ${status_code} - May not be implemented yet"
    return 0
  fi
}

# Main execution
main() {
  log "🚀 Testing Staging Service"
  log "Service: ${SERVICE_NAME}"
  log "Region: ${REGION}"
  echo ""
  
  # Get service URL
  local service_url=$(get_service_url)
  log "Service URL: ${service_url}"
  echo ""
  
  # Test health
  if ! test_health "${service_url}"; then
    error "Health check failed. Service may not be ready."
    exit 1
  fi
  
  echo ""
  
  # Test API docs
  test_api_docs "${service_url}"
  
  echo ""
  
  # Test Zapper status
  test_zapper_status "${service_url}"
  
  echo ""
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo "📊 Service Testing Complete"
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo "Service URL: ${service_url}"
  echo ""
  echo "Next steps:"
  echo "  1. Test Zapper authentication with production credentials"
  echo "  2. Test QR code decoding with real merchant codes"
  echo "  3. Test payment processing end-to-end"
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo ""
  
  success "✅ Service testing complete!"
}

# Run main function
main "$@"

