# UAT Catalog Synchronization Service - Test Guide

**Date:** January 21, 2026  
**Status:** ✅ **READY FOR TESTING**

---

## 📋 **Overview**

The UAT Catalog Synchronization Service automatically imports all available UAT products from MobileMart to the UAT product catalog every day at **2:00 AM SAST (Africa/Johannesburg)**.

---

## 🔧 **Recent Improvements**

### **1. Timezone Fix** ✅
- **Issue:** Service was using local server time instead of SAST
- **Fix:** Updated to use `node-cron` with `timezone: 'Africa/Johannesburg'`
- **Result:** Now runs consistently at 2:00 AM SAST, matching other scheduled tasks

### **2. Database Connection** ✅
- **Method:** Uses `db-connection-helper.js` for reliable database connections
- **Environment:** Automatically detects UAT vs Staging
- **Proxy Support:** Works with Cloud SQL Auth Proxy

### **3. Comprehensive Test Script** ✅
- **Location:** `scripts/test-uat-catalog-sync.js`
- **Features:**
  - Tests database connection
  - Tests MobileMart API health check
  - Tests full catalog sweep (all VAS types)
  - Shows sync statistics
  - Verifies products imported to database

---

## 🧪 **Testing the Service**

### **Prerequisites:**
1. **Cloud SQL Auth Proxy Running:**
   ```bash
   ./scripts/ensure-proxies-running.sh
   ```

2. **Environment Variables:**
   - `DATABASE_URL` or `DB_PASSWORD` in `.env` file
   - `MOBILEMART_API_URL` pointing to UAT
   - `MOBILEMART_CLIENT_ID` and `MOBILEMART_CLIENT_SECRET`

### **Run Test Script:**
```bash
# From project root
node scripts/test-uat-catalog-sync.js
```

### **Expected Output:**
```
🧪 Testing UAT Catalog Synchronization Service
================================================================================
✅ Database connection established
✅ MobileMart Supplier found
✅ Service instance created
🔄 Performing full catalog sweep...
✅ Catalog sweep completed
📊 Sync Statistics:
   Total Products Processed: X
   New Products: Y
   Updated Products: Z
   Errors: 0
```

---

## 📊 **What Gets Synced**

### **VAS Types Synced:**
1. **Airtime** - PINLESS products only (pinned products skipped)
2. **Data** - PINLESS products only (pinned products skipped)
3. **Utility/Electricity** - ALL products (both pinned and pinless)
4. **Voucher** - ALL products
5. **Bill Payment** - ALL products

### **Product Filtering:**
- **Airtime/Data:** Only syncs `pinned === false` products
- **Other Types:** Syncs all products regardless of pinned status

---

## ⏰ **Scheduled Execution**

### **Schedule:**
- **Time:** 2:00 AM SAST (Africa/Johannesburg)
- **Frequency:** Daily
- **Cron Expression:** `0 2 * * *`
- **Timezone:** `Africa/Johannesburg`

### **Service Status:**
- **Started:** When backend server starts (if `ENABLE_CATALOG_SYNC !== 'false'`)
- **Method:** `catalogSyncService.startDailyOnly()`
- **Location:** `server.js` line 684

---

## 🔍 **Verification Steps**

### **1. Check Service is Running:**
```bash
# Check backend logs for:
"✅ Catalog synchronization service (daily only) started"
"📅 Daily catalog sweep scheduled for 2:00 AM SAST"
```

### **2. Verify Products in Database:**
```sql
-- Count MobileMart products
SELECT COUNT(*) FROM products WHERE "supplierId" = (
  SELECT id FROM suppliers WHERE code = 'MOBILEMART'
);

-- Count MobileMart variants
SELECT COUNT(*) FROM "productVariants" WHERE "supplierId" = (
  SELECT id FROM suppliers WHERE code = 'MOBILEMART'
);

-- Show products by type
SELECT type, COUNT(*) 
FROM products 
WHERE "supplierId" = (SELECT id FROM suppliers WHERE code = 'MOBILEMART')
GROUP BY type;
```

### **3. Check Last Sync Time:**
```sql
-- Check last sync metadata
SELECT 
  name,
  type,
  "metadata"->>'synced_at' as last_synced
FROM products
WHERE "supplierId" = (SELECT id FROM suppliers WHERE code = 'MOBILEMART')
ORDER BY ("metadata"->>'synced_at')::timestamp DESC
LIMIT 10;
```

---

## 🐛 **Troubleshooting**

### **Issue: Service Not Starting**
- **Check:** `ENABLE_CATALOG_SYNC` environment variable
- **Solution:** Ensure it's not set to `'false'`

### **Issue: Database Connection Failed**
- **Check:** Cloud SQL Auth Proxy is running
- **Solution:** Run `./scripts/ensure-proxies-running.sh`

### **Issue: MobileMart API Errors**
- **Check:** `MOBILEMART_API_URL`, `MOBILEMART_CLIENT_ID`, `MOBILEMART_CLIENT_SECRET`
- **Solution:** Verify UAT credentials are correct

### **Issue: No Products Synced**
- **Check:** MobileMart supplier exists in database
- **Check:** MobileMart API health check passes
- **Check:** VAS type filtering (airtime/data only syncs pinless)

---

## 📝 **Manual Trigger**

To manually trigger a catalog sweep (for testing):

```javascript
// In Node.js REPL or script
const CatalogSynchronizationService = require('./services/catalogSynchronizationService');
const { Supplier } = require('./models');

const syncService = new CatalogSynchronizationService();
const supplier = await Supplier.findOne({ where: { code: 'MOBILEMART' } });
await syncService.sweepMobileMartCatalog(supplier);
```

Or use the test script:
```bash
node scripts/test-uat-catalog-sync.js
```

---

## ✅ **Success Criteria**

The service is working correctly if:
1. ✅ Service starts without errors
2. ✅ Daily sweep scheduled for 2:00 AM SAST
3. ✅ Test script completes successfully
4. ✅ Products are imported to database
5. ✅ Sync statistics show new/updated products
6. ✅ No errors in sync statistics

---

## 🔗 **Related Files**

- **Service:** `services/catalogSynchronizationService.js`
- **Test Script:** `scripts/test-uat-catalog-sync.js`
- **Database Helper:** `scripts/db-connection-helper.js`
- **Server Startup:** `server.js` (line 680-690)
- **MobileMart Auth:** `services/mobilemartAuthService.js`

---

**Status:** ✅ **READY FOR PRODUCTION USE**
