#!/usr/bin/env bash
set -euo pipefail

# Fix SBSA GCS bucket permissions for staging and production service accounts.
# Bucket: mymoolah-sftp-inbound
#
# Issues identified from Cloud Run logs:
#   1. staging SA cannot list objects  (storage.objects.list)
#   2. production SA cannot create objects (storage.objects.create — needed for archive/move)
#
# Both SAs need: read, list, create, delete on the SFTP inbound bucket
# so the statement poller can list, download, archive (move = copy+delete), and clean up.

PROJECT_ID="mymoolah-db"
BUCKET="mymoolah-sftp-inbound"

STAGING_SA="mymoolah-staging-sa@${PROJECT_ID}.iam.gserviceaccount.com"
PRODUCTION_SA="mymoolah-production-sa@${PROJECT_ID}.iam.gserviceaccount.com"

log() { echo "  $*"; }
ok()  { echo "✅ $*"; }
err() { echo "❌ $*" >&2; exit 1; }

echo "═══════════════════════════════════════════════"
echo "  Fix SBSA GCS Permissions"
echo "═══════════════════════════════════════════════"
echo ""
echo "Bucket:        gs://${BUCKET}"
echo "Staging SA:    ${STAGING_SA}"
echo "Production SA: ${PRODUCTION_SA}"
echo ""

grant_role() {
  local sa="$1"
  local role="$2"
  local label="$3"

  log "Granting ${role} to ${label}..."
  if gsutil iam ch "serviceAccount:${sa}:${role}" "gs://${BUCKET}" 2>/dev/null; then
    ok "${label} now has ${role}"
  else
    err "Failed to grant ${role} to ${label}"
  fi
}

# objectViewer  = storage.objects.get + storage.objects.list
# objectCreator = storage.objects.create
# objectAdmin   = get + list + create + delete + update (full CRUD needed for move/archive)
# Using objectAdmin as the statement service needs list, get, create (copy to archive), and delete (remove original after move)

echo "── Staging SA ──────────────────────────────────"
grant_role "${STAGING_SA}" "roles/storage.objectAdmin" "staging"

echo ""
echo "── Production SA ───────────────────────────────"
grant_role "${PRODUCTION_SA}" "roles/storage.objectAdmin" "production"

echo ""
ok "GCS permissions updated. Statement poller should now work for both environments."
echo ""
echo "Verify with:"
echo "  gsutil iam get gs://${BUCKET} | grep -A2 'staging-sa'"
echo "  gsutil iam get gs://${BUCKET} | grep -A2 'production-sa'"
