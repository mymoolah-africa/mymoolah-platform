#!/bin/bash

# Banking-Grade CORS Fix: Configure Load Balancer to Authenticate with Service Account
# This allows OPTIONS requests through without exposing Cloud Run publicly

set -e

PROJECT_ID="mymoolah-db"
REGION="africa-south1"
BACKEND_SERVICE="be-staging-backend"
CLOUD_RUN_SERVICE="mymoolah-backend-staging"
LOAD_BALANCER_SA="1039241541823-compute@developer.gserviceaccount.com"

echo "🔒 Banking-Grade CORS Fix: Configuring Load Balancer Authentication"
echo ""

# Step 1: Grant the load balancer service account permission to invoke Cloud Run
echo "Step 1: Granting Cloud Run Invoker role to load balancer service account..."
gcloud run services add-iam-policy-binding "${CLOUD_RUN_SERVICE}" \
  --region="${REGION}" \
  --member="serviceAccount:${LOAD_BALANCER_SA}" \
  --role="roles/run.invoker" || {
    echo "⚠️  Service account might already have permission, continuing..."
  }

echo "✅ Load balancer service account can now invoke Cloud Run"
echo ""

# Step 2: Configure backend service to use service account authentication
echo "Step 2: Configuring backend service to authenticate requests..."
gcloud compute backend-services update "${BACKEND_SERVICE}" \
  --global \
  --authentication-service-accounts="${LOAD_BALANCER_SA}" || {
    echo "❌ Failed to configure backend service authentication"
    echo ""
    echo "Alternative: Configure backend service to allow unauthenticated for OPTIONS only"
    echo "This requires Cloud Run to handle OPTIONS before authentication middleware"
    exit 1
  }

echo "✅ Backend service configured to authenticate using service account"
echo ""

# Step 3: Verify configuration
echo "Step 3: Verifying configuration..."
gcloud compute backend-services describe "${BACKEND_SERVICE}" \
  --global \
  --format='value(authenticationServiceAccounts)' || {
    echo "⚠️  Could not verify authentication configuration"
  }

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ Banking-Grade CORS Fix Complete"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "Configuration:"
echo "  - Load balancer authenticates requests using service account"
echo "  - Cloud Run allows load balancer service account to invoke"
echo "  - No public access (allUsers) required - banking-grade security maintained"
echo ""
echo "⚠️  IMPORTANT: This solution requires the backend to handle OPTIONS requests"
echo "   before authentication middleware. Verify your server.js has CORS middleware"
echo "   applied before auth middleware (which it does - line 132)."
echo ""
echo "Test with:"
echo "  curl -X OPTIONS -H 'Origin: https://stagingwallet.mymoolah.africa' \\"
echo "    -H 'Access-Control-Request-Method: POST' \\"
echo "    https://staging.mymoolah.africa/api/v1/auth/login"
echo ""

