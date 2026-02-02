# Flash API Credentials Setup Guide

**Date**: 2026-02-01  
**Status**: ✅ Credentials Configured  
**Environment**: Staging & Production

---

## ✅ **Credentials Summary**

| Credential | Value | Status |
|------------|-------|--------|
| **Consumer Key** | `15hIRiL5U2u09M9aDJPrdWp7Twka` | ✅ Added to .env files |
| **Consumer Secret** | `wmysn59gzUkanq5HzU4t4AZJlNAa` | ✅ Added to .env files |
| **Account Number** | `6884-5973-6661-1279` | ✅ Added to .env files |
| **API URL** | `https://api.flashswitch.flash-group.com` | ✅ Added to .env files |
| **Token URL** | `https://api.flashswitch.flash-group.com/token` | ✅ Configured |

---

## 📁 **Files Updated**

1. ✅ `.env` - Local development environment (UAT)
2. ✅ `.env.staging` - Staging environment configuration
3. ✅ `env.template` - Template for future reference

---

## ☁️ **GCS Secret Manager Setup**

### **Step 1: Add Flash Consumer Key**

```bash
# Add FLASH_CONSUMER_KEY to Secret Manager
gcloud secrets create FLASH_CONSUMER_KEY \
  --data-file=- \
  --replication-policy="automatic" \
  --project=mymoolah-prod

# Set the value
echo -n "15hIRiL5U2u09M9aDJPrdWp7Twka" | \
  gcloud secrets versions add FLASH_CONSUMER_KEY \
  --data-file=- \
  --project=mymoolah-prod
```

### **Step 2: Add Flash Consumer Secret**

```bash
# Add FLASH_CONSUMER_SECRET to Secret Manager
gcloud secrets create FLASH_CONSUMER_SECRET \
  --data-file=- \
  --replication-policy="automatic" \
  --project=mymoolah-prod

# Set the value
echo -n "wmysn59gzUkanq5HzU4t4AZJlNAa" | \
  gcloud secrets versions add FLASH_CONSUMER_SECRET \
  --data-file=- \
  --project=mymoolah-prod
```

### **Step 3: Add Flash Account Number**

```bash
# Add FLASH_ACCOUNT_NUMBER to Secret Manager
gcloud secrets create FLASH_ACCOUNT_NUMBER \
  --data-file=- \
  --replication-policy="automatic" \
  --project=mymoolah-prod

# Set the value
echo -n "6884-5973-6661-1279" | \
  gcloud secrets versions add FLASH_ACCOUNT_NUMBER \
  --data-file=- \
  --project=mymoolah-prod
```

### **Step 4: Add Flash API URL**

```bash
# Add FLASH_API_URL to Secret Manager
gcloud secrets create FLASH_API_URL \
  --data-file=- \
  --replication-policy="automatic" \
  --project=mymoolah-prod

# Set the value
echo -n "https://api.flashswitch.flash-group.com" | \
  gcloud secrets versions add FLASH_API_URL \
  --data-file=- \
  --project=mymoolah-prod
```

### **Step 5: Verify Secrets Were Created**

```bash
# List all Flash secrets
gcloud secrets list \
  --filter="name:FLASH" \
  --project=mymoolah-prod

# View secret metadata (not the actual value)
gcloud secrets describe FLASH_CONSUMER_KEY --project=mymoolah-prod
gcloud secrets describe FLASH_CONSUMER_SECRET --project=mymoolah-prod
gcloud secrets describe FLASH_ACCOUNT_NUMBER --project=mymoolah-prod
gcloud secrets describe FLASH_API_URL --project=mymoolah-prod
```

---

## 🔄 **Alternative: Update Existing Secrets**

If secrets already exist, use this to update them:

```bash
# Update FLASH_CONSUMER_KEY
echo -n "15hIRiL5U2u09M9aDJPrdWp7Twka" | \
  gcloud secrets versions add FLASH_CONSUMER_KEY \
  --data-file=- \
  --project=mymoolah-prod

# Update FLASH_CONSUMER_SECRET
echo -n "wmysn59gzUkanq5HzU4t4AZJlNAa" | \
  gcloud secrets versions add FLASH_CONSUMER_SECRET \
  --data-file=- \
  --project=mymoolah-prod

# Update FLASH_ACCOUNT_NUMBER
echo -n "6884-5973-6661-1279" | \
  gcloud secrets versions add FLASH_ACCOUNT_NUMBER \
  --data-file=- \
  --project=mymoolah-prod

# Update FLASH_API_URL
echo -n "https://api.flashswitch.flash-group.com" | \
  gcloud secrets versions add FLASH_API_URL \
  --data-file=- \
  --project=mymoolah-prod
```

