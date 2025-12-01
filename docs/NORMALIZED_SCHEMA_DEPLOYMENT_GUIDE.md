# Normalized Product Schema Deployment Guide
**MyMoolah Treasury Platform - Staging Deployment**

**Date:** December 1, 2025  
**Version:** 2.0.0  
**Breaking Change:** Yes - Schema Consolidation

---

## 🎯 Overview

This guide details the deployment of **normalized product schema** to fix staging wallet errors and eliminate schema drift between environments.

### What Changed:
- ❌ **OLD**: Hybrid schema with supplier-specific tables (`flash_products`, `mobilemart_products`, `vas_products`)
- ✅ **NEW**: Single normalized schema using `product_variants` with supplier-agnostic fields

### Benefits:
- ✅ **No more schema drift** between dev, staging, and production
- ✅ **Easy cross-supplier comparison** (e.g., Flash MTN vs MobileMart MTN)
- ✅ **Easy to add new suppliers** (no new tables required)
- ✅ **API changes don't break schema** (stored in metadata JSONB)
- ✅ **Fixes staging wallet errors** (`FlashProduct.vasType does not exist`)

---

## 📋 Pre-Deployment Checklist

### Local Dev Environment:
- [x] Migration created: `20251201_consolidate_to_normalized_product_schema.js`
- [x] Services updated: `supplierComparisonService.js`
- [x] Product mappers created: `flashProductMapper.js`, `mobilemartProductMapper.js`
- [x] Changes committed to git

### Before Deploying:
- [ ] Run migration in local dev
- [ ] Test supplier comparison API
- [ ] Verify schema comparison (dev vs staging)
- [ ] Push to GitHub
- [ ] Pull in Codespaces
- [ ] Run migration in Codespaces
- [ ] Deploy to staging
- [ ] Run migration in staging
- [ ] Test staging wallet

---

## 🚀 Deployment Steps

### Step 1: Test Migration Locally (Dev)

Run the migration on your local dev database:

```bash
# Start local postgres (if not already running)
# Assuming you have local postgres on port 5432

# Run migration
npx sequelize-cli db:migrate --config config/config.json --env development

# Verify migration
npx sequelize-cli db:migrate:status
```

**Expected Output:**
```
✅ Step 1 complete: product_variants schema enhanced
✅ Step 2 complete: Indexes added
✅ Product schema consolidation complete!
```

**Verify Schema:**
```bash
# Check product_variants table
psql -h localhost -U mymoolah_app -d mymoolah -c "\d product_variants"
```

**Test Supplier Comparison Service:**
```bash
# Start your local backend
npm start

# Test API endpoint
curl http://localhost:8080/api/v1/suppliers/compare/airtime
```

---

### Step 2: Compare Schemas (Dev vs Staging)

Before deploying, verify dev and staging schemas are in sync:

```bash
# Start dual proxies (UAT=dev, Staging=staging)
./scripts/start-dual-proxies.sh

# Compare schemas
node scripts/compare-uat-staging-schemas.js
```

**Expected Output (BEFORE migration in staging):**
```
❌ SCHEMAS ARE DIFFERENT
Tables with differences: 1
- product_variants: Missing columns in Staging (vasType, transactionType, etc.)
```

---

### Step 3: Push to GitHub

```bash
# Ensure all changes are committed
git status

# Push to GitHub
git push origin main
```

---

### Step 4: Deploy to Codespaces

**In Codespaces terminal:**

```bash
# Pull latest changes
git pull origin main

# Check migration status
npx sequelize-cli db:migrate:status

# Run migration
npx sequelize-cli db:migrate

# Verify migration
npx sequelize-cli db:migrate:status
```

**Expected Output:**
```
✅ 20251201_consolidate_to_normalized_product_schema.js [EXECUTED]
```

**Test in Codespaces:**
```bash
# Start backend (if not already running)
npm start

# Test supplier comparison
curl http://localhost:8080/api/v1/suppliers/compare/airtime
```

---

### Step 5: Deploy to Staging (Cloud Run)

**In Codespaces (authenticated with gcloud):**

