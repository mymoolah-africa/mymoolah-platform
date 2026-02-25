# Session Log: Variable-First Product Catalog Filter

**Date**: 2026-02-25  
**Time**: ~19:00 – 22:30  
**Agent**: Claude Sonnet (Cursor)  
**Status**: ✅ COMPLETE — all changes deployed to Staging and Production

---

## Session Summary

Implemented the "variable-first" product catalog strategy across all suppliers and service providers in UAT, Staging, and Production. This ensures that when a brand offers both a variable-amount product (user enters any amount within a range) AND fixed-denomination products, only the variable version is shown to users — eliminating clutter and improving UX. Fixed-only products (no variable alternative) remain fully visible.

---

## Tasks Completed

### 1. Schema Migration — `priceType` column added to `product_variants`
- **File**: `migrations/20260221_01_add_price_type_to_product_variants.js`
- Adds `priceType ENUM('variable', 'fixed')` column
- Adds `minAmount` and `maxAmount` columns (idempotent — skips if already exist)
- Adds index `idx_product_variants_price_type`
- Migration run on UAT, Staging, Production via `run-migrations-master.sh`

### 2. Variable-First Filter Script
- **File**: `scripts/apply-variable-first-filter.js`
- Classifies every `product_variants` row as `variable` or `fixed` using:
  - Name keywords: "variable", "open value", "flexi", etc.
  - `minAmount < maxAmount` (true price range)
  - `constraints.type = 'range'` or `constraints.variable = true`
  - `min == max` → always fixed (single price point)
  - `denominations.length >= 2` → always fixed (picker list)
- For each `(brandId, productType)` group: keeps variable variants active, deactivates fixed duplicates
- Exceptions: `electricity`, `bill_payment` (always keep all), subscription brands (Netflix, DStv, Showmax etc.)
- Supports `--dry-run`, `--uat`, `--staging`, `--production`, `--all`

### 3. Diagnostic Script
- **File**: `scripts/diagnose-variable-products.js`
- Shows exactly what will be classified and why before applying
- Supports `--brand <name>` filter for targeted inspection

### 4. Model Update
- **File**: `models/ProductVariant.js`
- Added `priceType` field and `idx_product_variants_price_type` index to Sequelize model

### 5. API Update
- **File**: `services/productCatalogService.js`
- `_getCommonIncludes()`: now orders variants variable-first in all product listing queries
- `_transformProduct()`: now returns `priceType`, `minAmount`, `maxAmount` for variable products; `denominations` array for fixed products

### 6. Flash Bootstrap Re-run
- Re-ran `node scripts/bootstrap-flash-supplier.js --all` to confirm Flash catalog integrity post-changes
- All environments confirmed healthy (0 failed)

### 7. Full Deployment
- All 4 Cloud Run services rebuilt and redeployed from local Mac:
  - Staging backend: revision `mymoolah-backend-staging-00190-g6r`
  - Staging frontend: revision `mymoolah-wallet-staging-00041-8wc`
  - Production backend: revision `mymoolah-backend-production-00018-bg4`
  - Production frontend: revision `mymoolah-wallet-production-00005-dpq`

---

## Key Decisions

1. **Variable-first, not variable-only**: Fixed products where no variable alternative exists remain fully active. Only fixed products that have a variable counterpart for the same brand+type are deactivated.

2. **Exceptions preserved**: `electricity` and `bill_payment` types always keep all variants (they are meter-driven/reference-driven, inherently variable but not selectable by amount). Subscription brands (Netflix, DStv, Showmax, Intercape) keep all tiers.

3. **Status = 'inactive' not deleted**: Fixed duplicates are set to `status='inactive'` rather than deleted. This is reversible and safe.

4. **Classification is conservative**: Default is `fixed`. A product is only classified `variable` if explicit signals exist.

5. **Diagnostic-first approach**: Ran `--dry-run` and `diagnose-variable-products.js` multiple times to verify correctness before applying. Caught and fixed a false-positive classification bug (single-denomination products with `min==max` were wrongly classified as variable in first version).

