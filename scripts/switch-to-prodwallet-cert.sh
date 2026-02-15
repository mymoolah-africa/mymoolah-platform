#!/usr/bin/env bash
# Switch load balancer to cert-prodwallet when it becomes ACTIVE
# Run: ./scripts/switch-to-prodwallet-cert.sh
set -euo pipefail
PROJECT_ID="${GCP_PROJECT_ID:-mymoolah-db}"

STATUS=$(gcloud compute ssl-certificates describe cert-prodwallet --global --project="$PROJECT_ID" --format="value(managed.status)")
if [[ "$STATUS" == "ACTIVE" ]]; then
  echo "Cert is ACTIVE. Switching load balancer..."
  gcloud compute target-https-proxies update https-proxy-production \
    --ssl-certificates=cert-prodwallet \
    --global \
    --project="$PROJECT_ID"
  echo "Done. Production wallet: https://prodwallet.mymoolah.africa"
else
  echo "Cert status: $STATUS. Wait and run again."
  exit 1
fi