```bash
# Authenticate (if needed)
gcloud auth login
gcloud config set project mymoolah-db

# Build and deploy to staging
# This will:
# 1. Build Docker image
# 2. Push to GCR
# 3. Deploy to Cloud Run
# 4. Run migrations automatically (if configured)

# Option A: Use existing deployment script
./scripts/deploy-cloud-run-staging.sh

# Option B: Manual deployment
docker build -t gcr.io/mymoolah-db/mymoolah-backend-staging:latest .
docker push gcr.io/mymoolah-db/mymoolah-backend-staging:latest

gcloud run deploy mymoolah-backend-staging \
  --image gcr.io/mymoolah-db/mymoolah-backend-staging:latest \
  --region africa-south1 \
  --platform managed \
  --allow-unauthenticated \
  --service-account mymoolah-backend-sa@mymoolah-db.iam.gserviceaccount.com \
  --set-env-vars NODE_ENV=production,STAGING=true \
  --add-cloudsql-instances mymoolah-db:africa-south1:mmtp-pg-staging
```

---

### Step 6: Run Migrations in Staging Database

**After deployment, run migrations on staging database:**

```bash
# Option A: From Codespaces with staging proxy
./scripts/start-staging-proxy-cs.sh
./scripts/run-migrations-staging.sh

# Option B: Manual migration via Cloud SQL Proxy
cloud-sql-proxy mymoolah-db:africa-south1:mmtp-pg-staging --port 5434 &

# Run migration against staging DB
NODE_ENV=production DB_HOST=127.0.0.1 DB_PORT=5434 npx sequelize-cli db:migrate
```

**Verify Migration:**
```bash
# Check migration status
NODE_ENV=production DB_HOST=127.0.0.1 DB_PORT=5434 npx sequelize-cli db:migrate:status

# Verify product_variants schema
psql -h 127.0.0.1 -p 5434 -U mymoolah_app -d mymoolah -c "\d product_variants"
```

---

### Step 7: Verify Staging Deployment

**Test Staging Backend:**
```bash
# Health check
curl https://staging.mymoolah.africa/health

# Supplier comparison API
curl https://staging.mymoolah.africa/api/v1/suppliers/compare/airtime
```

**Test Staging Wallet:**
1. Open https://stagingwallet.mymoolah.africa
2. Login with test credentials
3. Navigate to "Airtime" or "Data" section
4. Verify product comparison works
5. Check browser console for errors

**Expected Result:**
- ✅ No `FlashProduct.vasType does not exist` errors
- ✅ Product comparison loads successfully
- ✅ Supplier deals displayed correctly

---

### Step 8: Compare Schemas (Post-Deployment)

Verify dev and staging are now in sync:

```bash
# Start dual proxies
./scripts/start-dual-proxies.sh

# Compare schemas
node scripts/compare-uat-staging-schemas.js
```

**Expected Output (AFTER migration):**
```
✅ SCHEMAS ARE IDENTICAL - No differences found!
Tables only in UAT: 0
Tables only in Staging: 0
Tables with differences: 0
Identical tables: 100
```

---

## 🧪 Testing Checklist

### Backend API Tests:
- [ ] `/api/v1/suppliers/compare/airtime` - Returns products
- [ ] `/api/v1/suppliers/compare/data` - Returns products
- [ ] Response includes `vasType`, `provider`, `commission` fields
- [ ] Response includes both Flash and MobileMart products
- [ ] Promotional products are flagged correctly

### Frontend Wallet Tests:
- [ ] Airtime page loads without errors
- [ ] Data page loads without errors
- [ ] Product comparison displays correctly
- [ ] Can select a product
- [ ] Can complete a transaction
- [ ] No console errors

### Database Tests:
```sql
-- Verify product_variants has new columns
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'product_variants' 
  AND column_name IN ('vasType', 'transactionType', 'networkType', 'isPromotional', 'commission');

-- Count active product variants by supplier
SELECT s.name, COUNT(*) as product_count
FROM product_variants pv
JOIN suppliers s ON pv."supplierId" = s.id
WHERE pv.status = 'active'
GROUP BY s.name;

-- Verify indexes exist
SELECT indexname FROM pg_indexes WHERE tablename = 'product_variants';
```

---

## 🔄 Rollback Plan

If deployment fails or issues arise:

