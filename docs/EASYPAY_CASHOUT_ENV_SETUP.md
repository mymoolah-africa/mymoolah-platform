# EasyPay Cash-out Environment Variables Setup Guide

**Last Updated**: January 16, 2026  
**Feature**: Cash-out @ EasyPay  
**Status**: ✅ Ready for deployment

---

## 📋 **Overview**

This document provides step-by-step instructions for configuring EasyPay Cash-out environment variables across all environments:
- **Local Development** (`.env` file)
- **Codespaces (CS)** (`.env` file)
- **Staging** (GCP Secret Manager)
- **Production** (GCP Secret Manager)

---

## 🔧 **Required Environment Variables**

Add these variables to your environment configuration:

```bash
# =============================================================================
# EASYPAY CASH-OUT CONFIGURATION
# =============================================================================
# EasyPay Cash-out fees in cents (VAT Inclusive)
EASYPAY_CASHOUT_USER_FEE=800      # User transaction fee in cents (R8.00)
EASYPAY_CASHOUT_PROVIDER_FEE=500   # EasyPay provider fee in cents (R5.00)
EASYPAY_CASHOUT_MM_MARGIN=300      # MyMoolah revenue margin in cents (R3.00)
EASYPAY_CASHOUT_VAT_RATE=0.15      # VAT rate (15%)

# EasyPay Float Account IDs
EASYPAY_TOPUP_FLOAT_ID=easypay_topup
EASYPAY_CASHOUT_FLOAT_ID=easypay_cashout
```

---

## 🏠 **1. LOCAL DEVELOPMENT SETUP**

### **Step 1: Add Variables to Local `.env`**

```bash
cd /Users/andremacbookpro/mymoolah

# Open .env file
nano .env
# or
code .env
```

### **Step 2: Add Cash-out Configuration**

Add these lines to your local `.env` file:

```env
# =============================================================================
# EASYPAY CASH-OUT CONFIGURATION
# =============================================================================
EASYPAY_CASHOUT_USER_FEE=800
EASYPAY_CASHOUT_PROVIDER_FEE=500
EASYPAY_CASHOUT_MM_MARGIN=300
EASYPAY_CASHOUT_VAT_RATE=0.15
EASYPAY_TOPUP_FLOAT_ID=easypay_topup
EASYPAY_CASHOUT_FLOAT_ID=easypay_cashout
```

### **Step 3: Verify**

```bash
# Check if variables are set
grep EASYPAY_CASHOUT .env
```

---

## 💻 **2. CODESPACES (CS) SETUP**

### **⚠️ IMPORTANT: Manual Step Required**

