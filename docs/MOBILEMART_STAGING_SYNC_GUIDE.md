# MobileMart Production to Staging Sync - Execution Guide

**Date**: January 10, 2026  
**Purpose**: Import all MobileMart production products into Staging database  
**Environment**: Codespaces (where proxies are running)

---

## 🎯 OBJECTIVE

Import **ALL** MobileMart production products (7,654 products) into the Staging product catalog while maintaining the supplier comparison ranking system.

---

## 📋 PRE-REQUISITES

✅ **Proxies Running** (verify in Codespaces PORTS tab):
- Port 6543: UAT proxy (`mmtp-pg`)
- Port 6544: Staging proxy (`mmtp-pg-staging`)

✅ **Secret Manager Access**:
- `mobilemart-prod-client-id`
- `mobilemart-prod-client-secret`
- `mobilemart-prod-api-url`
- `db-mmtp-pg-staging-password`

✅ **gcloud Authentication**:
```bash
gcloud auth list  # Verify you're authenticated
```

---

## 🚀 EXECUTION STEPS (Run in Codespaces)

### **Step 1: Pull Latest Code from GitHub**

```bash
cd /workspaces/mymoolah-platform
git pull origin main
```

### **Step 2: Compare Database Schemas (UAT vs Staging)**

```bash
# Ensure schemas are identical
node scripts/compare-schemas-with-helper.js
```

**Expected Output**: ✅ SCHEMAS ARE IDENTICAL

If schemas differ, run migrations on Staging first:
```bash
./scripts/run-migrations-master.sh staging
```

### **Step 3: Count Current Products in Staging**

```bash
# See what's already in Staging
node scripts/count-staging-mobilemart-products.js
```

### **Step 4: Count Production API Products**

```bash
# Verify access to Production API
node scripts/count-mobilemart-production-products.js
```

**Expected Output**: ~7,654 total products
- Airtime: 177 products
- Data: 597 products
- Voucher: 108 products
- Bill Payment: 3,386 products
- Utility: 3,386 products

### **Step 5: Execute Full Sync (Production → Staging)**

```bash
# This will take 5-10 minutes for 7,654 products
node scripts/sync-mobilemart-production-to-staging.js
```

**What this does**:
1. ✅ Fetches all products from MobileMart Production API
2. ✅ Filters products (airtime/data: PINLESS only, electricity: PINNED only)
3. ✅ Creates/updates ProductBrands
4. ✅ Creates/updates Products
5. ✅ Creates/updates ProductVariants
6. ✅ Sets correct priorities (MobileMart=2, Flash=1)
7. ✅ Sets commission rates (MobileMart=2.5%)

### **Step 6: Verify Sync Completed**

```bash
# Count products again
node scripts/count-staging-mobilemart-products.js
```

**Expected Output**: Should match Production counts from Step 4

### **Step 7: Test Supplier Comparison Service**

```bash
# Verify ranking logic still works (commission → price → Flash preference)
node -e "
const { getStagingClient, closeAll } = require('./scripts/db-connection-helper');

async function test() {
  const client = await getStagingClient();
  
  // Test: Get MTN R10 airtime from both suppliers
  const result = await client.query(\`
    SELECT 
      pv.\"vasType\",
      pv.provider,
      pv.commission,
      pv.\"minAmount\",
      pv.priority,
      s.name as supplier,
      s.code as supplier_code
    FROM product_variants pv
    JOIN suppliers s ON pv.\"supplierId\" = s.id
    WHERE pv.\"vasType\" = 'airtime'
      AND pv.provider ILIKE '%MTN%'
      AND pv.\"minAmount\" <= 1000
      AND pv.\"maxAmount\" >= 1000
    ORDER BY pv.commission DESC, pv.\"minAmount\" ASC, s.code ASC
    LIMIT 5
  \`);
  
  console.log('\\n📊 MTN R10 Airtime - Supplier Ranking:\\n');
  result.rows.forEach((row, i) => {
    console.log(\`  \${i+1}. \${row.supplier} (\${row.supplier_code})\`);
    console.log(\`     Commission: \${row.commission}%\`);
    console.log(\`     Priority: \${row.priority}\`);
    console.log(\`     Amount: R\${(row.minAmount/100).toFixed(2)}\\n\`);
  });
  
  client.release();
  await closeAll();
}

test();
"
```

**Expected Output**: Products ranked by:
1. Highest commission first
2. Lowest price second
3. Flash before MobileMart on ties

---

## 📊 SUCCESS CRITERIA

✅ **All checks must pass**:

1. ✅ Schemas are identical (UAT = Staging)
2. ✅ Production API accessible (~7,654 products)
3. ✅ Sync completed without errors
4. ✅ Product counts match in Staging
5. ✅ Supplier ranking works correctly
6. ✅ MobileMart products visible in catalog

---

## 🔍 TROUBLESHOOTING

### **Issue: Proxy not running**
```bash
# Check ports
lsof -i :6543  # UAT
lsof -i :6544  # Staging

# Restart if needed
./scripts/ensure-proxies-running.sh
```

### **Issue: Secret Manager access denied**
```bash
# Re-authenticate
gcloud auth application-default login
gcloud config set project mymoolah-db
```

### **Issue: Sync fails partway through**
```bash
# Check which products failed
node scripts/count-staging-mobilemart-products.js

# Re-run sync (it's idempotent - won't duplicate)
node scripts/sync-mobilemart-production-to-staging.js
```

### **Issue: Schema differences found**
```bash
# Run migrations on Staging
./scripts/run-migrations-master.sh staging

# Verify parity
node scripts/compare-schemas-with-helper.js
```

---

## ⚠️ IMPORTANT NOTES

1. **Idempotent**: Sync script is safe to run multiple times
2. **No Duplicates**: Uses `ON CONFLICT` to update existing products
3. **Filtering**: Airtime/Data = PINLESS only, Electricity = PINNED only
4. **Commission**: MobileMart defaults to 2.5% (verify in `supplier_commission_tiers`)
5. **Priority**: MobileMart = 2 (Flash = 1, so Flash wins on ties)
6. **Database**: Staging = `mymoolah_staging` on `mmtp-pg-staging`

---

## 📚 RELATED SCRIPTS

- `compare-schemas-with-helper.js` - Schema comparison
- `count-staging-mobilemart-products.js` - Count Staging products
- `count-mobilemart-production-products.js` - Count Production API products
- `sync-mobilemart-production-to-staging.js` - Full sync script
- `db-connection-helper.js` - Database connection helper (used by all)

---

## 🎯 NEXT STEPS AFTER SYNC

1. **Test in Staging UI**: Verify products visible in product catalog
2. **Test Purchases**: Test purchase flow with MobileMart products
3. **Verify Comparison**: Confirm supplier comparison returns best deals
4. **Monitor Performance**: Check API response times
5. **Update Commission Rates**: Adjust in `supplier_commission_tiers` if needed

---

**Last Updated**: January 10, 2026  
**Status**: ✅ Ready for execution in Codespaces  
**Estimated Time**: 5-10 minutes for full sync
