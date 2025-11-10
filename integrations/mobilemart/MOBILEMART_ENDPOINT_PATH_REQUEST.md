# MobileMart Fulcrum API - Endpoint Path Request

**Date:** November 10, 2025  
**Merchant:** mymoolah  
**Status:** ⚠️ **NEED EXACT ENDPOINT PATH**

---

## ✅ **What's Working**

- ✅ **Authentication:** Working perfectly with `scope=api`
- ✅ **Token Retrieval:** Successfully getting tokens
- ✅ **PROD Credentials:** Verified working by MobileMart

---

## ❌ **Issue: Product Endpoint Path**

### **Problem:**
We've tested **16 different endpoint patterns** and all return HTML instead of JSON products.

### **What MobileMart Confirmed:**
> "I have verified the credentials and ran some tests against this on the Production environment, and I managed to get a token and get the product list."

### **What We Need:**
The **exact endpoint path** that MobileMart used to successfully retrieve products.

---

## 📋 **Request for Exact Endpoint Information**

### **1. Exact Endpoint Path**
Please provide the exact endpoint path you used to retrieve products:

**Example format needed:**
```
GET https://fulcrumswitch.com/api/v1/{exact-path-here}
```

### **2. Full Working Example**
Could you share the exact curl command that successfully retrieved products?

**Example:**
```bash
curl -X GET "https://fulcrumswitch.com/api/v1/???" \
  -H "Authorization: Bearer {token}" \
  -H "Accept: application/json"
```

### **3. Endpoint Structure**
- What is the base path for product endpoints?
- Are products under `/api/v1/` or a different path?
- Is the structure `/api/v1/{product-type}/products` or different?

### **4. Product Types**
For each product type, what is the exact endpoint:
- Airtime: `???`
- Data: `???`
- Utilities: `???`
- BillPayments: `???`
- Vouchers: `???`

---

## 🧪 **Endpoints We've Tested (All Return HTML)**

### **Current Patterns Tested:**
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

### **Base URLs Tested:**
- `https://uat.fulcrumswitch.com/api/v1/`
- `https://fulcrumswitch.com/api/v1/`

---

## 🔍 **What We Know**

### **Working (Confirmed by MobileMart):**
- ✅ Token endpoint: `https://fulcrumswitch.com/connect/token`
- ✅ Token request format: `grant_type=client_credentials&client_id=mymoolah&client_secret=...&scope=api`
- ✅ Product listing endpoint: **EXISTS** (MobileMart confirmed it works)

### **Not Working:**
- ❌ All endpoint patterns we've tried return HTML

---

## 💡 **Possible Reasons**

1. **Different Base Path:** Products might be under `/api/v2/` or different version
2. **Different Structure:** Might be `/merchant/{merchantId}/products` or similar
3. **Additional Headers:** Might need specific headers beyond Authorization
4. **Query Parameters:** Might require specific query parameters
5. **UAT vs PROD:** UAT might have different endpoint structure than PROD

---

## 📝 **Next Steps**

1. **Receive exact endpoint path** from MobileMart
2. **Update integration code** with correct paths
3. **Test product listing** with correct endpoints
4. **Proceed with UAT testing** (24 compliance tests)

---

## 🔗 **Contact**

- **Email:** support@mobilemart.co.za
- **Merchant:** mymoolah
- **Environment:** PROD (verified working) / UAT (pending credentials)

---

**Thank you for your assistance!**

**Last Updated:** November 10, 2025  
**Status:** ⚠️ **AWAITING EXACT ENDPOINT PATH**

