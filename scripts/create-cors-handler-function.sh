#!/bin/bash

# Create Cloud Function to handle CORS preflight OPTIONS requests
# This bypasses Cloud Run IAM for OPTIONS requests only

set -e

PROJECT_ID="mymoolah-db"
REGION="africa-south1"
FUNCTION_NAME="cors-preflight-handler"
SERVICE_ACCOUNT="mymoolah-staging-sa@${PROJECT_ID}.iam.gserviceaccount.com"

echo "🚀 Creating CORS preflight handler Cloud Function..."

# Create a temporary directory for the function code
TEMP_DIR=$(mktemp -d)
cd "${TEMP_DIR}"

# Create package.json
cat > package.json <<EOF
{
  "name": "cors-preflight-handler",
  "version": "1.0.0",
  "main": "index.js",
  "dependencies": {}
}
EOF

# Create index.js - handles OPTIONS requests with CORS headers
cat > index.js <<'EOF'
/**
 * Cloud Function to handle CORS preflight OPTIONS requests
 * Banking-grade: Only handles OPTIONS (metadata), all other requests go to Cloud Run with auth
 */
exports.handleCorsPreflight = (req, res) => {
  // Only handle OPTIONS requests
  if (req.method !== 'OPTIONS') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Get origin from request
  const origin = req.headers.origin || req.headers.Origin || '';
  
  // List of allowed origins (banking-grade: explicit allowlist)
  const allowedOrigins = [
    'https://stagingwallet.mymoolah.africa',
    'https://mymoolah.com',
    'https://www.mymoolah.com',
    'https://app.mymoolah.com'
  ];

  // Check if origin is allowed
  const isAllowed = allowedOrigins.includes(origin) || 
                    origin.match(/^https:\/\/.*\.(app\.github\.dev|github\.dev)$/);

  if (!isAllowed && origin) {
    return res.status(403).json({ error: 'Origin not allowed' });
  }

  // Set CORS headers
  const headers = {
    'Access-Control-Allow-Origin': origin || '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With, X-API-Key, X-Client-Version, X-Device-ID',
    'Access-Control-Allow-Credentials': 'true',
    'Access-Control-Max-Age': '86400' // 24 hours
  };

  // Set all headers
  Object.keys(headers).forEach(key => {
    res.set(key, headers[key]);
  });

  // Respond with 204 No Content (standard for OPTIONS)
  res.status(204).send();
};
EOF

# Deploy the Cloud Function
gcloud functions deploy "${FUNCTION_NAME}" \
  --gen2 \
  --runtime=nodejs20 \
  --region="${REGION}" \
  --source=. \
  --entry-point=handleCorsPreflight \
  --trigger-http \
  --allow-unauthenticated \
  --service-account="${SERVICE_ACCOUNT}" \
  --project="${PROJECT_ID}" \
  --cpu=1 \
  --memory=512Mi \
  --timeout=10s \
  --max-instances=10 \
  --min-instances=0 || {
    echo "❌ Failed to deploy Cloud Function"
    rm -rf "${TEMP_DIR}"
    exit 1
  }

# Get the function URL
FUNCTION_URL=$(gcloud functions describe "${FUNCTION_NAME}" \
  --gen2 \
  --region="${REGION}" \
  --format='value(serviceConfig.uri)' \
  --project="${PROJECT_ID}")

echo ""
echo "✅ Cloud Function deployed successfully!"
echo "Function URL: ${FUNCTION_URL}"
echo ""
echo "Next step: Configure load balancer to route OPTIONS requests to this function"
echo "Run: ./scripts/configure-load-balancer-cors.sh"

# Cleanup
rm -rf "${TEMP_DIR}"

