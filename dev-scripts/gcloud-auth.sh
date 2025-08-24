#!/bin/zsh
set -euo pipefail

# Google Cloud authentication helper for local development
# - Performs interactive user login and updates Application Default Credentials (ADC)
# - Sets the active project
# - Optional: performs ADC login for older CLIs

PROJECT_ID="mymoolah-db"

echo "🔐 Google Cloud auth: starting interactive login..."

if ! command -v gcloud >/dev/null 2>&1; then
  echo "❌ gcloud CLI not found. Install from https://cloud.google.com/sdk/docs/install" >&2
  exit 1
fi

# Best-practice combined login that also updates ADC used by Cloud SQL Proxy
gcloud auth login --update-adc

echo "🔧 Setting active project to ${PROJECT_ID} ..."
gcloud config set project ${PROJECT_ID}

# Some older setups still require explicit ADC login; run it but ignore if user skips
if gcloud --quiet auth application-default print-access-token >/dev/null 2>&1; then
  :
else
  echo "ℹ️ Running application-default login to initialize ADC ..."
  gcloud auth application-default login || true
fi

echo "✅ Auth complete. Accounts:"
gcloud auth list

echo "✅ ADC token check (first 20 chars):"
gcloud auth application-default print-access-token 2>/dev/null | head -c 20 || true; echo

echo "Done. You can now start the Cloud SQL proxy via:"
echo "/Users/andremacbookpro/mymoolah/dev-scripts/start-proxy.sh"






