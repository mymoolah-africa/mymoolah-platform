# Staging OpenAI API Key Setup

**Date**: December 19, 2025  
**Issue**: Support engine not working in staging due to missing OpenAI API key  
**Status**: ✅ **FIXED** - Deployment scripts updated to use Secret Manager

---

## 🔍 **Problem Identified**

The support engine was not working in staging because:
- Deployment scripts were setting `OPENAI_API_KEY=sk-placeholder-not-configured`
- The support service requires a valid OpenAI API key to function
- Without a valid key, all support queries fail with "OpenAI not available"

---

## ✅ **Solution Applied**

### **1. Updated Deployment Scripts**

All staging deployment scripts now use the OpenAI API key from Secret Manager instead of a placeholder:

- ✅ `scripts/deploy-cloud-run-staging.sh`
- ✅ `scripts/build-push-deploy-staging.sh`
- ✅ `scripts/fresh-deploy-staging.sh`
- ✅ `scripts/nuclear-redeploy-staging.sh`

**Change**: Removed `OPENAI_API_KEY=sk-placeholder-not-configured` from `--set-env-vars`  
**Change**: Added `OPENAI_API_KEY=openai-api-key-staging:latest` to `--set-secrets`

### **2. Updated Secrets Setup Script**

Added `store_openai_api_key()` function to `scripts/setup-secrets-staging.sh` to help create the secret.

---

## 🚀 **Setup Instructions**

### **Option 1: Using the Setup Script (Recommended)**

```bash
# Set your OpenAI API key
export OPENAI_API_KEY='sk-proj-YOUR_ACTUAL_KEY_HERE'

# Run the setup script
./scripts/setup-secrets-staging.sh
```

The script will automatically create the `openai-api-key-staging` secret in Google Secret Manager.

### **Option 2: Manual Secret Creation**

If you prefer to create the secret manually:

```bash
# Create the secret
echo -n 'sk-proj-YOUR_ACTUAL_KEY_HERE' | gcloud secrets create openai-api-key-staging \
  --project=mymoolah-db \
  --data-file=-

# Or add a new version to existing secret
echo -n 'sk-proj-YOUR_ACTUAL_KEY_HERE' | gcloud secrets versions add openai-api-key-staging \
  --project=mymoolah-db \
  --data-file=-
```

### **Option 3: Using Google Cloud Console**

1. Go to [Google Cloud Console - Secret Manager](https://console.cloud.google.com/security/secret-manager?project=mymoolah-db)
2. Click **"CREATE SECRET"**
3. Name: `openai-api-key-staging`
4. Secret value: Your OpenAI API key (starts with `sk-proj-` or `sk-`)
5. Click **"CREATE SECRET"**

---

## 🔐 **Grant Service Account Access**

Ensure the Cloud Run service account has access to the secret:

```bash
# Grant access to the service account
gcloud secrets add-iam-policy-binding openai-api-key-staging \
  --project=mymoolah-db \
  --member="serviceAccount:mymoolah-staging-sa@mymoolah-db.iam.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor"
```

---

## ✅ **Verify Setup**

After creating the secret and deploying, verify the support engine is working:

```bash
# Get service URL
SERVICE_URL=$(gcloud run services describe mymoolah-backend-staging \
  --region africa-south1 \
  --format="value(status.url)")

# Test support health endpoint (requires auth token)
curl -H "Authorization: Bearer YOUR_TOKEN" \
  "${SERVICE_URL}/api/v1/support/health"
```

Expected response:
```json
{
  "success": true,
  "health": {
    "status": "healthy",
    "openai": {
      "available": true,
      "hasApiKey": true
    }
  }
}
```

---

## 📋 **Next Steps**

1. **Create the secret** using one of the methods above
2. **Grant service account access** to the secret
3. **Redeploy staging** using any of the deployment scripts:
   ```bash
   ./scripts/deploy-cloud-run-staging.sh
   # or
   ./scripts/build-push-deploy-staging.sh
   ```
4. **Test the support engine** in staging

---

## ⚠️ **Important Notes**

- **Never commit API keys** to git or expose them in logs
- **Use Secret Manager** for all sensitive credentials
- **Rotate keys regularly** for security
- **Monitor usage** in OpenAI dashboard to prevent unexpected costs

---

## 🔗 **Related Documentation**

- [OpenAI API Keys](https://platform.openai.com/account/api-keys)
- [Google Secret Manager](https://cloud.google.com/secret-manager/docs)
- [Banking Grade Support System](./BANKING_GRADE_SUPPORT_SYSTEM.md)

