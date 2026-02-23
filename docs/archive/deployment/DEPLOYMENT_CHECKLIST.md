# GCP Staging Deployment - Step-by-Step Checklist

**For**: André (andre@mymoolah.africa)
**Project**: mymoolah-db
**Date**: January 17, 2026 (Updated for EasyPay Standalone Voucher UI Improvements)

---

## ✅ Prerequisites (COMPLETED)

- [x] Docker Desktop installed and running
- [x] Google Cloud SDK installed
- [x] Authenticated with Google Cloud (`gcloud auth login`)
- [x] Project set to `mymoolah-db`
- [x] Docker configured for GCR (`gcloud auth configure-docker gcr.io`)

---

## 📋 Deployment Steps (Run in Order)

### Step 1: Database Setup
```bash
cd /Users/andremacbookpro/mymoolah
./scripts/setup-staging-database.sh
```

**What it does**:
- Creates `mymoolah_staging` database
- Creates `mymoolah_app` user
- Generates banking-grade password
- Stores password in Secret Manager

**Expected time**: 2-5 minutes

**Check for success**: Should see "✅ Staging database setup complete!"

---

### Step 2: Secrets Setup
```bash
./scripts/setup-secrets-staging.sh
```

**What it does**:
- Stores Zapper production credentials in Secret Manager
- Generates JWT and session secrets
- Creates database URL template

**Expected time**: 1-2 minutes

**Check for success**: Should see list of all secrets created

---

### Step 3: Service Account Setup
```bash
./scripts/create-cloud-run-service-account.sh
```

**What it does**:
- Creates IAM service account: `mymoolah-staging-sa`
- Grants necessary permissions (Secret Manager, Cloud SQL, Logging, Monitoring)

**Expected time**: 30 seconds

**Check for success**: Should see "✅ Service account setup complete!"

---

### Step 4: Build and Push Docker Image
```bash
./scripts/build-and-push-docker.sh
```

**What it does**:
- Builds Docker image from `Dockerfile`
- Pushes to Google Container Registry
- Image: `gcr.io/mymoolah-db/mymoolah-backend:latest`

**Expected time**: 5-10 minutes (first time, faster after)

**Check for success**: Should see "✅ Docker image ready for deployment!"

**Note**: This step takes the longest. Be patient!

---

### Step 5: Deploy to Cloud Run
```bash
./scripts/deploy-cloud-run-staging.sh
```

**What it does**:
- Deploys Cloud Run service
- Configures environment variables and secrets
- Sets up Cloud SQL connection
- Service URL will be displayed

**Expected time**: 2-3 minutes

**Check for success**: Should see service URL (e.g., `https://mymoolah-backend-staging-xxxxx.a.run.app`)

---

### Step 6: Run Database Migrations
```bash
./scripts/run-migrations-staging.sh
```

**What it does**:
- Starts Cloud SQL Auth Proxy
- Connects to staging database
- Runs all Sequelize migrations
- Creates all required tables

**Expected time**: 2-5 minutes

**Check for success**: Should see "✅ Migrations complete!" with table count

---

### Step 6.5: Reconciliation System Setup (NEW - January 2026)
```bash
# Verify reconciliation tables created
node -e "
const { Sequelize } = require('sequelize');
require('dotenv').config();
const { getStagingDatabaseURL } = require('./scripts/db-connection-helper');
(async () => {
  const sequelize = new Sequelize(getStagingDatabaseURL(), { logging: false });
  const [tables] = await sequelize.query(\`
    SELECT table_name FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name LIKE 'recon_%'
    ORDER BY table_name;
  \`);
  console.log('✅ Reconciliation Tables:', tables.map(t => t.table_name));
  process.exit(0);
})();
"
```

**What it does**:
- Verifies 4 reconciliation tables exist:
  - `recon_supplier_configs`
  - `recon_runs`
  - `recon_transaction_matches`
  - `recon_audit_trail`
- Confirms MobileMart and Flash pre-configuration

**Expected time**: 30 seconds

**Check for success**: Should see all 4 reconciliation tables listed, and both MobileMart and Flash suppliers configured

**Optional - Configure SFTP Access**:
```bash
# Add supplier SSH public keys (when received)
# MobileMart SFTP configuration
gcloud compute firewall-rules create allow-mobilemart-sftp \
  --allow=tcp:22 \
  --source-ranges=MOBILEMART_IP_RANGE \
  --target-tags=sftp-1-deployment

# Flash SFTP configuration
gcloud compute firewall-rules create allow-flash-sftp \
  --allow=tcp:22 \
  --source-ranges=FLASH_IP_RANGE \
  --target-tags=sftp-1-deployment

# Verify SFTP gateway static IP
gcloud compute addresses describe sftp-gateway-static-ip \
  --region=africa-south1
# Should show: 34.35.137.166
```

**Flash Reconciliation Verification**:
```bash
# Verify Flash configuration
node scripts/verify-flash-recon-config.js

# Verify both suppliers using static IP
node scripts/verify-recon-sftp-configs.js
```

**Optional - Configure Email Alerts**:
```bash
# Add SMTP credentials to Secret Manager
gcloud secrets create recon-smtp-password \
  --data-file=- <<< "your-smtp-password"

# Update Cloud Run service with SMTP environment variables
gcloud run services update mymoolah-backend-staging \
  --set-env-vars="SMTP_HOST=smtp.gmail.com,SMTP_PORT=587,SMTP_USER=alerts@mymoolah.africa" \
  --set-secrets="SMTP_PASS=recon-smtp-password:latest"
```

---

### Step 7: Test Service
```bash
./scripts/test-staging-service.sh
```

**What it does**:
- Tests health endpoint
- Tests API docs endpoint
- Tests Zapper status endpoint (if available)

**Expected time**: 30 seconds

**Check for success**: Should see "✅ Service testing complete!"

---

## 🎯 After Deployment

### Get Service URL
```bash
gcloud run services describe mymoolah-backend-staging \
  --region africa-south1 \
  --format 'value(status.url)'
```

### Test Health Endpoint
```bash
SERVICE_URL=$(gcloud run services describe mymoolah-backend-staging \
  --region africa-south1 \
  --format 'value(status.url)')

curl ${SERVICE_URL}/health
```

### View Logs
```bash
gcloud run services logs read mymoolah-backend-staging \
  --region africa-south1 \
  --limit 50
```

---

## ⚠️ Troubleshooting

### If a script fails:
1. Read the error message carefully
2. Check the prerequisites are met
3. Verify you're authenticated: `gcloud auth list`
4. Verify project is set: `gcloud config get-value project`
5. Check Cloud SQL instance status in GCP Console

### Common Issues:

**"Permission denied"**:
- Make sure scripts are executable: `chmod +x scripts/*.sh`

**"Instance not found"**:
- Check Cloud SQL instance exists: `gcloud sql instances list`
- Wait if instance is still being created

**"Secret not found"**:
- Make sure you ran scripts in order
- Check secrets exist: `gcloud secrets list`

**"Docker build failed"**:
- Make sure Docker Desktop is running
- Check you have enough disk space

---

## 📞 Need Help?

If you get stuck:
1. Check the error message
2. Review `docs/GCP_STAGING_DEPLOYMENT.md` for detailed troubleshooting
3. Check Cloud Run logs for service errors
4. Verify all prerequisites are met

---

**Ready to start?** Run Step 1: `./scripts/setup-staging-database.sh`

