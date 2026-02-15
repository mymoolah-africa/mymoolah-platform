#!/usr/bin/env bash
set -euo pipefail

# Deploy backend to production using existing image
# Usage: ./scripts/deploy-backend-production-direct.sh

PROJECT_ID="mymoolah-db"
REGION="africa-south1"
SERVICE_NAME="mymoolah-backend-production"
SERVICE_ACCOUNT="mymoolah-production-sa@${PROJECT_ID}.iam.gserviceaccount.com"
CLOUD_SQL_INSTANCE="mymoolah-db:${REGION}:mmtp-pg-production"
IMAGE_NAME="gcr.io/${PROJECT_ID}/mymoolah-backend:20260215-0520"

echo "Deploying ${SERVICE_NAME} with image ${IMAGE_NAME}"

gcloud run deploy "${SERVICE_NAME}" \
  --image "${IMAGE_NAME}" \
  --platform managed \
  --region "${REGION}" \
  --service-account "${SERVICE_ACCOUNT}" \
  --add-cloudsql-instances "${CLOUD_SQL_INSTANCE}" \
  --set-env-vars "NODE_ENV=production,STAGING=false,CLOUD_SQL_INSTANCE=${CLOUD_SQL_INSTANCE},CORS_ORIGINS=https://wallet.mymoolah.africa,https://prodwallet.mymoolah.africa,DB_SSL=false,DB_HOST=/cloudsql/${CLOUD_SQL_INSTANCE},DB_NAME=mymoolah_production,DB_USER=mymoolah_app,MOBILEMART_LIVE_INTEGRATION=true,MOBILEMART_SCOPE=api,TLS_ENABLED=false,VAT_RATE=0.15,LEDGER_ACCOUNT_MM_COMMISSION_CLEARING=2200-01-01,LEDGER_ACCOUNT_COMMISSION_REVENUE=4000-10-01,LEDGER_ACCOUNT_VAT_CONTROL=2300-10-01,LEDGER_ACCOUNT_CLIENT_FLOAT=2100-01-01,LEDGER_ACCOUNT_CLIENT_CLEARING=2100-02-01,LEDGER_ACCOUNT_SUPPLIER_CLEARING=2200-02-01,LEDGER_ACCOUNT_INTERCHANGE=1200-05-01,LEDGER_ACCOUNT_BANK=1100-01-01,LEDGER_ACCOUNT_TRANSACTION_FEE_REVENUE=4000-20-01" \
  --set-secrets "DATABASE_URL=database-url-production:latest,ZAPPER_API_URL=zapper-prod-api-url:latest,ZAPPER_ORG_ID=zapper-prod-org-id:latest,ZAPPER_API_TOKEN=zapper-prod-api-token:latest,ZAPPER_X_API_KEY=zapper-prod-x-api-key:latest,JWT_SECRET=jwt-secret-production:latest,SESSION_SECRET=session-secret-production:latest,DB_PASSWORD=db-mmtp-pg-production-password:latest,MOBILEMART_CLIENT_ID=mobilemart-prod-client-id:latest,MOBILEMART_CLIENT_SECRET=mobilemart-prod-client-secret:latest,MOBILEMART_API_URL=mobilemart-prod-api-url:latest,MOBILEMART_TOKEN_URL=mobilemart-prod-token-url:latest" \
  --memory 1Gi \
  --cpu 1 \
  --min-instances 0 \
  --max-instances 10 \
  --timeout 300 \
  --concurrency 80 \
  --allow-unauthenticated \
  --port 8080

echo "Deploy complete"
gcloud run services describe "${SERVICE_NAME}" --region "${REGION}" --format="value(status.url)"
