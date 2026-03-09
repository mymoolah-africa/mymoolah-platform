#!/usr/bin/env bash
set -euo pipefail

# ============================================================
# SBSA PayShap Production Credentials — GCS Secret Manager Setup
# ============================================================
# Run this ONCE from your local Mac to register SBSA credentials
# in Google Cloud Secret Manager (used by Cloud Run staging + production).
#
# Usage:
#   ./scripts/setup-sbsa-production-secrets.sh
#
# Prerequisites:
#   - gcloud authenticated: gcloud auth login
#   - Project set: gcloud config set project mymoolah-db
#
# After running this script:
#   ./scripts/deploy-backend.sh --staging
#   ./scripts/deploy-backend.sh --production
# ============================================================

PROJECT_ID="mymoolah-db"
STAGING_SA="mymoolah-staging-sa@${PROJECT_ID}.iam.gserviceaccount.com"
PRODUCTION_SA="mymoolah-production-sa@${PROJECT_ID}.iam.gserviceaccount.com"

log()  { echo "📋 $*"; }
err()  { echo "❌ $*" >&2; exit 1; }
ok()   { echo "✅ $*"; }
warn() { echo "⚠️  $*"; }

# ─────────────────────────────────────────────────────────────
# CREDENTIALS — edit these before running
# ─────────────────────────────────────────────────────────────

# Ping OAuth credentials (from SBSA OneHub — production)
SBSA_PING_CLIENT_ID_VALUE="164f96b3-9e2d-44d5-aa27-ff683b60a136"
SBSA_PING_CLIENT_SECRET_VALUE="TMG0v3vQTgVy6TzCSen7TWHbFA7NiWsafYYn479YQBuisywbwg2VSrqLpKETrMNw"

# IBM API Gateway credentials (from SBSA — production)
SBSA_IBM_CLIENT_ID_VALUE="b79a1a8c9efc86d79bdef352a4c94a78"
SBSA_IBM_CLIENT_SECRET_VALUE="00b9ca1736e99e1dd0f3099aa2bac7ea"

# ─────────────────────────────────────────────────────────────
# PLACEHOLDERS — fill in before running
# ─────────────────────────────────────────────────────────────
# SBSA_CALLBACK_SECRET_VALUE: The API user secret from OneHub used to validate
#   incoming callback HMAC signatures (x-GroupHeader-Hash header).
#   Found in OneHub portal under your API user credentials.
#   UAT value was: srBFXm0JiGVX27iJI9IJtjusMJaxl8puLYPZ3aZvMWM=
SBSA_CALLBACK_SECRET_VALUE="${SBSA_CALLBACK_SECRET_VALUE:-PLACEHOLDER_UPDATE_BEFORE_RUNNING}"

# SBSA_DEBTOR_ACCOUNT_VALUE: The MMTP production TPP bank account number at SBSA.
#   This is the real MyMoolah bank account from which RPP outbound payments are made.
#   Example format: 123456789012 (12 digits, Standard Bank account)
SBSA_DEBTOR_ACCOUNT_VALUE="${SBSA_DEBTOR_ACCOUNT_VALUE:-PLACEHOLDER_UPDATE_BEFORE_RUNNING}"

# ─────────────────────────────────────────────────────────────

# Validate placeholders are filled
if [[ "$SBSA_CALLBACK_SECRET_VALUE" == "PLACEHOLDER_UPDATE_BEFORE_RUNNING" ]]; then
  warn "SBSA_CALLBACK_SECRET_VALUE is not set."
  warn "Set it before running: export SBSA_CALLBACK_SECRET_VALUE=<value>"
  warn "Or edit this script directly. Continuing with other secrets..."
  SKIP_CALLBACK=true
else
  SKIP_CALLBACK=false
fi

if [[ "$SBSA_DEBTOR_ACCOUNT_VALUE" == "PLACEHOLDER_UPDATE_BEFORE_RUNNING" ]]; then
  warn "SBSA_DEBTOR_ACCOUNT_VALUE is not set."
  warn "Set it before running: export SBSA_DEBTOR_ACCOUNT_VALUE=<account_number>"
  warn "Or edit this script directly. Continuing with other secrets..."
  SKIP_DEBTOR=true
else
  SKIP_DEBTOR=false
fi

log "Setting up SBSA PayShap production secrets in GCS Secret Manager..."
log "Project: ${PROJECT_ID}"
echo ""

# ─────────────────────────────────────────────────────────────
# Helper: create or update a secret
# ─────────────────────────────────────────────────────────────
upsert_secret() {
  local name="$1"
  local value="$2"

  if gcloud secrets describe "${name}" --project="${PROJECT_ID}" >/dev/null 2>&1; then
    log "Updating existing secret: ${name}"
    echo -n "${value}" | gcloud secrets versions add "${name}" \
      --data-file=- \
      --project="${PROJECT_ID}" >/dev/null
    ok "Updated: ${name}"
  else
    log "Creating new secret: ${name}"
    echo -n "${value}" | gcloud secrets create "${name}" \
      --data-file=- \
      --replication-policy=automatic \
      --project="${PROJECT_ID}" >/dev/null
    ok "Created: ${name}"
  fi
}

