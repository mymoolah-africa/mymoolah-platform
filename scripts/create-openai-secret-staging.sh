#!/usr/bin/env bash

set -euo pipefail

# Quick script to create OpenAI API key secret for staging
# Usage: ./scripts/create-openai-secret-staging.sh

PROJECT_ID="mymoolah-db"
SECRET_NAME="openai-api-key-staging"

echo "🔐 Creating OpenAI API key secret for staging..."
echo ""

# Check if API key is provided
if [ -z "${OPENAI_API_KEY:-}" ]; then
  echo "❌ ERROR: OPENAI_API_KEY environment variable not set"
  echo ""
  echo "Usage:"
  echo "  export OPENAI_API_KEY='sk-proj-YOUR_KEY_HERE'"
  echo "  ./scripts/create-openai-secret-staging.sh"
  echo ""
  exit 1
fi

# Check gcloud
if ! command -v gcloud &> /dev/null; then
  echo "❌ ERROR: gcloud CLI not found"
  exit 1
fi

# Check authentication
if ! gcloud auth list --filter=status:ACTIVE --format="value(account)" | grep -q .; then
  echo "❌ ERROR: No active gcloud authentication"
  echo "Run: gcloud auth login"
  exit 1
fi

# Set project (don't fail if it doesn't exist, just warn)
if ! gcloud projects describe "${PROJECT_ID}" > /dev/null 2>&1; then
  CURRENT_PROJECT=$(gcloud config get-value project 2>/dev/null || echo "not set")
  echo "⚠️  WARNING: Project ${PROJECT_ID} not found or no access"
  echo "   Current project: ${CURRENT_PROJECT}"
  echo ""
  echo "Available projects:"
  gcloud projects list --format="table(projectId,name)" 2>/dev/null || true
  echo ""
  read -p "Continue anyway? (y/N) " -n 1 -r
  echo
  if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    exit 1
  fi
else
  gcloud config set project "${PROJECT_ID}" > /dev/null 2>&1
fi

# Create or update secret
if gcloud secrets describe "${SECRET_NAME}" --project="${PROJECT_ID}" > /dev/null 2>&1; then
  echo "📝 Secret ${SECRET_NAME} exists. Adding new version..."
  echo -n "${OPENAI_API_KEY}" | gcloud secrets versions add "${SECRET_NAME}" \
    --project="${PROJECT_ID}" \
    --data-file=-
  echo "✅ New version added to secret: ${SECRET_NAME}"
else
  echo "📝 Creating new secret: ${SECRET_NAME}"
  echo -n "${OPENAI_API_KEY}" | gcloud secrets create "${SECRET_NAME}" \
    --project="${PROJECT_ID}" \
    --data-file=-
  echo "✅ Secret created: ${SECRET_NAME}"
fi

# Grant service account access
SERVICE_ACCOUNT="mymoolah-staging-sa@${PROJECT_ID}.iam.gserviceaccount.com"
echo ""
echo "🔐 Granting service account access..."
gcloud secrets add-iam-policy-binding "${SECRET_NAME}" \
  --project="${PROJECT_ID}" \
  --member="serviceAccount:${SERVICE_ACCOUNT}" \
  --role="roles/secretmanager.secretAccessor" \
  > /dev/null 2>&1 || {
  echo "⚠️  WARNING: Failed to grant access to service account"
  echo "   You may need to run this manually:"
  echo "   gcloud secrets add-iam-policy-binding ${SECRET_NAME} \\"
  echo "     --project=${PROJECT_ID} \\"
  echo "     --member=\"serviceAccount:${SERVICE_ACCOUNT}\" \\"
  echo "     --role=\"roles/secretmanager.secretAccessor\""
}

echo ""
echo "✅ Done! Secret ${SECRET_NAME} is ready for staging deployment."

