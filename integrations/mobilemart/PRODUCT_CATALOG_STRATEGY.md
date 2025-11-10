# MobileMart Product Catalog Strategy

**Date:** 2025-11-10  
**Status:** 📋 **STRATEGY DEFINED**

---

## 🎯 **Strategy: Keep Current Catalog, Test UAT, Sync Production Later**

### **Decision:**
- ✅ **Keep current catalog** (dummy data) for now
- ✅ **Test purchases with UAT** but don't sync UAT products
- ✅ **Wait for production credentials** before syncing real products
- ✅ **Full production sync** when PROD is ready

---

## 📋 **Current State**

### **Product Catalog:**
- **Status:** Contains dummy/test data
- **Source:** Previous integrations (Flash, MobileMart legacy)
- **Action:** Keep as-is for now

### **UAT Testing:**
- **Status:** All 5 endpoints working (65 products available)
- **Action:** Test purchases but don't persist UAT products
- **Reason:** Avoid polluting catalog with test data

### **Production:**
- **Status:** Credentials not yet available
- **Action:** Wait for PROD credentials
- **Plan:** Full sync from production when ready

---

## 🔄 **Sync Strategy**

### **Phase 1: Current (UAT Testing)**
```
UAT API → Test Purchases → ✅ Test Results
         ↓
    (No Catalog Sync)
```

### **Phase 2: Production (When Ready)**
```
PROD API → Full Product Sync → Production Catalog
         ↓
    Clean & Replace
    All Products
```

---

## ✅ **Benefits of This Approach**

1. **Clean Separation:**
   - UAT test data doesn't mix with production catalog
   - Clear distinction between test and production

2. **No Data Pollution:**
   - Current dummy data remains intact
   - No need to clean up UAT test products later

3. **Production Ready:**
   - When PROD credentials arrive, do one clean sync
   - Replace all products with production data

4. **Testing Flexibility:**
   - Can test purchases without affecting catalog
   - Test results are independent of catalog state

---

## 📝 **Implementation Plan**

### **Step 1: Purchase Testing (Now)**
- ✅ Test pinless airtime/data purchases
- ✅ Test voucher purchases
- ✅ Test bill payment/utility (if valid accounts available)
- ❌ **Don't sync UAT products to catalog**

### **Step 2: Production Sync (Later)**
- ⏳ Wait for production credentials
- ⏳ Create production sync script
- ⏳ Clean existing catalog
- ⏳ Sync all products from production
- ⏳ Verify product data quality

---

## 🔧 **Catalog Sync Service**

### **When Production is Ready:**

1. **Create Production Sync Script:**
   ```javascript
   // scripts/sync-mobilemart-prod-catalog.js
   // - Connect to PROD API
   // - Fetch all products (all 5 VAS types)
   // - Clean existing MobileMart products
   // - Insert production products
   // - Update product catalog
   ```

2. **Sync Process:**
   - Fetch products from PROD API
   - Map to MyMoolah catalog structure
   - Handle commission/pricing
   - Update database
   - Verify sync success

3. **Verification:**
   - Check product counts
   - Verify pricing/commission
   - Test product availability
   - Validate catalog integrity

---

## ⚠️ **Important Notes**

### **Frontend Requirements:**
- ✅ **Pinless Only:** Frontend supports pinless airtime/data only
- ✅ **No Pinned:** Pinned products not needed for now
- ✅ **Future:** Can add pinned support later if needed

### **Product Filtering:**
- When syncing, filter to **pinless only** for airtime/data
- Skip pinned products (not supported by frontend)
- Can add pinned later without breaking changes

---

## 📊 **Current Product Counts (UAT)**

| VAS Type | Total Products | Pinless Products | Pinned Products |
|----------|----------------|------------------|-----------------|
| Airtime | 7 | ? | ? |
| Data | 45 | ? | ? |
| Voucher | 8 | N/A | N/A |
| Bill Payment | 4 | N/A | N/A |
| Utility | 1 | N/A | N/A |

**Note:** Need to verify pinless counts when syncing production.

---

## 🎯 **Recommendation Summary**

✅ **DO:**
- Keep current catalog as-is
- Test purchases with UAT
- Wait for production credentials
- Sync production when ready

❌ **DON'T:**
- Sync UAT products to catalog
- Clean catalog now (wait for production)
- Mix UAT and production data

---

**Status:** ✅ **STRATEGY APPROVED - READY FOR TESTING**

