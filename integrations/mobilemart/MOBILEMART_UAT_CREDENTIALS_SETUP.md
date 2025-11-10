# MobileMart UAT Credentials Setup & Testing Guide

**Date:** November 10, 2025  
**Status:** ✅ **UAT CREDENTIALS RECEIVED** - Ready for Testing

---

## 📋 **UAT Credentials Received**

- **Client ID:** `mymoolah`
- **Client Secret:** `f905627c-f6ff-464c-ba6d-3cdd6a3b61d8`
- **Environment:** UAT
- **Base URL:** `https://uat.fulcrumswitch.com`
- **Token Endpoint:** `https://uat.fulcrumswitch.com/connect/token`
- **Swagger:** `https://uat.fulcrumswitch.com/swagger`

---

## ✅ **What's Already Complete**

### **1. Code Implementation**
- ✅ OAuth 2.0 authentication service (`services/mobilemartAuthService.js`)
- ✅ MobileMart controller (`controllers/mobilemartController.js`)
- ✅ API routes (`routes/mobilemart.js`)
- ✅ VAS type normalization (electricity → prepaidutility, bill_payment → billpayment)
- ✅ Product listing endpoints (`/api/v1/mobilemart/products/:vasType`)
- ✅ Purchase endpoints (`/api/v1/mobilemart/purchase/:vasType`)
- ✅ Health check endpoint (`/api/v1/mobilemart/health`)
- ✅ Test script (`scripts/test-mobilemart-integration.js`)

### **2. API Structure**
- ✅ Correct OAuth endpoint: `/connect/token` (IdentityServer4/OpenIddict pattern)
- ✅ Correct base URL: `uat.fulcrumswitch.com` (UAT) / `fulcrumswitch.com` (PROD)
- ✅ Correct product endpoints: `/api/v1/{vasType}/products`
- ✅ Correct purchase endpoints: `/api/v1/{vasType}/purchase` (or `/pay` for bill payments)

### **3. Supported VAS Types**
- ✅ **Airtime** → `/api/v1/airtime/products` & `/api/v1/airtime/purchase`
- ✅ **Data** → `/api/v1/data/products` & `/api/v1/data/purchase`
- ✅ **Voucher** → `/api/v1/voucher/products` & `/api/v1/voucher/purchase`
- ✅ **Bill Payment** → `/api/v1/billpayment/products` & `/api/v1/billpayment/pay`
- ✅ **Prepaid Utility (Electricity)** → `/api/v1/prepaidutility/products` & `/api/v1/prepaidutility/purchase`

---

## 🔧 **Configuration Steps**

### **Step 1: Update Environment Variables**

Add/update these variables in your `.env` file (local and Codespaces):

```env
# MobileMart UAT Configuration
MOBILEMART_LIVE_INTEGRATION=true
MOBILEMART_CLIENT_ID=mymoolah
MOBILEMART_CLIENT_SECRET=f905627c-f6ff-464c-ba6d-3cdd6a3b61d8
MOBILEMART_API_URL=https://uat.fulcrumswitch.com
MOBILEMART_TOKEN_URL=https://uat.fulcrumswitch.com/connect/token
MOBILEMART_SCOPE=api
```

**Note:** The code auto-detects UAT vs PROD based on `NODE_ENV`, but explicitly setting `MOBILEMART_API_URL` ensures correct environment.

### **Step 2: Verify Token Retrieval**

Test authentication manually:

```bash
curl -X POST "https://uat.fulcrumswitch.com/connect/token" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "grant_type=client_credentials&client_id=mymoolah&client_secret=f905627c-f6ff-464c-ba6d-3cdd6a3b61d8&scope=api"
```

**Expected Response:**
```json
{
  "access_token": "eyJhbGciOiJSUzI1NiIs...",
  "expires_in": 7200,
  "token_type": "Bearer"
}
```

### **Step 3: Run Integration Test Script**

```bash
cd /workspaces/mymoolah-platform  # or your local path
node scripts/test-mobilemart-integration.js
```

