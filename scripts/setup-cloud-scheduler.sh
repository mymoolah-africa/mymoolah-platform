#!/usr/bin/env bash
set -euo pipefail

# Setup Cloud Scheduler jobs for catalog synchronization
# Replaces node-cron which gets killed by Cloud Run instance recycling
#
# Usage:
#   ./scripts/setup-cloud-scheduler.sh --staging
#   ./scripts/setup-cloud-scheduler.sh --production
#   ./scripts/setup-cloud-scheduler.sh --both

PROJECT_ID="mymoolah-db"
# Cloud Scheduler not available in africa-south1. europe-west1 is the closest
# supported region. Only the cron timer runs here — the HTTP request still
# targets Cloud Run in africa-south1. Timezone is Africa/Johannesburg.
SCHEDULER_LOCATION="europe-west1"

STAGING_SERVICE_URL="https://mymoolah-backend-staging-4ekgjiko5a-bq.a.run.app"
STAGING_SA="mymoolah-staging-sa@${PROJECT_ID}.iam.gserviceaccount.com"

PRODUCTION_SERVICE_URL="https://mymoolah-backend-production-4ekgjiko5a-bq.a.run.app"
PRODUCTION_SA="mymoolah-production-sa@${PROJECT_ID}.iam.gserviceaccount.com"

log() { echo "$(date '+%H:%M:%S') [INFO] $*"; }
err() { echo "$(date '+%H:%M:%S') [ERROR] $*" >&2; exit 1; }

create_scheduler_job() {
  local env="$1"
  local service_url="$2"
  local sa="$3"
  local job_name="catalog-sweep-${env}"
  local endpoint="${service_url}/api/v1/catalog-sync/scheduled-sweep"

  log "Creating Cloud Scheduler job: ${job_name}"
  log "  Endpoint: ${endpoint}"
  log "  Schedule: 0 2 * * * (02:00 SAST daily)"
  log "  SA: ${sa}"

  # Delete existing job if it exists (idempotent)
  gcloud scheduler jobs delete "${job_name}" \
    --location="${SCHEDULER_LOCATION}" \
    --project="${PROJECT_ID}" \
    --quiet 2>/dev/null || true

  gcloud scheduler jobs create http "${job_name}" \
    --location="${SCHEDULER_LOCATION}" \
    --project="${PROJECT_ID}" \
    --schedule="0 2 * * *" \
    --time-zone="Africa/Johannesburg" \
    --uri="${endpoint}" \
    --http-method=POST \
    --oidc-service-account-email="${sa}" \
    --oidc-token-audience="${service_url}" \
    --attempt-deadline=1800s \
    --max-retry-attempts=3 \
    --min-backoff=60s \
    --max-backoff=600s \
    --description="Daily catalog sweep for ${env} — sweeps Flash + MobileMart catalogs, deactivates stale products, refreshes best-offers cache" \
    || err "Failed to create scheduler job: ${job_name}"

  log "Cloud Scheduler job created: ${job_name}"
  echo ""
}

ENVIRONMENT=""
for arg in "$@"; do
  case $arg in
    --staging)    ENVIRONMENT="staging" ;;
    --production) ENVIRONMENT="production" ;;
    --both)       ENVIRONMENT="both" ;;
    *)            err "Usage: $0 --staging | --production | --both" ;;
  esac
done

if [ -z "$ENVIRONMENT" ]; then
  err "Usage: $0 --staging | --production | --both"
fi

echo ""
echo "========================================"
echo "  Cloud Scheduler Setup"
echo "========================================"
echo ""

if [ "$ENVIRONMENT" == "staging" ] || [ "$ENVIRONMENT" == "both" ]; then
  create_scheduler_job "staging" "$STAGING_SERVICE_URL" "$STAGING_SA"
fi

if [ "$ENVIRONMENT" == "production" ] || [ "$ENVIRONMENT" == "both" ]; then
  create_scheduler_job "production" "$PRODUCTION_SERVICE_URL" "$PRODUCTION_SA"
fi

echo "========================================"
log "Setup complete. Verify with:"
echo "  gcloud scheduler jobs list --location=${SCHEDULER_LOCATION} --project=${PROJECT_ID}"
echo ""
log "Test a job manually:"
echo "  gcloud scheduler jobs run catalog-sweep-staging --location=${SCHEDULER_LOCATION} --project=${PROJECT_ID}"
echo "  gcloud scheduler jobs run catalog-sweep-production --location=${SCHEDULER_LOCATION} --project=${PROJECT_ID}"
echo "========================================"
echo ""
