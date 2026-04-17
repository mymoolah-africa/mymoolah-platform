#!/usr/bin/env bash
set -euo pipefail

# Setup Cloud Scheduler jobs for MyMoolah scheduled tasks
# Replaces node-cron which gets killed by Cloud Run instance recycling (min-instances=0)
#
# Jobs created:
#   1. catalog-sweep-{env}         — 02:00 SAST daily (Flash + MobileMart catalog sync)
#   2. referral-payout-{env}       — 02:15 SAST daily (credit pending referral earnings to wallets)
#   3. sbsa-statement-poll-{env}   — every 2 min (MT940/MT942 bank statements)
#   4. sbsa-pain002-poll-{env}     — every 5 min (Pain.002 disbursement responses)
#   5. sftp-recon-sweep-{env}      — every 2 min (supplier recon file sweep)
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

create_http_job() {
  local job_name="$1"
  local endpoint="$2"
  local schedule="$3"
  local sa="$4"
  local service_url="$5"
  local description="$6"
  local deadline="${7:-1800s}"

  log "Creating Cloud Scheduler job: ${job_name}"
  log "  Endpoint: ${endpoint}"
  log "  Schedule: ${schedule}"
  log "  SA: ${sa}"

  gcloud scheduler jobs delete "${job_name}" \
    --location="${SCHEDULER_LOCATION}" \
    --project="${PROJECT_ID}" \
    --quiet 2>/dev/null || true

  gcloud scheduler jobs create http "${job_name}" \
    --location="${SCHEDULER_LOCATION}" \
    --project="${PROJECT_ID}" \
    --schedule="${schedule}" \
    --time-zone="Africa/Johannesburg" \
    --uri="${endpoint}" \
    --http-method=POST \
    --oidc-service-account-email="${sa}" \
    --oidc-token-audience="${service_url}" \
    --attempt-deadline="${deadline}" \
    --max-retry-attempts=3 \
    --min-backoff=60s \
    --max-backoff=600s \
    --description="${description}" \
    || err "Failed to create scheduler job: ${job_name}"

  log "Cloud Scheduler job created: ${job_name}"
  echo ""
}

create_all_jobs_for_env() {
  local env="$1"
  local service_url="$2"
  local sa="$3"

  # 1. Catalog sweep — 02:00 SAST daily
  create_http_job \
    "catalog-sweep-${env}" \
    "${service_url}/api/v1/catalog-sync/scheduled-sweep" \
    "0 2 * * *" \
    "${sa}" \
    "${service_url}" \
    "Daily catalog sweep for ${env} — sweeps Flash + MobileMart catalogs, deactivates stale products, refreshes best-offers cache" \
    "1800s"

  # 2. Referral payout — 02:15 SAST daily (staggered 15 min after catalog sweep)
  create_http_job \
    "referral-payout-${env}" \
    "${service_url}/api/v1/referrals/scheduled-payout" \
    "15 2 * * *" \
    "${sa}" \
    "${service_url}" \
    "Daily referral payout for ${env} — credits pending referral earnings to user wallets" \
    "300s"

  # 3. SBSA H2H statement poller — every 2 min (MT940 end-of-day + MT942 intraday)
  create_http_job \
    "sbsa-statement-poll-${env}" \
    "${service_url}/api/v1/standardbank/scheduled-statement-poll" \
    "*/2 * * * *" \
    "${sa}" \
    "${service_url}" \
    "SBSA H2H MT940/MT942 statement poll for ${env} — picks up bank statements from GCS inbox and credits wallets" \
    "300s"

  # 4. SBSA H2H Pain.002 poller — every 5 min (disbursement status responses)
  create_http_job \
    "sbsa-pain002-poll-${env}" \
    "${service_url}/api/v1/standardbank/scheduled-pain002-poll" \
    "*/5 * * * *" \
    "${sa}" \
    "${service_url}" \
    "SBSA H2H Pain.002 response poll for ${env} — updates DisbursementRun/Payment statuses" \
    "300s"

  # 5. Supplier recon SFTP sweep — every 2 min (MobileMart, Flash, EasyPay, Zapper files)
  create_http_job \
    "sftp-recon-sweep-${env}" \
    "${service_url}/api/v1/reconciliation/scheduled-sftp-sweep" \
    "*/2 * * * *" \
    "${sa}" \
    "${service_url}" \
    "Supplier recon file SFTP sweep for ${env} — feeds ReconciliationOrchestrator" \
    "600s"
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
  create_all_jobs_for_env "staging" "$STAGING_SERVICE_URL" "$STAGING_SA"
fi

if [ "$ENVIRONMENT" == "production" ] || [ "$ENVIRONMENT" == "both" ]; then
  create_all_jobs_for_env "production" "$PRODUCTION_SERVICE_URL" "$PRODUCTION_SA"
fi

echo "========================================"
log "Setup complete. Verify with:"
echo "  gcloud scheduler jobs list --location=${SCHEDULER_LOCATION} --project=${PROJECT_ID}"
echo ""
log "Test a job manually:"
echo "  gcloud scheduler jobs run catalog-sweep-staging --location=${SCHEDULER_LOCATION} --project=${PROJECT_ID}"
echo "  gcloud scheduler jobs run referral-payout-staging --location=${SCHEDULER_LOCATION} --project=${PROJECT_ID}"
echo "  gcloud scheduler jobs run catalog-sweep-production --location=${SCHEDULER_LOCATION} --project=${PROJECT_ID}"
echo "  gcloud scheduler jobs run referral-payout-production --location=${SCHEDULER_LOCATION} --project=${PROJECT_ID}"
echo "========================================"
echo ""
