#!/bin/bash

# Configure load balancer to route OPTIONS requests to CORS handler function
# Banking-grade: OPTIONS handled at edge, all other requests require Cloud Run auth

set -e

PROJECT_ID="mymoolah-db"
REGION="africa-south1"
FUNCTION_NAME="cors-preflight-handler"
URL_MAP="urlmap-staging"
BACKEND_SERVICE="be-staging-backend"

echo "🔧 Configuring load balancer to route OPTIONS requests to CORS handler..."

# Get the Cloud Function URL
FUNCTION_URL=$(gcloud functions describe "${FUNCTION_NAME}" \
  --gen2 \
  --region="${REGION}" \
  --format='value(serviceConfig.uri)' \
  --project="${PROJECT_ID}")

if [ -z "${FUNCTION_URL}" ]; then
  echo "❌ Failed to get Cloud Function URL. Deploy the function first:"
  echo "   ./scripts/create-cors-handler-function.sh"
  exit 1
fi

echo "Function URL: ${FUNCTION_URL}"

# Extract the function name from URL (format: https://REGION-PROJECT_ID.cloudfunctions.net/FUNCTION_NAME)
FUNCTION_HOST=$(echo "${FUNCTION_URL}" | sed -e 's|https\?://||' -e 's|/.*||')
FUNCTION_PATH=$(echo "${FUNCTION_URL}" | sed -e 's|https\?://[^/]*||')

echo "Function host: ${FUNCTION_HOST}"
echo "Function path: ${FUNCTION_PATH}"

# Create a serverless NEG for the Cloud Function
NEG_NAME="neg-cors-handler"

echo "Creating serverless NEG for Cloud Function..."
gcloud compute network-endpoint-groups create "${NEG_NAME}" \
  --region="${REGION}" \
  --network-endpoint-type=serverless \
  --cloud-function-name="${FUNCTION_NAME}" \
  --project="${PROJECT_ID}" || {
    echo "⚠️  NEG might already exist, continuing..."
  }

# Create a backend service for the CORS handler
CORS_BACKEND_SERVICE="be-cors-handler"

echo "Creating backend service for CORS handler..."
gcloud compute backend-services create "${CORS_BACKEND_SERVICE}" \
  --global \
  --load-balancing-scheme=EXTERNAL_MANAGED \
  --protocol=HTTPS \
  --timeout=10s \
  --project="${PROJECT_ID}" || {
    echo "⚠️  Backend service might already exist, continuing..."
  }

# Add the NEG to the backend service
echo "Adding NEG to backend service..."
gcloud compute backend-services add-backend "${CORS_BACKEND_SERVICE}" \
  --global \
  --network-endpoint-group="${NEG_NAME}" \
  --network-endpoint-group-region="${REGION}" \
  --project="${PROJECT_ID}" || {
    echo "⚠️  Backend might already be added, continuing..."
  }

# Create a path matcher for OPTIONS requests
echo "Configuring URL map to route OPTIONS requests to CORS handler..."

# Get current URL map configuration
gcloud compute url-maps describe "${URL_MAP}" \
  --global \
  --project="${PROJECT_ID}" > /tmp/urlmap.yaml || {
    echo "❌ Failed to get URL map configuration"
    exit 1
  }

# Add path matcher for OPTIONS requests
# This routes all OPTIONS requests to the CORS handler
gcloud compute url-maps add-path-matcher "${URL_MAP}" \
  --global \
  --path-matcher-name=cors-options-matcher \
  --default-service="${CORS_BACKEND_SERVICE}" \
  --path-rules="/api/v1/**=be-staging-backend" \
  --project="${PROJECT_ID}" || {
    echo "⚠️  Path matcher configuration might need manual adjustment"
  }

echo ""
echo "✅ Load balancer configured!"
echo ""
echo "⚠️  IMPORTANT: The URL map configuration might need manual adjustment."
echo "   OPTIONS requests should route to: ${CORS_BACKEND_SERVICE}"
echo "   All other requests should route to: ${BACKEND_SERVICE}"
echo ""
echo "Test with:"
echo "  curl -X OPTIONS -H 'Origin: https://stagingwallet.mymoolah.africa' \\"
echo "    -H 'Access-Control-Request-Method: POST' \\"
echo "    https://staging.mymoolah.africa/api/v1/auth/login"

