# MobileMart Fulcrum API - Product Endpoint Support Request

**Date:** November 10, 2025  
**Merchant:** mymoolah  
**Environment:** UAT  
**Status:** ⚠️ **AUTHENTICATION WORKING - PRODUCT ENDPOINTS RETURNING HTML**

---

## ✅ **What's Working**

### **Authentication:**
- ✅ OAuth endpoint: `https://uat.fulcrumswitch.com/connect/token`
- ✅ Client credentials: `mymoolah` / `f905627c-f6ff-464c-ba6d-3cdd6a3b61d8`
- ✅ Token retrieval: **SUCCESS**
- ✅ Token type: Bearer
- ✅ Token expiry: 7199 seconds (120 minutes)

### **Purchase Endpoints:**
- ✅ Endpoint structure verified for all 24 test cases
- ✅ All purchase endpoint paths confirmed correct

---

## ❌ **Issue: Product Listing Endpoints**

### **Problem:**
All product listing endpoints are returning **HTML (Fulcrum UI)** instead of **JSON** product data.

### **Endpoints Tested (All Return HTML):**
- `/airtime/products`
- `/data/products`
- `/products/airtime`
- `/products/data`
- `/products`
- `/products?type=airtime`
- `/products?type=data`
- `/v1/products/airtime`
- `/v1/products/data`
- `/api/products/airtime`
- `/api/products/data`
- `/catalog`
- `/catalog/airtime`
- `/catalog/data`
- `/merchant/products`
- `/merchant/products/airtime`

### **Expected Response:**
```json
[
  {
    "merchantProductId": "...",
    "name": "...",
    "price": 100,
    "type": "airtime",
    ...
  }
]
```

### **Actual Response:**
```html
<!DOCTYPE html>
<html lang="en">
  <head>
    <title>Fulcrum</title>
    ...
  </head>
  <body>
    <div id="root"></div>
    ...
  </body>
</html>
```

---

## 📋 **Request for Support**

We need assistance with the following:

### **1. Correct Product Listing Endpoint Paths**
Please provide the exact endpoint paths for:
- Airtime products listing
- Data products listing
- Any other product types (electricity, vouchers, etc.)

### **2. Required Headers or Parameters**
Are there any:
- Additional headers required beyond `Authorization: Bearer {token}`?
- Query parameters needed?
- Different API version to use?

### **3. Sample Working Request**
Could you provide a sample `curl` command that successfully retrieves products?

Example format:
```bash
curl -X GET "https://uat.fulcrumswitch.com/api/v1/airtime/products" \
  -H "Authorization: Bearer {token}" \
  -H "Accept: application/json"
```

### **4. Account Configuration**
- Is product catalog access enabled for merchant account `mymoolah`?
- Are there any account-level restrictions?
- Do we need to request specific product types to be enabled?

---

## 🧪 **UAT Test Packs Ready**

We have 4 complete UAT test packs ready (24 compliance tests):
- ✅ Variable Pinless Airtime (4 tests)
- ✅ Fixed Pinless Airtime & Data (8 tests)
- ✅ Fixed Pinned Airtime & Data (8 tests)
- ✅ Variable Pinned Airtime (4 tests)

**Test Data:**
- Mobile numbers: `0720012345`, `0830012300`, `0840000000`, `0850012345`
- Values: R10, R20, R30, R40 (for variable pinned)

**Status:** Ready to execute once product listing endpoints are accessible.

---

## 📊 **Current Integration Status**

| Component | Status | Notes |
|-----------|--------|-------|
| OAuth Authentication | ✅ Working | Token retrieval successful |
| Token Management | ✅ Working | Caching and refresh ready |
| Product Listing | ❌ Not Working | Returning HTML instead of JSON |
| Purchase Endpoints | ✅ Verified | Structure confirmed correct |
| Error Handling | ✅ Implemented | Ready for production |
| Code Structure | ✅ Complete | Matches MobileMart documentation |

---

## 🔗 **References**

- **UAT Base URL:** `https://uat.fulcrumswitch.com`
- **Token Endpoint:** `https://uat.fulcrumswitch.com/connect/token`
- **Swagger UI:** `https://uat.fulcrumswitch.com/swagger` (if accessible)
- **Test Packs:** See `MOBILEMART_UAT_TEST_PACK.md`
- **Contact:** support@mobilemart.co.za

---

## 📝 **Next Steps**

1. **Immediate:** Receive correct product listing endpoint paths
2. **Update:** Integration code with correct endpoints
3. **Test:** Execute all 24 UAT compliance tests
4. **Verify:** Product purchases work correctly
5. **Complete:** UAT testing and move to production

---

**Thank you for your assistance!**

**Last Updated:** November 10, 2025  
**Status:** ⚠️ **AWAITING PRODUCT ENDPOINT CLARIFICATION**