---

## 🔐 **Grant Access to Cloud Run Services**

```bash
# Grant staging service access to Flash secrets
gcloud secrets add-iam-policy-binding FLASH_CONSUMER_KEY \
  --member="serviceAccount:mymoolah-backend-staging@mymoolah-prod.iam.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor" \
  --project=mymoolah-prod

gcloud secrets add-iam-policy-binding FLASH_CONSUMER_SECRET \
  --member="serviceAccount:mymoolah-backend-staging@mymoolah-prod.iam.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor" \
  --project=mymoolah-prod

gcloud secrets add-iam-policy-binding FLASH_ACCOUNT_NUMBER \
  --member="serviceAccount:mymoolah-backend-staging@mymoolah-prod.iam.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor" \
  --project=mymoolah-prod

gcloud secrets add-iam-policy-binding FLASH_API_URL \
  --member="serviceAccount:mymoolah-backend-staging@mymoolah-prod.iam.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor" \
  --project=mymoolah-prod
```

---

## ⚙️ **Enable Flash Integration**

### **For UAT (Local Development)**
```bash
# In .env file, set:
FLASH_LIVE_INTEGRATION=false  # Use simulation for testing
```

### **For Staging (Cloud Run)**
```bash
# In Cloud Run environment variables, set:
FLASH_LIVE_INTEGRATION=true  # Use real Flash API
```

### **For Production (Cloud Run)**
```bash
# In Cloud Run environment variables, set:
FLASH_LIVE_INTEGRATION=true  # Use real Flash API
```

---

## 🧪 **Testing the Integration**

### **Test 1: Authentication**
```bash
# Test Flash OAuth 2.0 authentication
curl -X POST https://api.flashswitch.flash-group.com/token \
  -H "Authorization: Basic MTVoSVJpTDVVMnUwOU05YURKUHJkV3A3VHdrYTp3bXlzbjU5Z3pVa2FucTVIelU0dDRBWkpsTkFh" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "grant_type=client_credentials"

# Expected response:
{
  "access_token": "...",
  "token_type": "Bearer",
  "expires_in": 3600
}
```

### **Test 2: List Products**
```bash
# Get access token first, then:
curl -X GET "https://api.flashswitch.flash-group.com/v4/accounts/6884-5973-6661-1279/products" \
  -H "Authorization: Bearer <access_token>"
```

### **Test 3: Cash-Out Purchase (Staging)**
```bash
# In your application, navigate to Flash Eezi Cash overlay
# Select amount (R50-R500)
# Submit purchase
# Verify real PIN is returned
```

### **Test 4: Electricity Purchase (Staging)**
```bash
# Create electricity beneficiary
# Purchase electricity (R20-R2000)
# Verify real 20-digit token is returned
# Check transaction history
```

---

## 📊 **Environment Configuration Summary**

| Environment | FLASH_LIVE_INTEGRATION | Purpose | Behavior |
|-------------|------------------------|---------|----------|
| **Local (UAT)** | `false` | Development & Testing | Simulated tokens |
| **Codespaces** | `false` | UAT Testing | Simulated tokens |
| **Staging** | `true` | Pre-Production Testing | Real Flash API |
| **Production** | `true` | Live Users | Real Flash API |

---

## 🔒 **Security Notes**

1. ✅ **Never commit credentials to git** - Already in `.gitignore`
2. ✅ **Use Secret Manager for Cloud Run** - Commands provided above
3. ✅ **Rotate credentials periodically** - Flash provides new credentials on request
4. ✅ **Monitor API usage** - Check Flash dashboard for transaction logs
5. ✅ **Use environment variables** - Never hardcode credentials in code

---

## 📚 **Related Documentation**

- `integrations/flash/FLASH_TESTING_REFERENCE.md` - Testing tokens and error codes
- `docs/session_logs/2026-02-01_1800_flash-integration-completion.md` - Integration details
- `controllers/flashController.js` - Flash API controller
- `services/flashAuthService.js` - Flash authentication service

---

## ✅ **Setup Checklist**

- [x] Decode Base64 credentials
- [x] Update `.env` file
- [x] Update `.env.staging` file
- [x] Update `env.template` file
- [ ] Run `gcloud` commands to add secrets
- [ ] Grant Cloud Run service access to secrets
- [ ] Deploy to Staging with `FLASH_LIVE_INTEGRATION=true`
- [ ] Test Flash cash-out purchase
- [ ] Test Flash electricity purchase
- [ ] Monitor first transactions in Flash dashboard

---

**Status**: ✅ **Ready for GCS Secret Manager Setup**  
**Next Step**: Run the `gcloud` commands above to add secrets to Secret Manager