### Step 1: Rollback Migration (Staging)
```bash
# Connect to staging database
./scripts/start-staging-proxy-cs.sh

# Rollback migration
NODE_ENV=production DB_HOST=127.0.0.1 DB_PORT=5434 \
  npx sequelize-cli db:migrate:undo

# Verify rollback
NODE_ENV=production DB_HOST=127.0.0.1 DB_PORT=5434 \
  npx sequelize-cli db:migrate:status
```

### Step 2: Rollback Code Deployment
```bash
# Revert to previous commit
git revert HEAD
git push origin main

# Redeploy previous version
./scripts/deploy-cloud-run-staging.sh
```

### Step 3: Verify Rollback
```bash
# Test staging
curl https://staging.mymoolah.africa/health

# Test wallet
# Open https://stagingwallet.mymoolah.africa
```

---

## 📊 Success Criteria

✅ **Migration Complete** when:
1. Migration runs successfully in dev, Codespaces, and staging
2. Schema comparison shows identical schemas
3. Supplier comparison API returns products
4. Staging wallet loads without errors
5. Product comparison works in staging wallet
6. No console errors in browser
7. Can complete test transactions

---

## 🐛 Troubleshooting

### Issue: `column FlashProduct.vasType does not exist`
**Cause:** Migration hasn't run or rollback occurred  
**Fix:** Run migration again: `npx sequelize-cli db:migrate`

### Issue: `Cannot find module 'ProductVariant'`
**Cause:** Model not loaded correctly  
**Fix:** Restart backend: `npm start`

### Issue: `No products returned from supplier comparison`
**Cause:** No product variants in database  
**Fix:** Use product mappers to sync products:
```javascript
const FlashProductMapper = require('./services/productMappers/flashProductMapper');
const mapper = new FlashProductMapper();
// Sync products from Flash API
```

### Issue: Migration hangs or times out
**Cause:** Database connection issue or long-running transaction  
**Fix:**
1. Check database connection: `psql -h 127.0.0.1 -p 5434 -U mymoolah_app -d mymoolah`
2. Check for locks: `SELECT * FROM pg_locks WHERE NOT granted;`
3. Kill hanging queries if needed

---

## 📝 Post-Deployment Tasks

### Immediate (Day 1):
- [ ] Monitor staging logs for errors
- [ ] Test critical user flows (airtime, data, electricity)
- [ ] Verify supplier comparison performance
- [ ] Check for any console errors

### Short-term (Week 1):
- [ ] Monitor transaction success rates
- [ ] Collect user feedback on staging
- [ ] Optimize queries if needed
- [ ] Update documentation

### Long-term (Month 1):
- [ ] Consider dropping legacy tables (`flash_products`, `mobilemart_products`, `vas_products`)
- [ ] Add more suppliers using product mappers
- [ ] Implement automated product syncing from supplier APIs
- [ ] Add caching for supplier comparison

---

## 🔗 Related Documentation

- [Schema Comparison Guide](./scripts/SCHEMA_COMPARISON_GUIDE.md)
- [Product Mappers README](../services/productMappers/README.md)
- [GCP Staging Deployment](./GCP_STAGING_DEPLOYMENT.md)
- [Agent Handover](./agent_handover.md)

---

## 💡 Next Steps

After successful deployment:

1. **Populate Products:**
   - Use product mappers to sync products from supplier APIs
   - Flash: `FlashProductMapper.bulkSyncProducts(flashProducts)`
   - MobileMart: `MobileMartProductMapper.bulkSyncProducts(mmProducts)`

2. **Add More Suppliers:**
   - Create new mapper (e.g., `zapperProductMapper.js`)
   - Follow pattern in `services/productMappers/README.md`
   - No database changes needed!

3. **Drop Legacy Tables** (after validation):
   - Wait 2-4 weeks for confidence
   - Create migration to drop `flash_products`, `mobilemart_products`, `vas_products`
   - Update any remaining references

4. **Automate Product Syncing:**
   - Create scheduled job to sync products from supplier APIs
   - Use product mappers for consistent data structure
   - Run daily or on-demand

---

## 👥 Support

**For deployment issues:**
- Check logs: `gcloud logging read "resource.type=cloud_run_revision" --limit 50`
- Contact: MyMoolah Development Team
- Reference: Normalized Schema Migration (Dec 1, 2025)

**Version:** 2.0.0  
**Last Updated:** 2025-12-01  
**Deployment Target:** Staging → Production (after validation)
