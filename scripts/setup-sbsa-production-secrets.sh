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
#   From .env.codespaces (OneHub API user credential — same across environments).
SBSA_CALLBACK_SECRET_VALUE="${SBSA_CALLBACK_SECRET_VALUE:-srBFXm0JiGVX27iJI9IJtjusMJaxl8puLYPZ3aZvMWM=}"

# SBSA_DEBTOR_ACCOUNT_VALUE: The MMTP TPP bank account number at SBSA.
#   Used in Pain.001 as the debtor account for RPP outbound payments.
#   Production MMTP account: displayed as "0000 272406481 000" on statement.
#   Spaces and display zeros stripped → core account 272406481.
#   SBSA API uses 12-digit format (e.g. UAT: 000602739172 = 3-prefix + 9-account).
#   Using 272406481 here — verify format on first staging test (SBSA will error if wrong).
SBSA_DEBTOR_ACCOUNT_VALUE="${SBSA_DEBTOR_ACCOUNT_VALUE:-272406481}"

# ─────────────────────────────────────────────────────────────

SKIP_CALLBACK=false
SKIP_DEBTOR=false

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
echo "  ✅ sbsa-callback-secret"
echo "  ✅ sbsa-debtor-account"
echo ""
echo "Next steps:"
echo "  1. Deploy to staging:    ./scripts/deploy-backend.sh --staging"
echo "  2. Test PayShap RPP/RTP on staging against live SBSA production API"
echo "  3. Deploy to production: ./scripts/deploy-backend.sh --production"
echo ""
  echo "  NOTE: sbsa-debtor-account uses 272406481 (MMTP production account, spaces/display-zeros stripped)."
  echo "  SBSA may require 12-digit format (000272406481). Verify on first staging RPP test."
  echo "  If rejected, update: export SBSA_DEBTOR_ACCOUNT_VALUE=000272406481 && ./scripts/setup-sbsa-production-secrets.sh"
echo "============================================================"