# ─────────────────────────────────────────────────────────────
# Helper: grant Secret Accessor to a service account
# ─────────────────────────────────────────────────────────────
grant_accessor() {
  local secret_name="$1"
  local sa="$2"
  gcloud secrets add-iam-policy-binding "${secret_name}" \
    --project="${PROJECT_ID}" \
    --member="serviceAccount:${sa}" \
    --role="roles/secretmanager.secretAccessor" \
    --quiet >/dev/null 2>&1 || true
}

grant_all() {
  local secret_name="$1"
  grant_accessor "${secret_name}" "${STAGING_SA}"
  grant_accessor "${secret_name}" "${PRODUCTION_SA}"
  ok "  IAM granted: staging-sa + production-sa → ${secret_name}"
}

# ─────────────────────────────────────────────────────────────
# 1. Ping OAuth credentials
# ─────────────────────────────────────────────────────────────
echo "--- Ping OAuth credentials ---"
upsert_secret "sbsa-ping-client-id"     "${SBSA_PING_CLIENT_ID_VALUE}"
grant_all     "sbsa-ping-client-id"
upsert_secret "sbsa-ping-client-secret" "${SBSA_PING_CLIENT_SECRET_VALUE}"
grant_all     "sbsa-ping-client-secret"
echo ""

# ─────────────────────────────────────────────────────────────
# 2. IBM API Gateway credentials
# ─────────────────────────────────────────────────────────────
echo "--- IBM API Gateway credentials ---"
upsert_secret "sbsa-ibm-client-id"     "${SBSA_IBM_CLIENT_ID_VALUE}"
grant_all     "sbsa-ibm-client-id"
upsert_secret "sbsa-ibm-client-secret" "${SBSA_IBM_CLIENT_SECRET_VALUE}"
grant_all     "sbsa-ibm-client-secret"
echo ""

# ─────────────────────────────────────────────────────────────
# 3. Callback HMAC secret
# ─────────────────────────────────────────────────────────────
echo "--- Callback HMAC secret ---"
if [ "$SKIP_CALLBACK" = false ]; then
  upsert_secret "sbsa-callback-secret" "${SBSA_CALLBACK_SECRET_VALUE}"
  grant_all     "sbsa-callback-secret"
else
  warn "Skipped: sbsa-callback-secret (SBSA_CALLBACK_SECRET_VALUE not set)"
  warn "Run later: export SBSA_CALLBACK_SECRET_VALUE=<value> && ./scripts/setup-sbsa-production-secrets.sh"
fi
echo ""

# ─────────────────────────────────────────────────────────────
# 4. MMTP TPP Debtor account number
# ─────────────────────────────────────────────────────────────
echo "--- MMTP TPP Debtor account ---"
if [ "$SKIP_DEBTOR" = false ]; then
  upsert_secret "sbsa-debtor-account" "${SBSA_DEBTOR_ACCOUNT_VALUE}"
  grant_all     "sbsa-debtor-account"
else
  warn "Skipped: sbsa-debtor-account (SBSA_DEBTOR_ACCOUNT_VALUE not set)"
  warn "Run later: export SBSA_DEBTOR_ACCOUNT_VALUE=<account_no> && ./scripts/setup-sbsa-production-secrets.sh"
fi
echo ""

# ─────────────────────────────────────────────────────────────
# Summary
# ─────────────────────────────────────────────────────────────
echo "============================================================"
ok "SBSA secret setup complete!"
echo ""
echo "Secrets registered in GCS Secret Manager (project: ${PROJECT_ID}):"
echo "  ✅ sbsa-ping-client-id"
echo "  ✅ sbsa-ping-client-secret"
echo "  ✅ sbsa-ibm-client-id"
echo "  ✅ sbsa-ibm-client-secret"
[ "$SKIP_CALLBACK" = false ] && echo "  ✅ sbsa-callback-secret" || echo "  ⚠️  sbsa-callback-secret  (PENDING — set SBSA_CALLBACK_SECRET_VALUE)"
[ "$SKIP_DEBTOR"   = false ] && echo "  ✅ sbsa-debtor-account"  || echo "  ⚠️  sbsa-debtor-account   (PENDING — set SBSA_DEBTOR_ACCOUNT_VALUE)"
echo ""
echo "Next steps:"
echo "  1. Fill in any ⚠️ pending secrets above, then re-run this script"
echo "  2. Deploy to staging:    ./scripts/deploy-backend.sh --staging"
echo "  3. Test PayShap RPP/RTP on staging"
echo "  4. Deploy to production: ./scripts/deploy-backend.sh --production"
echo "============================================================"
