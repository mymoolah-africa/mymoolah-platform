#!/usr/bin/env bash

set -euo pipefail

# Create VALR API key and secret in Google Secret Manager for Staging (USDC Send)
# Usage:
#   export VALR_API_KEY='your_64_char_api_key'
#   export VALR_API_SECRET='your_64_char_api_secret'
#   ./scripts/create-valr-secrets-staging.sh

PROJECT_ID="${PROJECT_ID:-mymoolah-db}"

echo "🔐 Creating VALR API secrets for Staging (USDC Send)..."
echo ""

if [ -z "${VALR_API_KEY:-}" ]; then
  echo "❌ ERROR: VALR_API_KEY environment variable not set"
  echo ""
  echo "Usage:"
  echo "  export VALR_API_KEY='your_64_char_api_key'"
  echo "  export VALR_API_SECRET='your_64_char_api_secret'"
  echo "  ./scripts/create-valr-secrets-staging.sh"
  echo ""
  exit 1
fi

if [ -z "${VALR_API_SECRET:-}" ]; then
  echo "❌ ERROR: VALR_API_SECRET environment variable not set"
  echo ""
  echo "Usage:"
  echo "  export VALR_API_KEY='your_64_char_api_key'"
  echo "  export VALR_API_SECRET='your_64_char_api_secret'"
  echo "  ./scripts/create-valr-secrets-staging.sh"
  echo ""
  exit 1
fi

if ! command -v gcloud &> /dev/null; then
  echo "❌ ERROR: gcloud CLI not found"
  exit 1
fi

if ! gcloud auth list --filter=status:ACTIVE --format="value(account)" | grep -q .; then
  echo "❌ ERROR: No active gcloud authentication. Run: gcloud auth login"
  exit 1
fi

if ! gcloud projects describe "${PROJECT_ID}" > /dev/null 2>&1; then
  echo "⚠️  WARNING: Project ${PROJECT_ID} not found or no access"
  echo "   Set PROJECT_ID if different: export PROJECT_ID='your-project-id'"
  exit 1
fi

gcloud config set project "${PROJECT_ID}" > /dev/null 2>&1

for name_secret_desc in \
  "valr-api-key-staging:${VALR_API_KEY}:VALR API Key for Staging (USDC Send)" \
  "valr-api-secret-staging:${VALR_API_SECRET}:VALR API Secret for Staging (USDC Send)"; do
  IFS=':' read -r SECRET_NAME SECRET_VALUE SECRET_DESC <<< "${name_secret_desc}"
  if gcloud secrets describe "${SECRET_NAME}" --project="${PROJECT_ID}" > /dev/null 2>&1; then
    echo "📝 Adding new version to secret: ${SECRET_NAME}"
    echo -n "${SECRET_VALUE}" | gcloud secrets versions add "${SECRET_NAME}" \
      --project="${PROJECT_ID}" \
      --data-file=-
    echo "✅ Updated: ${SECRET_NAME}"
  else
    echo "📝 Creating secret: ${SECRET_NAME}"
    echo -n "${SECRET_VALUE}" | gcloud secrets create "${SECRET_NAME}" \
      --project="${PROJECT_ID}" \
      --replication-policy="automatic" \
      --data-file=-
    echo "✅ Created: ${SECRET_NAME}"
  fi
done

SERVICE_ACCOUNT="mymoolah-staging-sa@${PROJECT_ID}.iam.gserviceaccount.com"
echo ""
echo "🔐 Granting service account access..."
for SECRET_NAME in valr-api-key-staging valr-api-secret-staging; do
  gcloud secrets add-iam-policy-binding "${SECRET_NAME}" \
    --project="${PROJECT_ID}" \
    --member="serviceAccount:${SERVICE_ACCOUNT}" \
    --role="roles/secretmanager.secretAccessor" \
    > /dev/null 2>&1 || true
done
echo "✅ IAM binding updated (if service account exists)"

echo ""
echo "✅ Done! VALR secrets are in Secret Manager."
echo "   Next: Configure Cloud Run Staging to use VALR_API_KEY and VALR_API_SECRET from these secrets."
