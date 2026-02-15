#!/usr/bin/env bash

set -euo pipefail

# MyMoolah Treasury Platform - Production Load Balancer Setup
# Creates global HTTPS load balancer for api.mymoolah.africa and wallet.mymoolah.africa
# Mirrors staging setup (docs/GCP_STAGING_DEPLOYMENT.md Step 8)
# Cloud Run in africa-south1 does not support direct domain mapping; use global LB for TLS + routing

PROJECT_ID="mymoolah-db"
REGION="africa-south1"

# Production resources
STATIC_IP_NAME="mymoolah-production-ip"
BACKEND_NEG="moolah-backend-production-neg"
WALLET_NEG="neg-production-wallet"
BACKEND_SERVICE="be-production-backend"
WALLET_SERVICE="be-production-wallet"
CERT_NAME="cert-production"
URL_MAP="urlmap-production"
HTTPS_PROXY="https-proxy-production"
FORWARDING_RULE="fr-production"

# Domains
API_DOMAIN="api.mymoolah.africa"
WALLET_DOMAIN="wallet.mymoolah.africa"

log() { echo "📋 [$(date +'%Y-%m-%d %H:%M:%S')] $*"; }
err() { echo "❌ $*" >&2; exit 1; }
success() { echo "✅ [$(date +'%Y-%m-%d %H:%M:%S')] $*"; }

gcloud config set project "${PROJECT_ID}" >/dev/null

log "Production Load Balancer Setup"
log "Project: ${PROJECT_ID}"
log "Domains: ${API_DOMAIN}, ${WALLET_DOMAIN}"
echo ""

# 1. Reserve global static IP
log "1. Reserving global static IP: ${STATIC_IP_NAME}"
if gcloud compute addresses describe "${STATIC_IP_NAME}" --global >/dev/null 2>&1; then
  success "Static IP already exists"
else
  gcloud compute addresses create "${STATIC_IP_NAME}" --global || err "Failed to create static IP"
  success "Static IP created"
fi
PROD_IP=$(gcloud compute addresses describe "${STATIC_IP_NAME}" --global --format='value(address)')
log "   IP: ${PROD_IP}"
echo ""

# 2. Create serverless NEGs for Cloud Run services
log "2. Creating serverless NEGs..."
if gcloud compute network-endpoint-groups describe "${BACKEND_NEG}" --region="${REGION}" >/dev/null 2>&1; then
  success "Backend NEG already exists"
else
  gcloud compute network-endpoint-groups create "${BACKEND_NEG}" \
    --region="${REGION}" \
    --network-endpoint-type=serverless \
    --cloud-run-service=mymoolah-backend-production || err "Failed to create backend NEG"
  success "Backend NEG created"
fi

if gcloud compute network-endpoint-groups describe "${WALLET_NEG}" --region="${REGION}" >/dev/null 2>&1; then
  success "Wallet NEG already exists"
else
  gcloud compute network-endpoint-groups create "${WALLET_NEG}" \
    --region="${REGION}" \
    --network-endpoint-type=serverless \
    --cloud-run-service=mymoolah-wallet-production || err "Failed to create wallet NEG"
  success "Wallet NEG created"
fi
echo ""

# 3. Create backend services and attach NEGs
log "3. Creating backend services..."
if gcloud compute backend-services describe "${BACKEND_SERVICE}" --global >/dev/null 2>&1; then
  success "Backend service already exists"
else
  gcloud compute backend-services create "${BACKEND_SERVICE}" \
    --global --load-balancing-scheme=EXTERNAL_MANAGED --protocol=HTTP --timeout=30s || err "Failed to create backend service"
  success "Backend service created"
fi

BACKENDS=$(gcloud compute backend-services describe "${BACKEND_SERVICE}" --global --format='value(backends[].group)' 2>/dev/null || true)
if [[ "${BACKENDS}" != *"${BACKEND_NEG}"* ]]; then
  gcloud compute backend-services add-backend "${BACKEND_SERVICE}" \
    --global \
    --network-endpoint-group="${BACKEND_NEG}" \
    --network-endpoint-group-region="${REGION}" || err "Failed to add backend to backend service"
  success "Backend NEG attached"
else
  success "Backend NEG already attached"
fi

if gcloud compute backend-services describe "${WALLET_SERVICE}" --global >/dev/null 2>&1; then
  success "Wallet service already exists"
