#!/bin/bash

# Banking-Grade CORS Fix: Allow Load Balancer Service Account to Invoke Cloud Run
# Standard GCP pattern: Load balancer forwards requests, Cloud Run allows LB service account

set -e

PROJECT_ID="mymoolah-db"
REGION="africa-south1"
CLOUD_RUN_SERVICE="mymoolah-backend-staging"
# Load balancer's default compute service account
LOAD_BALANCER_SA="1039241541823-compute@developer.gserviceaccount.com"

echo "🔒 Banking-Grade CORS Fix: Configuring Load Balancer → Cloud Run Authentication"
echo ""

# Step 1: Grant load balancer service account permission to invoke Cloud Run
echo "Step 1: Granting Cloud Run Invoker role to load balancer service account..."
gcloud run services add-iam-policy-binding "${CLOUD_RUN_SERVICE}" \
  --region="${REGION}" \
  --member="serviceAccount:${LOAD_BALANCER_SA}" \
  --role="roles/run.invoker" && {
    echo "✅ Load balancer service account can now invoke Cloud Run"
  } || {
    echo "⚠️  Service account might already have permission, checking..."
    # Verify it exists
    gcloud run services get-iam-policy "${CLOUD_RUN_SERVICE}" \
      --region="${REGION}" \
      --format='value(bindings[].members[])' | grep -q "${LOAD_BALANCER_SA}" && {
        echo "✅ Load balancer service account already has permission"
      } || {
        echo "❌ Failed to grant permission. This might be due to organization policy."
        echo "   The load balancer service account needs roles/run.invoker"
        exit 1
      }
  }

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ Step 1 Complete: Load Balancer Service Account Configured"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "⚠️  IMPORTANT: Browser OPTIONS requests are unauthenticated."
echo "   Cloud Run IAM will still block them unless we allow unauthenticated access."
echo ""
echo "Next: We need to allow unauthenticated OPTIONS requests to Cloud Run."
echo "This is safe because:"
echo "  - OPTIONS requests are metadata-only (no sensitive data)"
echo "  - Backend CORS middleware validates origins"
echo "  - Actual API calls (POST, GET) still require JWT authentication"
echo ""
echo "However, organization policy 'Domain restricted sharing' blocks adding allUsers."
echo ""
echo "Solution: Request organization policy exception for OPTIONS requests only."
echo ""
echo "To test if this works (after org policy exception):"
echo "  curl -X OPTIONS -H 'Origin: https://stagingwallet.mymoolah.africa' \\"
echo "    -H 'Access-Control-Request-Method: POST' \\"
echo "    https://staging.mymoolah.africa/api/v1/auth/login"
echo ""

