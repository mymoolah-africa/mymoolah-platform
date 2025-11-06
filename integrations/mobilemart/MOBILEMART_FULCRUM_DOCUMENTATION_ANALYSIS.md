# MobileMart Fulcrum Integration - Documentation Analysis & Update

**Date:** November 5, 2025  
**Documentation Received:** MobileMart Fulcrum Integration Document  
**Status:** 🔄 **UPDATING INTEGRATION WITH DOCUMENTATION**

---

## 📋 **Key Findings from Documentation**

### 1. **Correct API Base URL**
- **UAT Environment:** `https://uat.fulcrumswitch.com`
- **Production Environment:** `https://fulcrumswitch.com` (or provided separately)
- **Current Code:** Using `https://api.mobilemart.co.za` ❌ **INCORRECT**

### 2. **Authentication Details**
- ✅ **OAuth 2.0 Client Credentials** (confirmed)
- ✅ **Token Valid for:** 2 hours (7200 seconds)
- ✅ **Client ID & Secret:** Provided via email
- ✅ **Re-authentication:** Required when token expires

### 3. **API Structure**
- **Swagger Documentation:** `https://uat.fulcrumswitch.com/swagger`
- **API Version:** v1
- **Endpoints:** `/api/v1/{vasType}/...`

### 4. **VAS Types Supported**
- ✅ **Airtime** - Pinned and Pinless
- ✅ **Data** - Pinned and Pinless  
- ✅ **Voucher** - Pinned vouchers
- ✅ **Bill Payment** - Bill payments with prevend
- ✅ **Prepaid Utility** - Electricity with prevend

### 5. **Product Endpoints**
- **GET Products:** `/api/v1/{vasType}/products`
- **Examples:**
  - `/api/v1/airtime/products`
  - `/api/v1/data/products`
  - `/api/v1/prepaidutility/products`

### 6. **Purchase Endpoints**
- **POST Purchase:** `/api/v1/{vasType}/purchase` or `/api/v1/{vasType}/pay`
- **Reprint:** `/api/v1/{vasType}/reprint`

---

## 🔧 **Required Updates**

### 1. **Update Base URL**
**File:** `services/mobilemartAuthService.js`

**Change:**
```javascript
// BEFORE (WRONG):
this.baseUrl = process.env.MOBILEMART_API_URL || 'https://api.mobilemart.co.za';

// AFTER (CORRECT):
this.baseUrl = process.env.MOBILEMART_API_URL || 'https://fulcrumswitch.com';
// OR for UAT:
this.baseUrl = process.env.MOBILEMART_API_URL || 'https://uat.fulcrumswitch.com';
```

### 2. **Update OAuth Token Endpoint**
Based on typical Swagger/ASP.NET API structure, the OAuth endpoint is likely:
- `/api/v1/oauth/token` or
- `/oauth/token` or  
- Needs to be verified from Swagger documentation

### 3. **Update Product Endpoints**
**Current:** `/api/v1/products/{vasType}`  
**Should be:** `/api/v1/{vasType}/products`

**Examples:**
- `/api/v1/airtime/products` ✅
- `/api/v1/data/products` ✅
- `/api/v1/prepaidutility/products` ✅

### 4. **Update Purchase Endpoints**
**Current:** `/api/v1/purchase/{vasType}`  
**Should be:** `/api/v1/{vasType}/purchase` or `/api/v1/{vasType}/pay`

---

## 🧪 **Testing Required**

### 1. **Verify OAuth Endpoint Path**
Need to access Swagger documentation to confirm exact OAuth endpoint:
- Check `https://uat.fulcrumswitch.com/swagger`
- Look for OAuth/authentication endpoints
- Verify exact path structure

### 2. **Test Authentication**
Once correct endpoint is found:
```bash
POST https://uat.fulcrumswitch.com/api/v1/oauth/token
Content-Type: application/x-www-form-urlencoded
Body: grant_type=client_credentials&client_id=mymoolah&client_secret=...
```

### 3. **Test Product Endpoints**
```bash
GET https://uat.fulcrumswitch.com/api/v1/airtime/products
Authorization: Bearer {access_token}
```

---

## 📝 **Action Items**

1. ✅ **Update base URL** to `fulcrumswitch.com`
2. ⏸️ **Verify OAuth endpoint path** from Swagger
3. ⏸️ **Update product endpoint structure** to match documentation
4. ⏸️ **Update purchase endpoint structure** to match documentation
5. ⏸️ **Test with UAT environment** first
6. ⏸️ **Get production URL** from MobileMart after testing

---

## 🔍 **Next Steps**

1. **Access Swagger Documentation:**
   - Visit: `https://uat.fulcrumswitch.com/swagger`
   - Find OAuth/authentication endpoints
   - Verify exact endpoint paths

2. **Update Code:**
   - Fix base URL
   - Fix OAuth endpoint path
   - Fix product endpoints
   - Fix purchase endpoints

3. **Test Integration:**
   - Test authentication with UAT
   - Test product listing
   - Test purchase flow

4. **Get Production Details:**
   - Contact MobileMart for production URL
   - Verify production credentials
   - Test in production after UAT approval

---

**Documentation Received:** MobileMart Fulcrum Integration Document  
**Next Step:** Access Swagger to verify exact endpoint paths