---

## Results Applied

### UAT
- 230 variants: all marked `fixed` (Flash only, no variable products)
- 7 empty placeholder products deactivated (MTN Airtime, Vodacom Airtime, Cell C Airtime, MTN Data Bundle, Prepaid Electricity, Takealot Voucher, Hollywood Bets Voucher — these had no real variants)

### Staging
- 2,071 variants processed
- **5 variable variants activated** (MobileMart Pinless Variable for MTN, Vodacom, Telkom, CellC + OTT Variable Voucher)
- **107 fixed variants deactivated** (duplicates superseded by variable versions)
- **107 products deactivated** (their only variants were the now-inactive fixed ones)
- Active variable: 5 | Active fixed: 1,959 | Inactive: 107

### Production
- 1,855 variants: all marked `fixed` (Flash only, no variable products in Production yet)
- MobileMart not yet live on Production — variable filter will auto-apply correctly when MobileMart goes live

---

## Files Modified

| File | Change |
|---|---|
| `migrations/20260221_01_add_price_type_to_product_variants.js` | NEW — schema migration |
| `scripts/apply-variable-first-filter.js` | NEW — main filter script |
| `scripts/diagnose-variable-products.js` | NEW — diagnostic tool |
| `models/ProductVariant.js` | Added `priceType` field + index |
| `services/productCatalogService.js` | Variable-first ordering + API response fields |

---

## Commits This Session

```
b0cceb7e tools: add diagnose-variable-products.js for catalog inspection before applying filter
1be49b0c fix: correct variable classification — min==max is fixed, not variable
e14f418c fix: make priceType migration idempotent — skip minAmount/maxAmount if already exist
2f85ed08 feat: implement variable-first product catalog filter for all suppliers
```

---

## Issues Encountered & Fixes

1. **Migration failed on UAT** — `minAmount`/`maxAmount` already existed in `product_variants` from an earlier migration. Fixed by making migration idempotent (checks existing columns before adding).

2. **False-positive variable classification** — First version used `denominations.length === 1` as a variable signal. MobileMart stores all fixed-price products with a single denomination (e.g. `[500]` for "OTT R5"), so every MobileMart product was wrongly classified as variable. Fixed: `min == max` always means fixed; `min < max` (true range) means variable.

3. **Production ECONNRESET** — Proxy timed out between long Staging and Production operations. Fixed by restarting proxies (`pkill -f cloud-sql-proxy && ./scripts/ensure-proxies-running.sh`) and running Production separately.

---

## Next Steps for Next Agent

1. **Frontend UI for variable products** — The API now returns `priceType`, `minAmount`, `maxAmount`. The frontend needs to be updated to:
   - Show an amount-entry input (with min/max validation) when `priceType === 'variable'`
   - Show a denomination picker when `priceType === 'fixed'`
   - Display "Enter amount: R10 – R5,000" for variable products like OTT Variable Voucher

2. **MobileMart on Production** — When MobileMart is activated on Production, run `node scripts/apply-variable-first-filter.js --production` again to apply the variable-first filter to the new products.

3. **Staging parity** — Staging has 173 Flash products vs 174 in UAT/Production. This is a pre-existing gap (one Flash voucher product has conflicting `productId` in Staging). Not a new issue from this session.

4. **Flash supplier_floats** — The Flash `supplier_floats` row is missing in both Staging and Production (only exists in UAT). This was pre-existing and not related to this session's work.

---

## Environment Status After Session

| Environment | Backend | Frontend | DB Migration | Variable Filter |
|---|---|---|---|---|
| UAT | ✅ Latest | N/A | ✅ Applied | ✅ Applied |
| Staging | ✅ Deployed rev-00190 | ✅ Deployed rev-00041 | ✅ Applied | ✅ Applied |
| Production | ✅ Deployed rev-00018 | ✅ Deployed rev-00005 | ✅ Applied | ✅ Applied |
