#!/usr/bin/env bash

set -euo pipefail

# MyMoolah Treasury Platform - Cloud Run Production Service Account Setup
# Creates mymoolah-production-sa with IAM permissions for production deployment

PROJECT_ID="mymoolah-db"
SERVICE_ACCOUNT_NAME="mymoolah-production-sa"
SERVICE_ACCOUNT_EMAIL="${SERVICE_ACCOUNT_NAME}@${PROJECT_ID}.iam.gserviceaccount.com"
DISPLAY_NAME="MyMoolah Production Service Account"

log() { echo "📋 [$(date +'%Y-%m-%d %H:%M:%S')] $*"; }
err() { echo "❌ $*" >&2; exit 1; }
success() { echo "✅ [$(date +'%Y-%m-%d %H:%M:%S')] $*"; }

gcloud config set project "${PROJECT_ID}" >/dev/null

log "Creating Production Cloud Run Service Account"
log "Project: ${PROJECT_ID}"
echo ""

if gcloud iam service-accounts describe "${SERVICE_ACCOUNT_EMAIL}" --project="${PROJECT_ID}" >/dev/null 2>&1; then
  success "Service account already exists: ${SERVICE_ACCOUNT_EMAIL}"
else
  gcloud iam service-accounts create "${SERVICE_ACCOUNT_NAME}" \
    --display-name="${DISPLAY_NAME}" \
    --project="${PROJECT_ID}" || err "Failed to create service account"
  success "Service account created: ${SERVICE_ACCOUNT_EMAIL}"
fi

for ROLE in roles/secretmanager.secretAccessor roles/cloudsql.client roles/run.invoker roles/logging.logWriter roles/monitoring.metricWriter; do
  gcloud projects add-iam-policy-binding "${PROJECT_ID}" \
    --member="serviceAccount:${SERVICE_ACCOUNT_EMAIL}" \
    --role="${ROLE}" --quiet 2>/dev/null || true
done
success "IAM roles granted"

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Production Service Account: ${SERVICE_ACCOUNT_EMAIL}"
echo "Next: ./scripts/setup-secrets-production.sh"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

success "Done."
