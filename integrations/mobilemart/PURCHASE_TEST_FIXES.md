# MobileMart Purchase Test Fixes

**Date:** 2025-11-10  
**Status:** 🔧 **FIXES APPLIED**

---

## 🔍 **Issues Identified**

### **1. Pinless Airtime/Data - Mobile Number Format**
- **Error:** 1013 - "Mobile Number is invalid"
- **Issue:** Mobile number `0720012345` rejected
- **Fix:** Use international format `27720012345` (27 = South Africa country code)

### **2. Utility Purchase - Double /v1/ in URL**
- **Error:** 405 Method Not Allowed
- **Issue:** URL was `/v1/v1/utility/purchase` (double v1)
- **Fix:** Changed to `/utility/purchase` (apiUrl already includes /v1)

### **3. Catalog Sync - SSL Certificate Error**
- **Error:** "unable to verify the first certificate"
- **Issue:** Database connection SSL certificate verification failing
- **Fix:** Set `NODE_TLS_REJECT_UNAUTHORIZED = '0'` for database connections

---

## ✅ **Fixes Applied**

### **Fix 1: Mobile Number Format**
```javascript
// Before:
mobileNumber: '0720012345'

// After:
mobileNumber: '27720012345'  // International format (27 = SA)
```

### **Fix 2: Utility Purchase URL**
```javascript
// Before:
'/v1/utility/purchase'  // Double /v1/ when combined with apiUrl

// After:
'/utility/purchase'  // apiUrl already has /v1
```

### **Fix 3: SSL Certificate for Database**
```javascript
// Added to sync script:
if (process.env.DATABASE_URL && process.env.DATABASE_URL.includes('sslmode=require')) {
    process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
    process.env.NODE_ENV = 'production';
}
```

---

## 📝 **Mobile Number Format Requirements**

MobileMart API requires mobile numbers in **international format**:
- **Format:** `27` + mobile number (without leading 0)
- **Example:** `0720012345` → `27720012345`
- **Country Code:** 27 (South Africa)

### **Test Numbers from MobileMart Test Pack:**
- Vodacom: `0720012345` → `27720012345`
- MTN: `0830012300` → `27830012300`
- CellC: `0840000000` → `27840000000`
- Telkom: `0850012345` → `27850012345`

---

## 🧪 **Next Test Run**

After pulling the fixes, run:

```bash
git pull
node scripts/test-mobilemart-purchases.js
```

**Expected Results:**
- ✅ Airtime Pinless: Should work with international format
- ✅ Data Pinless: Should work with international format
- ✅ Utility Purchase: Should work with corrected URL
- ⚠️ Bill Payment: Still needs valid account number

---

## 📋 **Catalog Sync Fix**

Run catalog sync again:

```bash
node scripts/sync-mobilemart-uat-catalog.js
```

**Expected Results:**
- ✅ Should sync all 65 products successfully
- ✅ No SSL certificate errors
- ✅ Products created/updated in database

---

**Status:** ✅ **FIXES APPLIED - READY FOR RETEST**

