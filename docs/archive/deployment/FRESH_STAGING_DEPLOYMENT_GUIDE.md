# Fresh Staging Deployment Guide

**Last Updated**: December 2, 2025  
**Purpose**: Build a completely fresh Docker image (no cache) and deploy to Staging Cloud Run

---

## 🎯 Overview

This guide helps you build a **completely fresh Docker image** without using any cache, ensuring all latest code changes are included, and deploy it to Staging Cloud Run.

**When to use this:**
- After significant code changes
- When you suspect cached builds are causing issues
- When you want to ensure 100% fresh deployment
- Before important testing sessions

---

## 🚀 Quick Start

### One-Command Deployment

```bash
./scripts/fresh-deploy-staging.sh
```

This single command will:
1. ✅ Clean Docker cache
2. ✅ Build fresh image (NO CACHE)
3. ✅ Push to Google Container Registry
4. ✅ Deploy to Cloud Run Staging
5. ✅ Verify deployment health

---

## 📋 Prerequisites

1. **Google Cloud Authentication**
   ```bash
   gcloud auth login
   gcloud config set project mymoolah-db
   ```

2. **Docker Running**
   ```bash
   # Check Docker is running
   docker info
   ```

3. **Required Permissions**
   - Cloud Run Admin
   - Cloud SQL Client
   - Secret Manager Secret Accessor
   - Storage Admin (for GCR)

---

## 🔧 Step-by-Step Process

### Step 1: Clean Docker Cache (Optional - Script Does This)

The script automatically cleans Docker cache, but you can do it manually:

```bash
# Remove all unused Docker resources
docker system prune -a --volumes -f
```

### Step 2: Build Fresh Image

The script builds with `--no-cache` flag:

```bash
docker buildx build \
  --platform linux/amd64 \
  --no-cache \
  --tag gcr.io/mymoolah-db/mymoolah-backend:latest \
  --file Dockerfile \
  --push \
  .
```

**⚠️ Important**: Building without cache takes **significantly longer** (5-15 minutes vs 2-5 minutes with cache).

### Step 3: Deploy to Cloud Run

The script automatically deploys with all required configuration:

- **Service**: `mymoolah-backend-staging`
- **Region**: `africa-south1`
- **Image**: `gcr.io/mymoolah-db/mymoolah-backend:latest`
- **Resources**: 1 CPU, 1Gi memory
- **Scaling**: 0-10 instances
- **All secrets and environment variables configured**

### Step 4: Verify Deployment

The script automatically:
- ✅ Checks service health endpoint
- ✅ Checks for errors in logs
- ✅ Reports service URL and revision

---

## 📊 What Gets Deployed

### Environment Variables
- `NODE_ENV=production`
- `STAGING=true`
- `CLOUD_SQL_INSTANCE=mymoolah-db:africa-south1:mmtp-pg-staging`
- `CORS_ORIGINS=https://stagingwallet.mymoolah.africa`
- `DB_SSL=false`
- `DB_HOST=/cloudsql/mymoolah-db:africa-south1:mmtp-pg-staging`
- `DB_NAME=mymoolah_staging`
- `DB_USER=mymoolah_app`
- `MOBILEMART_LIVE_INTEGRATION=true`
- `MOBILEMART_SCOPE=api`
- `TLS_ENABLED=false`
- `OPENAI_API_KEY=sk-placeholder-not-configured`

### Secrets (from Secret Manager)
- `ZAPPER_API_URL`
- `ZAPPER_ORG_ID`
- `ZAPPER_API_TOKEN`
- `ZAPPER_X_API_KEY`
- `JWT_SECRET`
- `SESSION_SECRET`
- `DB_PASSWORD`
- `MOBILEMART_CLIENT_ID`
- `MOBILEMART_CLIENT_SECRET`
- `MOBILEMART_API_URL`
- `MOBILEMART_TOKEN_URL`

### Cloud SQL Connection
- **Instance**: `mymoolah-db:africa-south1:mmtp-pg-staging`
- **Connection**: Unix socket (secure, no SSL needed)
- **Database**: `mymoolah_staging`
- **User**: `mymoolah_app`

---

## ✅ Post-Deployment Steps

### 1. Verify Service Health

```bash
# Get service URL
SERVICE_URL=$(gcloud run services describe mymoolah-backend-staging \
  --region africa-south1 \
  --format="value(status.url)")

# Test health endpoint
curl "${SERVICE_URL}/health"
```

Expected response:
```json
{"status":"ok","timestamp":"2025-12-02T..."}
```

### 2. Run Database Migrations

After deployment, sync Staging database with UAT:

```bash
# Sync database schema
node scripts/sync-staging-to-uat.js

# Or run migrations directly
./scripts/run-migrations-staging.sh
```

### 3. Test Critical Endpoints

```bash
# Health check
curl "${SERVICE_URL}/health"

# Zapper health
curl "${SERVICE_URL}/api/v1/zapper/health"

# MobileMart health
curl "${SERVICE_URL}/api/v1/mobilemart/health"
```

### 4. Check Logs

```bash
# View recent logs
gcloud logging read \
  "resource.type=cloud_run_revision AND resource.labels.service_name=mymoolah-backend-staging" \
  --limit=50 \
  --format=json

# View errors only
gcloud logging read \
  "resource.type=cloud_run_revision AND resource.labels.service_name=mymoolah-backend-staging AND severity>=ERROR" \
  --limit=20
```

---

## ⚠️ Troubleshooting

### Error: "Docker build failed"
**Solution**: 
- Check Docker has enough disk space: `df -h`
- Clean Docker: `docker system prune -a --volumes -f`
- Check Dockerfile syntax: `docker build --dry-run .`

### Error: "Failed to push to GCR"
**Solution**:
- Verify GCR authentication: `gcloud auth configure-docker gcr.io`
- Check project permissions: `gcloud projects get-iam-policy mymoolah-db`
- Verify image name format: `gcr.io/mymoolah-db/mymoolah-backend:latest`

### Error: "Cloud Run deployment failed"
**Solution**:
- Check service account exists: `gcloud iam service-accounts describe mymoolah-staging-sa@mymoolah-db.iam.gserviceaccount.com`
- Verify Cloud SQL instance: `gcloud sql instances describe mmtp-pg-staging`
- Check secrets exist: `gcloud secrets list`

### Error: "Service health check failed"
**Solution**:
- Wait 30-60 seconds for service to fully start
- Check logs for startup errors
- Verify DATABASE_URL is correctly constructed
- Check Cloud SQL connection is working

### Build Takes Too Long
**Normal**: Building without cache takes 5-15 minutes. This is expected.

**If it's taking >20 minutes**:
- Check network connection
- Verify Docker has enough resources
- Check if Docker buildx is working: `docker buildx version`

---

## 🔄 Comparison: Fresh vs Cached Build

| Aspect | Fresh Build (No Cache) | Cached Build |
|--------|------------------------|--------------|
| **Build Time** | 5-15 minutes | 2-5 minutes |
| **Disk Space** | Uses more (rebuilds everything) | Uses less (reuses layers) |
| **Certainty** | 100% fresh, all changes included | May miss some changes |
| **When to Use** | After major changes, before testing | Regular deployments |
| **Command** | `./scripts/fresh-deploy-staging.sh` | `./scripts/build-and-push-docker.sh` |

---

## 📝 Today's Specific Deployment (Dec 2, 2025)

Today we worked on **Phase 1: E.164 Standardization**. This deployment includes:

1. ✅ **New MSISDN utility** (`utils/msisdn.js`)
2. ✅ **Updated models** (User, Beneficiary with E.164 validation)
3. ✅ **Updated controllers** (authController, walletController)
4. ✅ **Updated services** (UnifiedBeneficiaryService)
5. ✅ **Transaction history fix** (walletController.js)
6. ✅ **Request money fixes** (RequestMoneyPage.tsx)

**After deployment, you must:**
1. Run database migrations (4 new migrations from today)
2. Sync database schema with UAT
3. Test all critical flows

---

## 🎯 Success Criteria

Deployment is successful when:

- ✅ Docker image built and pushed to GCR
- ✅ Cloud Run service deployed
- ✅ Health endpoint returns 200 OK
- ✅ No errors in deployment logs
- ✅ Service URL is accessible
- ✅ Database migrations can run
- ✅ Critical endpoints respond correctly

---

## 📚 Related Scripts

- `scripts/fresh-deploy-staging.sh` - **This script** (fresh build + deploy)
- `scripts/build-and-push-docker.sh` - Build with cache
- `scripts/deploy-cloud-run-staging.sh` - Deploy existing image
- `scripts/sync-staging-to-uat.js` - Sync database schema
- `scripts/run-migrations-staging.sh` - Run database migrations

---

## 🚨 Important Notes

1. **Build Time**: Fresh builds take longer - be patient
2. **Cost**: No additional cost for fresh builds (same Cloud Run pricing)
3. **Downtime**: Cloud Run handles zero-downtime deployments automatically
4. **Rollback**: Previous revision remains available for rollback if needed
5. **Migrations**: Always run migrations after deployment

---

**Last Deployment**: December 2, 2025  
**Next Deployment**: After code changes or before testing