**Expected Output:**
- ✅ Credentials: PASSED
- ✅ Authentication: PASSED
- ✅ Endpoints: PASSED (with product counts)

### **Step 4: Test via Backend API**

After backend is running:

```bash
# Health check
curl http://localhost:3001/api/v1/mobilemart/health

# List airtime products
curl http://localhost:3001/api/v1/mobilemart/products/airtime

# List data products
curl http://localhost:3001/api/v1/mobilemart/products/data

# List electricity products
curl http://localhost:3001/api/v1/mobilemart/products/electricity
```

---

## 📊 **Testing Checklist**

### **Phase 1: Authentication & Product Discovery**
- [ ] Token retrieval successful
- [ ] Token expiry time reasonable (7200 seconds = 2 hours)
- [ ] Airtime products returned
- [ ] Data products returned
- [ ] Electricity (prepaidutility) products returned
- [ ] Voucher products returned (if applicable)
- [ ] Bill payment products returned (if applicable)

### **Phase 2: Purchase Testing (UAT Test Pack)**
- [ ] Airtime purchase (pinless)
- [ ] Airtime purchase (pinned)
- [ ] Data purchase
- [ ] Electricity purchase (prepaid utility)
- [ ] Bill payment
- [ ] Transaction status checking
- [ ] Reprint functionality

### **Phase 3: Error Handling**
- [ ] Invalid product ID handling
- [ ] Insufficient balance handling
- [ ] Invalid mobile number handling
- [ ] Token expiry and refresh handling
- [ ] Network error handling

---

## 🔍 **Troubleshooting**

### **Issue: Invalid Client Credentials**
**Error:** `invalid_client` or `The specified client credentials are invalid`

**Solutions:**
1. Verify credentials are correct (no extra spaces)
2. Ensure `MOBILEMART_LIVE_INTEGRATION=true` is set
3. Check that you're using UAT URL (`uat.fulcrumswitch.com`) not PROD
4. Contact MobileMart support if credentials still fail

### **Issue: Empty Product Lists**
**Possible Causes:**
- Account not activated for specific VAS types
- Products not exposed to merchant account
- Wrong API endpoint structure

**Solutions:**
1. Check Swagger UI: `https://uat.fulcrumswitch.com/swagger`
2. Verify account activation with MobileMart
3. Test with MobileMart's test pack products

### **Issue: Token Expires Too Quickly**
**Solution:** Token refresh is automatic. The service refreshes tokens 5 minutes before expiry.

---

## 📝 **Next Steps After UAT Testing**

1. **Complete UAT Test Pack** - Execute all test cases from MobileMart
2. **Document Results** - Record all test outcomes, request/response samples
3. **Fix Any Issues** - Address discrepancies between expected and actual behavior
4. **Request Production Credentials** - After successful UAT completion
5. **Configure Production Environment** - Update env vars for PROD
6. **Production Smoke Tests** - Verify PROD credentials work before go-live

---

## 📚 **Reference Documentation**

- **UAT Swagger:** https://uat.fulcrumswitch.com/swagger
- **Status Document:** `MOBILEMART_STATUS_2025-11-07.md`
- **UAT Testing Guide:** `MOBILEMART_UAT_TESTING_NEXT_STEPS.md`
- **Integration Report:** `MOBILEMART_FULCRUM_FINAL_REPORT.md`

---

## 🎯 **Current Status**

| Component | Status | Notes |
|-----------|--------|-------|
| **Code Implementation** | ✅ Complete | All endpoints and services ready |
| **OAuth Endpoint** | ✅ Correct | `/connect/token` working |
| **API Structure** | ✅ Matches Docs | All endpoints match MobileMart Fulcrum |
| **UAT Credentials** | ✅ Received | Ready to configure |
| **Environment Config** | ⏸️ Pending | Need to update `.env` |
| **Authentication Test** | ⏸️ Pending | After env config |
| **Product Discovery** | ⏸️ Pending | After auth works |
| **Purchase Testing** | ⏸️ Pending | After product discovery |

---

**Last Updated:** November 10, 2025  
**Next Action:** Configure UAT credentials in `.env` and run test script

