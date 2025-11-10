# Check Bill Payment & Prepaid Utility Endpoints in Swagger

**Date:** 2025-11-10  
**Status:** ⏳ **ACTION REQUIRED**

---

## 🎯 **Objective**

Verify the exact endpoint paths for Bill Payment and Prepaid Utility products in Swagger UI.

---

## 📋 **Steps to Check**

1. **Open Swagger UI:**
   - URL: https://uat.fulcrumswitch.com/swagger

2. **Find "Bill Payment" Section:**
   - Scroll or search for "Bill Payment" tag
   - Expand the section
   - Look for the **GET products** endpoint
   - **Copy the exact path** shown (e.g., `/v1/billpayment/products` or `/v1/bill-payment/products`)

3. **Find "Prepaid Utility" Section:**
   - Scroll or search for "Prepaid Utility" tag
   - Expand the section
   - Look for the **GET products** endpoint
   - **Copy the exact path** shown (e.g., `/v1/prepaidutility/products` or `/v1/prepaid-utility/products`)

---

## 🔍 **What to Look For**

### **Possible Path Variations:**

The paths might be:
- `/v1/billpayment/products` (what we're using)
- `/v1/bill-payment/products` (with hyphen)
- `/v1/billpayment/products` (different casing)
- `/v1/prepaidutility/products` (what we're using)
- `/v1/prepaid-utility/products` (with hyphen)
- `/v1/utility/products` (shorter name)

### **Check These Details:**

1. **Exact path** shown in Swagger
2. **HTTP Method** (should be GET)
3. **Description** (should mention "products")
4. **Parameters** (if any query parameters are required)
5. **Response format** (should be JSON array)

---

## 📝 **What to Report**

Once you find the paths, share:

```
Bill Payment Products Endpoint:
- Path: /v1/...
- Full URL: https://uat.fulcrumswitch.com/v1/...

Prepaid Utility Products Endpoint:
- Path: /v1/...
- Full URL: https://uat.fulcrumswitch.com/v1/...
```

---

## ⚠️ **If Paths Match What We're Using**

If the paths in Swagger are exactly `/v1/billpayment/products` and `/v1/prepaidutility/products` (which match what we're using), then:

1. **Account may not be activated** for these product types
2. **Contact MobileMart** to request activation:
   - Email: support@mobilemart.co.za
   - Request: "Please activate Bill Payment and Prepaid Utility products for merchant account 'mymoolah'"

---

## 🧪 **Test After Finding Paths**

Once you have the correct paths, update the test script and run:

```bash
node scripts/test-mobilemart-correct-endpoints.js
```

---

**Status:** ⏳ **WAITING FOR SWAGGER UI CHECK**