Since `.env` files are **NOT committed to git** (they're in `.gitignore`), you must **manually add** these variables to your Codespaces `.env` file.

### **Step 1: Navigate to Codespaces**

Open your Codespaces environment in the browser.

### **Step 2: Update CS `.env` File**

```bash
cd /workspaces/mymoolah-platform

# Open .env file
nano .env
# or
code .env
```

### **Step 3: Add Cash-out Configuration**

Add these lines to your Codespaces `.env` file:

```env
# =============================================================================
# EASYPAY CASH-OUT CONFIGURATION
# =============================================================================
EASYPAY_CASHOUT_USER_FEE=800
EASYPAY_CASHOUT_PROVIDER_FEE=500
EASYPAY_CASHOUT_MM_MARGIN=300
EASYPAY_CASHOUT_VAT_RATE=0.15
EASYPAY_TOPUP_FLOAT_ID=easypay_topup
EASYPAY_CASHOUT_FLOAT_ID=easypay_cashout
```

### **Step 4: Verify**

```bash
# Check if variables are set
grep EASYPAY_CASHOUT .env

# Restart backend to load new variables
# (if backend is running, restart it)
```

### **Step 5: Test**

After adding variables and restarting backend:

```bash
# Test that variables are loaded
node -e "require('dotenv').config(); console.log('User Fee:', process.env.EASYPAY_CASHOUT_USER_FEE);"
```

---

## 🚀 **3. STAGING SETUP (GCP Secret Manager)**

### **Prerequisites**

- Access to GCP Console
- Permissions to create/update secrets in Secret Manager
- Project ID: `mymoolah-db` (or your staging project ID)

### **Step 1: Access GCP Secret Manager**

1. Open [GCP Console](https://console.cloud.google.com)
2. Navigate to **Secret Manager**
3. Select your staging project: `mymoolah-db`

### **Step 2: Create/Update Secrets**

For each environment variable, create or update a secret:

#### **Secret 1: `EASYPAY_CASHOUT_USER_FEE`**

```bash
# Using gcloud CLI (if available)
gcloud secrets create EASYPAY_CASHOUT_USER_FEE \
  --project=mymoolah-db \
  --data-file=- <<< "800"

# Or update if exists
gcloud secrets versions add EASYPAY_CASHOUT_USER_FEE \
  --project=mymoolah-db \
  --data-file=- <<< "800"
```

#### **Secret 2: `EASYPAY_CASHOUT_PROVIDER_FEE`**

```bash
gcloud secrets create EASYPAY_CASHOUT_PROVIDER_FEE \
  --project=mymoolah-db \
  --data-file=- <<< "500"

# Or update
gcloud secrets versions add EASYPAY_CASHOUT_PROVIDER_FEE \
  --project=mymoolah-db \
  --data-file=- <<< "500"
```

#### **Secret 3: `EASYPAY_CASHOUT_MM_MARGIN`**

```bash
gcloud secrets create EASYPAY_CASHOUT_MM_MARGIN \
  --project=mymoolah-db \
  --data-file=- <<< "300"

# Or update
gcloud secrets versions add EASYPAY_CASHOUT_MM_MARGIN \
  --project=mymoolah-db \
  --data-file=- <<< "300"
```

#### **Secret 4: `EASYPAY_CASHOUT_VAT_RATE`**

```bash
gcloud secrets create EASYPAY_CASHOUT_VAT_RATE \
  --project=mymoolah-db \
  --data-file=- <<< "0.15"

# Or update
gcloud secrets versions add EASYPAY_CASHOUT_VAT_RATE \
  --project=mymoolah-db \
  --data-file=- <<< "0.15"
```

#### **Secret 5: `EASYPAY_TOPUP_FLOAT_ID`**

```bash
gcloud secrets create EASYPAY_TOPUP_FLOAT_ID \
  --project=mymoolah-db \
  --data-file=- <<< "easypay_topup"

# Or update
gcloud secrets versions add EASYPAY_TOPUP_FLOAT_ID \
  --project=mymoolah-db \
  --data-file=- <<< "easypay_topup"
```

#### **Secret 6: `EASYPAY_CASHOUT_FLOAT_ID`**

```bash
gcloud secrets create EASYPAY_CASHOUT_FLOAT_ID \
  --project=mymoolah-db \
  --data-file=- <<< "easypay_cashout"

# Or update
gcloud secrets versions add EASYPAY_CASHOUT_FLOAT_ID \
  --project=mymoolah-db \
  --data-file=- <<< "easypay_cashout"
```

### **Step 3: Using GCP Console (Alternative)**

If you prefer using the web console:

1. Go to **Secret Manager** in GCP Console
2. Click **CREATE SECRET**
3. For each variable:
   - **Name**: `EASYPAY_CASHOUT_USER_FEE` (etc.)
   - **Secret value**: `800` (etc.)
   - Click **CREATE SECRET**

### **Step 4: Grant Access to Cloud Run/App Engine**

Ensure your Cloud Run service or App Engine has access to these secrets:

```bash
# Grant Secret Manager Secret Accessor role to Cloud Run service account
gcloud projects add-iam-policy-binding mymoolah-db \
  --member="serviceAccount:YOUR_SERVICE_ACCOUNT@mymoolah-db.iam.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor"
```

### **Step 5: Update Cloud Run/App Engine Configuration**

In your Cloud Run service or App Engine configuration, reference these secrets:

**Cloud Run (YAML):**

```yaml
env:
  - name: EASYPAY_CASHOUT_USER_FEE
    valueFrom:
      secretKeyRef:
        name: EASYPAY_CASHOUT_USER_FEE
        key: latest
  - name: EASYPAY_CASHOUT_PROVIDER_FEE
    valueFrom:
      secretKeyRef:
        name: EASYPAY_CASHOUT_PROVIDER_FEE
        key: latest
  # ... repeat for all variables
```

**Or using gcloud CLI:**

```bash
gcloud run services update mymoolah-backend \
  --project=mymoolah-db \
  --update-secrets=EASYPAY_CASHOUT_USER_FEE=EASYPAY_CASHOUT_USER_FEE:latest,EASYPAY_CASHOUT_PROVIDER_FEE=EASYPAY_CASHOUT_PROVIDER_FEE:latest,EASYPAY_CASHOUT_MM_MARGIN=EASYPAY_CASHOUT_MM_MARGIN:latest,EASYPAY_CASHOUT_VAT_RATE=EASYPAY_CASHOUT_VAT_RATE:latest,EASYPAY_TOPUP_FLOAT_ID=EASYPAY_TOPUP_FLOAT_ID:latest,EASYPAY_CASHOUT_FLOAT_ID=EASYPAY_CASHOUT_FLOAT_ID:latest
```

### **Step 6: Verify in Staging**

After deployment, verify secrets are loaded:

```bash
# Check Cloud Run logs
gcloud run services logs read mymoolah-backend --project=mymoolah-db --limit=50

# Or test via API (if you have a test endpoint)
curl https://your-staging-api.com/api/v1/health
```

---

## 🏭 **4. PRODUCTION SETUP**

Follow the same steps as **Staging Setup** but:

1. Use your **production project ID** (not `mymoolah-db`)
2. Use **production values** (same fee structure, but verify with business)
3. Ensure **production service account** has access
4. Test thoroughly before enabling in production

---

## ✅ **VERIFICATION CHECKLIST**

After setup in each environment:

- [ ] Variables added to `.env` (Local/CS) or Secret Manager (Staging/Prod)
- [ ] Backend restarted (if running)
- [ ] Variables loaded correctly (check logs)
- [ ] Cash-out voucher creation works
- [ ] Fee calculation correct (R8.00 user fee)
- [ ] Float account balance updates correctly

---

## 🔍 **TROUBLESHOOTING**

### **Issue: Variables not loading**

**Solution:**
```bash
# Check if variables are set
echo $EASYPAY_CASHOUT_USER_FEE

# Restart backend
# (stop and start your Node.js process)
```

### **Issue: Secret Manager access denied**

**Solution:**
```bash
# Grant Secret Accessor role
gcloud projects add-iam-policy-binding PROJECT_ID \
  --member="serviceAccount:SERVICE_ACCOUNT" \
  --role="roles/secretmanager.secretAccessor"
```

### **Issue: Wrong fee values**

**Solution:**
- Verify values in Secret Manager
- Check Cloud Run/App Engine environment configuration
- Restart service to reload secrets

---

## 📝 **NOTES**

- **Default Values**: If variables are not set, the code uses fallback values:
  - `EASYPAY_CASHOUT_USER_FEE`: 800 (R8.00)
  - `EASYPAY_CASHOUT_PROVIDER_FEE`: 500 (R5.00)
  - `EASYPAY_CASHOUT_MM_MARGIN`: 300 (R3.00)
  - `EASYPAY_CASHOUT_VAT_RATE`: 0.15 (15%)

- **VAT Inclusive**: All fees are VAT Inclusive. The system calculates VAT breakdown internally.

- **Float Account IDs**: These are used to identify which float account to use for operations.

---

## 🔗 **RELATED DOCUMENTATION**

- `env.template` - Environment variable template
- `docs/DEPLOYMENT_GUIDE.md` - General deployment guide
- `docs/CODESPACES_TESTING_REQUIREMENT.md` - Codespaces setup

---

**Last Updated**: January 16, 2026  
**Maintained By**: MyMoolah Development Team
