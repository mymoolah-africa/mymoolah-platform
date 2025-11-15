# MyMoolah Treasury Platform - Google Cloud Staging Deployment Guide

**Date**: November 15, 2025  
**Status**: ✅ **DEPLOYMENT SCRIPTS READY**  
**Architecture**: Banking-Grade, Mojaloop-Compliant, Cost-Optimized

---

## Overview

This guide provides step-by-step instructions for deploying the entire MyMoolah Treasury Platform (MMTP) to Google Cloud Staging environment. The deployment follows global banking standards and Mojaloop FSPIOP compliance, with cost-optimized resources that scale automatically.

---

## Architecture Principles

### Banking-Grade Security (Mojaloop FSPIOP Compliant)
- **TLS 1.3** enforcement for all connections
- **Encryption at rest** for databases and secrets
- **IAM-based authentication** (no password-based access)
- **Private networking** where possible (VPC, Private IP)
- **Secret Manager** for all credentials (no hardcoded secrets)
- **Audit logging** for all operations
- **Network segmentation** (staging/production isolation)
- **DDoS protection** via Cloud Armor
- **WAF** (Web Application Firewall) rules
- **Rate limiting** at multiple layers

### Performance & Scalability
- **Horizontal auto-scaling** (Cloud Run: 0 to N instances)
- **Database connection pooling** (optimized for high concurrency)
- **Redis caching** (Cloud Memorystore) for hot data
- **CDN** for static assets (Cloud CDN)
- **Load balancing** (Cloud Load Balancer)
- **Database read replicas** (when needed for scale)

### Cost Optimization (Start Light, Scale Smart)
- **Cloud Run**: Pay-per-request (scale to zero when idle)
- **Database**: Start with smallest tier, auto-scale storage
- **Redis**: Start with basic tier, scale as needed
- **CDN**: Pay only for data transfer
- **Auto-scaling**: Scale down during low traffic

---

## Prerequisites

1. **Google Cloud SDK** installed and configured
2. **Docker** installed and running
3. **Node.js 18+** and npm installed
4. **PostgreSQL client** (psql) installed
5. **gcloud authenticated**: `gcloud auth login`
6. **Project set**: `gcloud config set project mymoolah-db`

---

## Deployment Steps

### Step 1: Complete Staging Database Setup

**Script**: `scripts/setup-staging-database.sh`

This script:
- Verifies the Cloud SQL instance is ready
- Creates the `mymoolah_staging` database
- Creates the `mymoolah_app` user
- Generates a banking-grade password (32+ characters)
- Stores the password in Secret Manager

**Run**:
```bash
./scripts/setup-staging-database.sh
```

**Expected Output**:
- Database created
- User created
- Password stored in Secret Manager: `db-mmtp-pg-staging-password`

---

### Step 2: Store All Secrets in Secret Manager

**Script**: `scripts/setup-secrets-staging.sh`

This script stores:
- Zapper production credentials (org-id, api-token, x-api-key, api-url)
- JWT secret (generated if not provided)
- Session secret (generated if not provided)
- Database URL template

**Run**:
```bash
./scripts/setup-secrets-staging.sh
```

**Environment Variables** (optional):
- `JWT_SECRET`: Custom JWT secret (64+ characters)
- `SESSION_SECRET`: Custom session secret (64+ characters)

**Expected Output**:
- All secrets created in Secret Manager
- Secrets list displayed

---

### Step 3: Create Cloud Run Service Account

**Script**: `scripts/create-cloud-run-service-account.sh`

This script:
- Creates service account: `mymoolah-staging-sa`
- Grants IAM roles:
  - `roles/secretmanager.secretAccessor` (Read secrets)
  - `roles/cloudsql.client` (Connect to Cloud SQL)
  - `roles/run.invoker` (Invoke Cloud Run services)
  - `roles/logging.logWriter` (Write logs)
  - `roles/monitoring.metricWriter` (Write metrics)

**Run**:
```bash
./scripts/create-cloud-run-service-account.sh
```

**Expected Output**:
- Service account created
- IAM roles granted

---

### Step 4: Build and Push Docker Image

**Script**: `scripts/build-and-push-docker.sh`

This script:
- Builds Docker image from `Dockerfile`
- Tags image for Google Container Registry
- Pushes image to GCR

**Run**:
```bash
./scripts/build-and-push-docker.sh [tag]
```

**Default tag**: `latest`

**Expected Output**:
- Docker image built
- Image pushed to: `gcr.io/mymoolah-db/mymoolah-backend:latest`

---

### Step 5: Deploy Cloud Run Service

**Script**: `scripts/deploy-cloud-run-staging.sh`

This script:
- Deploys Cloud Run service with cost-optimized configuration
- Configures environment variables and secrets
- Sets up Cloud SQL connection
- Constructs DATABASE_URL from secrets

**Configuration**:
- **CPU**: 1 vCPU
- **Memory**: 1Gi
- **Min Instances**: 0 (scale to zero)
- **Max Instances**: 10
- **Concurrency**: 80 requests/instance
- **Timeout**: 300s

**Run**:
```bash
./scripts/deploy-cloud-run-staging.sh
```

**Expected Output**:
- Service deployed
- Service URL displayed
- Configuration summary

---

### Step 6: Run Database Migrations

**Script**: `scripts/run-migrations-staging.sh`