else
  gcloud compute backend-services create "${WALLET_SERVICE}" \
    --global --load-balancing-scheme=EXTERNAL_MANAGED --protocol=HTTP --timeout=30s || err "Failed to create wallet service"
  success "Wallet service created"
fi

WALLET_BACKENDS=$(gcloud compute backend-services describe "${WALLET_SERVICE}" --global --format='value(backends[].group)' 2>/dev/null || true)
if [[ "${WALLET_BACKENDS}" != *"${WALLET_NEG}"* ]]; then
  gcloud compute backend-services add-backend "${WALLET_SERVICE}" \
    --global \
    --network-endpoint-group="${WALLET_NEG}" \
    --network-endpoint-group-region="${REGION}" || err "Failed to add wallet NEG"
  success "Wallet NEG attached"
else
  success "Wallet NEG already attached"
fi
echo ""

# 4. Provision managed TLS certificate
log "4. Provisioning managed TLS certificate: ${CERT_NAME}"
if gcloud compute ssl-certificates describe "${CERT_NAME}" >/dev/null 2>&1; then
  success "Certificate already exists"
else
  gcloud compute ssl-certificates create "${CERT_NAME}" \
    --domains="${API_DOMAIN},${WALLET_DOMAIN}" || err "Failed to create SSL certificate"
  success "Certificate created (may take 15-60 min to reach ACTIVE)"
fi
echo ""

# 5. Create URL map and HTTPS proxy
log "5. Creating URL map and HTTPS proxy..."
if gcloud compute url-maps describe "${URL_MAP}" >/dev/null 2>&1; then
  success "URL map already exists"
else
  gcloud compute url-maps create "${URL_MAP}" \
    --default-service="${BACKEND_SERVICE}" || err "Failed to create URL map"
  success "URL map created (default: ${API_DOMAIN} -> backend)"
fi

# Add wallet host routing (idempotent - add-path-matcher may fail if already exists)
if ! gcloud compute url-maps describe "${URL_MAP}" --format='yaml(hostRules)' 2>/dev/null | grep -q "${WALLET_DOMAIN}"; then
  gcloud compute url-maps add-path-matcher "${URL_MAP}" \
    --path-matcher-name=wallet-matcher \
    --default-service="${WALLET_SERVICE}" \
    --new-hosts="${WALLET_DOMAIN}" 2>/dev/null || log "   Wallet matcher may already exist"
fi

if gcloud compute target-https-proxies describe "${HTTPS_PROXY}" >/dev/null 2>&1; then
  success "HTTPS proxy already exists"
else
  gcloud compute target-https-proxies create "${HTTPS_PROXY}" \
    --url-map="${URL_MAP}" \
    --ssl-certificates="${CERT_NAME}" || err "Failed to create HTTPS proxy"
  success "HTTPS proxy created"
fi
echo ""

# 6. Create forwarding rule
log "6. Creating forwarding rule..."
if gcloud compute forwarding-rules describe "${FORWARDING_RULE}" --global >/dev/null 2>&1; then
  success "Forwarding rule already exists"
else
  gcloud compute forwarding-rules create "${FORWARDING_RULE}" \
    --global \
    --load-balancing-scheme=EXTERNAL_MANAGED \
    --address="${STATIC_IP_NAME}" \
    --target-https-proxy="${HTTPS_PROXY}" \
    --ports=443 || err "Failed to create forwarding rule"
  success "Forwarding rule created"
fi
echo ""

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📊 Production Load Balancer Setup Complete"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "Static IP: ${PROD_IP}"
echo ""
echo "7. Configure DNS (Afrihost or your DNS provider):"
echo "   ${API_DOMAIN}    A    ${PROD_IP}"
echo "   ${WALLET_DOMAIN} A    ${PROD_IP}"
echo ""
echo "8. Verify certificate status (wait for ACTIVE, may take 15-60 min):"
echo "   gcloud compute ssl-certificates describe ${CERT_NAME} --format='value(managed.status)'"
echo ""
echo "9. Test after DNS propagates:"
echo "   curl -I https://${API_DOMAIN}/health"
echo "   curl -I https://${WALLET_DOMAIN}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

success "Load balancer ready. Configure DNS and wait for certificate ACTIVE."
