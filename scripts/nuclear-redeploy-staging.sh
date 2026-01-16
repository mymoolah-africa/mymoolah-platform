#!/bin/bash
set -e

# ⚠️ DEPRECATED: This script is deprecated. Use ./scripts/build-push-deploy-staging.sh instead.
# The main deployment script (build-push-deploy-staging.sh) already builds without cache by default.
# Usage: ./scripts/build-push-deploy-staging.sh

# Nuclear redeploy script - rebuilds everything from scratch without cache
# Use this when you need a completely fresh deployment

cd /workspaces/mymoolah-platform

# Pull latest changes
git pull origin main

# 1. Build WITHOUT cache using Docker (then push)
echo "🔨 Building Docker image WITHOUT cache..."
docker build --no-cache --platform linux/amd64 \
  --tag gcr.io/mymoolah-db/mymoolah-backend:staging \
  -f Dockerfile .

# Push the image
docker push gcr.io/mymoolah-db/mymoolah-backend:staging

# 2. Deploy with ALL environment variables and secrets
echo ""
echo "🚀 Deploying fresh image to Cloud Run..."
gcloud run deploy mymoolah-backend-staging \
  --image gcr.io/mymoolah-db/mymoolah-backend:staging \
  --region africa-south1 \
  --project mymoolah-db \
  --service-account mymoolah-staging-sa@mymoolah-db.iam.gserviceaccount.com \
  --add-cloudsql-instances mymoolah-db:africa-south1:mmtp-pg-staging \
  --set-env-vars "NODE_ENV=production,STAGING=true,CLOUD_SQL_INSTANCE=mymoolah-db:africa-south1:mmtp-pg-staging,CORS_ORIGINS=https://stagingwallet.mymoolah.africa,DB_SSL=false,DB_HOST=/cloudsql/mymoolah-db:africa-south1:mmtp-pg-staging,DB_NAME=mymoolah_staging,DB_USER=mymoolah_app,MOBILEMART_LIVE_INTEGRATION=true,MOBILEMART_SCOPE=api,TLS_ENABLED=false" \
  --set-secrets "ZAPPER_API_URL=zapper-prod-api-url:latest,ZAPPER_ORG_ID=zapper-prod-org-id:latest,ZAPPER_API_TOKEN=zapper-prod-api-token:latest,ZAPPER_X_API_KEY=zapper-prod-x-api-key:latest,JWT_SECRET=jwt-secret-staging:latest,SESSION_SECRET=session-secret-staging:latest,DB_PASSWORD=db-mmtp-pg-staging-password:latest,MOBILEMART_CLIENT_ID=mobilemart-prod-client-id:latest,MOBILEMART_CLIENT_SECRET=mobilemart-prod-client-secret:latest,MOBILEMART_API_URL=mobilemart-prod-api-url:latest,MOBILEMART_TOKEN_URL=mobilemart-prod-token-url:latest,OPENAI_API_KEY=openai-api-key-staging:latest,EASYPAY_API_KEY=easypay-api-key-staging:latest" \
  --memory 1Gi \
  --cpu 1 \
  --min-instances 0 \
  --max-instances 10 \
  --timeout 300 \
  --concurrency 80 \
  --allow-unauthenticated \
  --port 8080

# 3. Verify deployment
echo ""
echo "📋 Checking for errors..."
LATEST_REVISION=$(gcloud run revisions list \
  --service=mymoolah-backend-staging \
  --region=africa-south1 \
  --project=mymoolah-db \
  --format="value(name)" \
  --limit=1)

echo "Latest revision: $LATEST_REVISION"
echo ""
echo "=== CHECK FOR ERRORS ==="
gcloud logging read "resource.type=cloud_run_revision AND resource.labels.service_name=mymoolah-backend-staging AND resource.labels.revision_name=$LATEST_REVISION AND severity>=ERROR" \
  --limit 10 \
  --format="table(timestamp,severity,textPayload)" \
  --project=mymoolah-db \
  --freshness=2m

echo ""
echo "=== CHECK FOR SSL ERRORS ==="
gcloud logging read "resource.type=cloud_run_revision AND resource.labels.service_name=mymoolah-backend-staging AND resource.labels.revision_name=$LATEST_REVISION AND textPayload:\"does not support SSL\"" \
  --limit 5 \
  --format="table(timestamp,severity,textPayload)" \
  --project=mymoolah-db \
  --freshness=2m