This script:
- Starts Cloud SQL Auth Proxy
- Connects to staging database
- Runs Sequelize migrations
- Verifies migrations completed

**Run**:
```bash
./scripts/run-migrations-staging.sh
```

**Expected Output**:
- All migrations completed
- Table count displayed
- Key tables listed

---

### Step 7: Test Staging Service

**Script**: `scripts/test-staging-service.sh`

This script:
- Gets service URL
- Tests health endpoint
- Tests API docs endpoint
- Tests Zapper status endpoint (if available)

**Run**:
```bash
./scripts/test-staging-service.sh
```

**Expected Output**:
- Health check passed
- Service URL displayed
- Test results

---

## Manual Testing

### Test Health Endpoint
```bash
SERVICE_URL=$(gcloud run services describe mymoolah-backend-staging \
  --region africa-south1 \
  --format 'value(status.url)')

curl ${SERVICE_URL}/health
```

### Test Zapper Authentication
```bash
# Get service URL
SERVICE_URL=$(gcloud run services describe mymoolah-backend-staging \
  --region africa-south1 \
  --format 'value(status.url)')

# Test Zapper status (may require authentication)
curl ${SERVICE_URL}/api/v1/zapper/status
```

### Test QR Code Decoding
Use the frontend or API to scan and decode real merchant QR codes.

---

## Configuration Details

### Cloud Run Service Configuration

**Service Name**: `mymoolah-backend-staging`  
**Region**: `africa-south1`  
**Service Account**: `mymoolah-staging-sa@mymoolah-db.iam.gserviceaccount.com`

**Environment Variables**:
- `NODE_ENV=staging`
- `PORT=8080`

**Secrets** (from Secret Manager):
- `ZAPPER_API_URL=zapper-prod-api-url:latest`
- `ZAPPER_ORG_ID=zapper-prod-org-id:latest`
- `ZAPPER_API_TOKEN=zapper-prod-api-token:latest`
- `ZAPPER_X_API_KEY=zapper-prod-x-api-key:latest`
- `JWT_SECRET=jwt-secret-staging:latest`
- `SESSION_SECRET=session-secret-staging:latest`
- `DB_PASSWORD=db-mmtp-pg-staging-password:latest`

**DATABASE_URL**: Constructed at runtime from `DB_PASSWORD` secret

### Database Configuration

**Instance**: `mmtp-pg-staging`  
**Database**: `mymoolah_staging`  
**User**: `mymoolah_app`  
**Connection**: Via Cloud SQL Auth Proxy (Unix socket in Cloud Run)

---

## Troubleshooting

### Service Not Starting
1. Check Cloud Run logs: `gcloud run services logs read mymoolah-backend-staging --region africa-south1`
2. Verify secrets are accessible
3. Check service account permissions
4. Verify DATABASE_URL is correctly constructed

### Database Connection Issues
1. Verify Cloud SQL instance is running
2. Check service account has `roles/cloudsql.client`
3. Verify DATABASE_URL format
4. Check Cloud SQL Auth Proxy logs

### Secret Access Issues
1. Verify service account has `roles/secretmanager.secretAccessor`
2. Check secret names match exactly
3. Verify secrets exist in Secret Manager

---

## Cost Optimization Tips

1. **Scale to Zero**: Min instances set to 0 (service scales down when idle)
2. **Right-Sizing**: Start with 1 vCPU, 1Gi memory (increase if needed)
3. **Auto-Scaling**: Max instances set to 10 (increase for high traffic)
4. **Database**: Use smallest tier initially, auto-scale storage
5. **Monitoring**: Essential metrics only initially

---

## Scaling Guidelines

### When to Scale Up

**CPU/Memory**:
- CPU utilization consistently > 70%
- Memory usage consistently > 80%
- Response times increasing

**Instances**:
- Request queue building up
- High latency during peak times
- Error rates increasing

**Database**:
- Query times > 50ms consistently
- Connection pool exhausted
- Storage approaching limits

### Scaling Commands

```bash
# Increase Cloud Run memory
gcloud run services update mymoolah-backend-staging \
  --region africa-south1 \
  --memory 2Gi

# Increase max instances
gcloud run services update mymoolah-backend-staging \
  --region africa-south1 \
  --max-instances 20

# Increase database tier (requires instance restart)
gcloud sql instances patch mmtp-pg-staging \
  --tier=db-custom-2-7680
```

---

## Security Checklist

- [x] All secrets in Secret Manager
- [x] IAM service account (no user credentials)
- [x] TLS 1.3 enforced (Cloud Run default)
- [x] SSL required for database
- [x] Non-root user in Docker
- [x] Least privilege IAM roles
- [x] Audit logging enabled
- [x] Network isolation (staging/production)

---

## Next Steps

1. **Complete Testing**: Test all integrations with production credentials
2. **Frontend Deployment**: Deploy frontend to Cloud Run or Cloud Storage + CDN
3. **Monitoring Setup**: Configure alerts and dashboards
4. **Production Deployment**: Repeat process for production environment
5. **Documentation**: Update all documentation with staging URLs and procedures

---

## Support

For issues or questions:
1. Check Cloud Run logs
2. Check Cloud SQL logs
3. Review Secret Manager access logs
4. Check IAM permissions
5. Review this documentation

---

**Last Updated**: November 15, 2025  
**Version**: 1.0.0

