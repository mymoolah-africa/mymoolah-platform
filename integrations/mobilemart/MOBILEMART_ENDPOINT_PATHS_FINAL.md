# MobileMart Endpoint Paths - Final Reference

**Date:** 2025-11-10  
**Status:** ✅ **UPDATED WITH CORRECT PATHS**

---

## 📋 **Correct Endpoint Paths (from Swagger UI)**

### ✅ **Working Endpoints:**

1. **Airtime Products:**
   - Path: `/v1/airtime/products`
   - Status: ✅ Working (7 products)

2. **Data Products:**
   - Path: `/v1/data/products`
   - Status: ✅ Working (45 products)

3. **Voucher Products:**
   - Path: `/v1/voucher/products`
   - Status: ✅ Working (8 products)

4. **Bill Payment Products:**
   - Path: `/v1/bill-payment/products` ⚠️ **Uses hyphen!**
   - Status: ✅ Fixed (was `/v1/billpayment/products`)
   - **Note:** API uses `bill-payment` (with hyphen), not `billpayment`

5. **Prepaid Utility Products:**
   - Path: `/v1/prepaidutility/products` (or `/v1/prepaid-utility/products`?)
   - Status: ⏳ Pending verification

---

## 🔧 **Code Updates**

### **Controller Normalization (`mobilemartController.js`):**

```javascript
normalizeVasType(vasType) {
    const mapping = {
        'airtime': 'airtime',
        'data': 'data',
        'voucher': 'voucher',
        'billpayment': 'bill-payment',      // CORRECTED: Uses hyphen
        'bill_payment': 'bill-payment',
        'bill-payment': 'bill-payment',
        'electricity': 'prepaidutility',
        'prepaidutility': 'prepaidutility',
        'prepaid-utility': 'prepaidutility',  // Prepared for hyphen variant
        'utility': 'prepaidutility'
    };
    return mapping[vasType.toLowerCase()] || vasType.toLowerCase();
}
```

### **URL Construction:**

```
Base URL: https://uat.fulcrumswitch.com
API URL:  https://uat.fulcrumswitch.com/v1
Endpoint: /{vasType}/products

Examples:
- Airtime:    https://uat.fulcrumswitch.com/v1/airtime/products
- Data:       https://uat.fulcrumswitch.com/v1/data/products
- Voucher:    https://uat.fulcrumswitch.com/v1/voucher/products
- Bill Payment: https://uat.fulcrumswitch.com/v1/bill-payment/products
- Prepaid Utility: https://uat.fulcrumswitch.com/v1/prepaidutility/products
```

---

## ⚠️ **Key Finding: Bill Payment Uses Hyphen**

The Bill Payment endpoint uses a **hyphen** (`bill-payment`), not a single word (`billpayment`). This is important for:
- URL construction
- VAS type normalization
- API routing

---

## 📝 **Next Steps**

1. ✅ **Bill Payment:** Fixed - ready to test
2. ⏳ **Prepaid Utility:** Verify exact path in Swagger UI
   - Check if it's `/v1/prepaidutility/products` or `/v1/prepaid-utility/products`

---

## 🧪 **Testing**

Run the test script to verify all endpoints:

```bash
node scripts/test-mobilemart-correct-endpoints.js
```

Expected results:
- ✅ Airtime: 7 products
- ✅ Data: 45 products
- ✅ Voucher: 8 products
- ✅ Bill Payment: Should now work (was returning HTML)
- ⏳ Prepaid Utility: Pending path verification

---

**Last Updated:** 2025-11-10  
**Status:** ✅ **4/5 ENDPOINTS READY** (Bill Payment fixed, Prepaid Utility pending)

