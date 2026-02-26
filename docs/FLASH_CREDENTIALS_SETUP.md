# Flash API Credentials Setup Guide

**Date**: 2026-02-26 (updated with correct AVT credentials from Flash)
**Status**: ✅ Credentials Corrected & Confirmed by Flash (Tia Adonis)
**Previous issue**: Account number `6884-5973-6661-1279` was incorrect (corrupted hybrid). Corrected per Flash confirmation.

---

## ✅ **Credentials Summary**

### AVT Sandbox — UAT / Codespaces / Local Development

| Credential | Value |
|------------|-------|
| **Consumer Key** | `O0e978oDHUeF9iHryiRxgJwqXoMa` |
| **Consumer Secret** | `ayhimD0yIIHbus1lEygrOer5US4a` |
| **Account Number** | `8444-1533-7896-6119` |
| **API Base URL** | `https://api-flashswitch-sandbox.flash-group.com` |
| **Token URL** | `https://api-flashswitch-sandbox.flash-group.com/token` |

### AVT Production — Staging + Production Cloud Run

| Credential | Value |
|------------|-------|
| **Consumer Key** | `15hIRiL5U2u09M9aDJPrdWp7Twka` |
| **Consumer Secret** | `wmysn59gzUkanq5HzU4t4AZJlNAa` |
| **Account Number** | `0834-5373-6661-1279` |
| **API Base URL** | `https://api.flashswitch.flash-group.com` |
| **Token URL** | `https://api.flashswitch.flash-group.com/token` |

---

## 📁 **Environment File Mapping**

| File | Flash Environment | Account Number |
|------|-------------------|----------------|
| `.env` | AVT Sandbox | `8444-1533-7896-6119` |
| `.env.codespaces` | AVT Sandbox | `8444-1533-7896-6119` |
| `.env.staging` | AVT Production | `0834-5373-6661-1279` |
| GCS Secret Manager | AVT Production | `0834-5373-6661-1279` |

---

## ☁️ **GCS Secret Manager — Update Commands**

Run these commands to update the secrets in Google Cloud Secret Manager for Staging and Production:

### Update FLASH_CONSUMER_KEY (unchanged — same as before)
```bash
echo -n "15hIRiL5U2u09M9aDJPrdWp7Twka" | \
  gcloud secrets versions add FLASH_CONSUMER_KEY \
  --data-file=- \
  --project=mymoolah-db
```

### Update FLASH_CONSUMER_SECRET (unchanged — same as before)
```bash
echo -n "wmysn59gzUkanq5HzU4t4AZJlNAa" | \
  gcloud secrets versions add FLASH_CONSUMER_SECRET \
  --data-file=- \
  --project=mymoolah-db
```

### ⚠️ Update FLASH_ACCOUNT_NUMBER (THIS IS THE FIX — was wrong before)
```bash
echo -n "0834-5373-6661-1279" | \
  gcloud secrets versions add FLASH_ACCOUNT_NUMBER \
  --data-file=- \
  --project=mymoolah-db
```

### Update FLASH_API_URL (unchanged)
```bash
echo -n "https://api.flashswitch.flash-group.com" | \
  gcloud secrets versions add FLASH_API_URL \
  --data-file=- \
  --project=mymoolah-db
```

### Add FLASH_TOKEN_URL (new secret)
```bash
# Create if it doesn't exist:
gcloud secrets create FLASH_TOKEN_URL \
  --replication-policy="automatic" \
  --project=mymoolah-db

echo -n "https://api.flashswitch.flash-group.com/token" | \
  gcloud secrets versions add FLASH_TOKEN_URL \
  --data-file=- \
  --project=mymoolah-db
```

### Verify all secrets
```bash
gcloud secrets list --filter="name:FLASH" --project=mymoolah-db
```

---

## 🧪 **Test Authentication — Sandbox (UAT)**

```bash
curl -k -d "grant_type=client_credentials" \
  -H "Authorization: Basic TzBlOTc4b0RIVWVGOWlIcnlpUnhnSndxWG9NYTpheWhpbUQweUlJSGJ1czFsRXlnck9lcjVVUzRh" \
  https://api-flashswitch-sandbox.flash-group.com/token
```

## 🧪 **Test Authentication — Production (Staging + Production)**

```bash
curl -k -d "grant_type=client_credentials" \
  -H "Authorization: Basic MTVoSVJpTDVVMnUwOU05YURKUHJkV3A3VHdrYTp3bXlzbjU5Z3pVa2FucTVIelU0dDRBWkpsTkFh" \
  https://api.flashswitch.flash-group.com/token
```

## 🧪 **Test Products Endpoint — Sandbox**

```bash
# Get token first, then:
curl -X GET "https://api-flashswitch-sandbox.flash-group.com/v4/accounts/8444-1533-7896-6119/products" \
  -H "Authorization: Bearer <access_token>"
```

## 🧪 **Test Products Endpoint — Production**

```bash
# Get token first, then:
curl -X GET "https://api.flashswitch.flash-group.com/v4/accounts/0834-5373-6661-1279/products" \
  -H "Authorization: Bearer <access_token>"
```

---

## 📊 **Environment Configuration Summary**

| Environment | Credentials Set | Account Number | Token URL |
|-------------|-----------------|----------------|-----------|
| **Local (.env)** | AVT Sandbox | `8444-1533-7896-6119` | `api-flashswitch-sandbox.flash-group.com/token` |
| **Codespaces** | AVT Sandbox | `8444-1533-7896-6119` | `api-flashswitch-sandbox.flash-group.com/token` |
| **Staging (Cloud Run)** | AVT Production | `0834-5373-6661-1279` | `api.flashswitch.flash-group.com/token` |
| **Production (Cloud Run)** | AVT Production | `0834-5373-6661-1279` | `api.flashswitch.flash-group.com/token` |

---

## 🔒 **Security Notes**

1. ✅ Credentials never committed to git (`.env` files in `.gitignore`)
2. ✅ Sandbox and Production use completely different key/secret/URL/account
3. ✅ GCS Secret Manager holds Production credentials for Cloud Run
4. ✅ Both environments confirmed active by Flash (Tia Adonis, 2026-02-26)

---

## 📚 **Related Documentation**

- `integrations/flash/FLASH_TESTING_REFERENCE.md` — Testing tokens and error codes
- `controllers/flashController.js` — Flash API controller
- `services/flashAuthService.js` — Flash authentication service

---

**Contact**: integrations@flash-group.com  
**Flash Contact**: Tia Adonis (confirmed credentials 2026-02-26)
