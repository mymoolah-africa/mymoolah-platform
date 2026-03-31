# Session Log: MobileMart Commission Rates & Data Product Curation

**Date:** 2026-03-31 21:00 SAST  
**Agent:** Claude Opus  
**Previous session:** 2026-03-31_1800_flash-contractual-commission-rates.md

---

## Summary

Implemented MobileMart contractual commission rates from Annexure A (1 Aug 2024) across UAT, staging, and production. Added a `featured` column to `product_variants` for API-driven data product curation, selecting ~50 affordable bundles per environment targeting low-income South African users. Updated the catalog sync service with MobileMart contractual rate lookup and automatic featured re-curation after each daily sync.

## Tasks Completed

1. **Migration: `featured` column** — Added `featured` BOOLEAN to `product_variants` with partial index. Run on UAT, staging, production.
2. **MobileMart commission rates** — Updated `product_variants.commission` with contractual rates:
   - Vodacom/MTN airtime/data: 4.50% (incl. VAT)
   - Cell C airtime/data: 4.80% (incl. VAT)
   - Telkom airtime/data: 3.50% (incl. VAT)
   - DStv/Multichoice: R3.30 fixed per transaction
   - Bill payments: R1.90 fixed (default)
   - Electricity: 1.00% (weighted average)
   - Vouchers: Various (1%-10% per brand)
3. **MobileMart commission tiers** — Upserted `supplier_commission_tiers` rows for pricing service lookups.
4. **Data product curation** — Rule-based, API-driven selection of ~12-15 products per network:
   - WhatsApp bundles (2-3 per network, R3-R40)
   - Social media (TikTok, Facebook, YouTube, R5-R25)
   - Daily/Weekly general data (R5-R70)
   - Monthly value bundles (R30-R175)
   - All Network / LTE value (R79-R99)
5. **Catalog sync integration** — `getMobileMartContractualCommission()` added to `CatalogSynchronizationService`. Featured re-curation runs automatically after each daily sweep.
6. **Backend filtering** — `GET /api/v1/overlay/airtime-data/catalog` now filters data products by `featured=true` with fallback to all products if none are featured.

## Key Decisions

- **API is source of truth**: Product selection is fully dynamic from API-synced data. No static spreadsheet references. The Excel/PDF documents were only used for commission rates (contractual, fixed) — not for product IDs.
- **Commission rates are VAT-inclusive** (MobileMart Annexure A states "All pricing includes VAT").
- **Target audience**: Low-income blue collar workers in SA. Product selection prioritizes WhatsApp, social media, and affordable bundles (R3-R175 range). No premium R300+ bundles.
- **MobileMart preferred over Flash** for airtime/data: Higher commission (4.5% vs 3.0% for MTN/Vodacom).

## Files Modified

| File | Change |
|------|--------|
| `migrations/20260331_03_add_featured_to_product_variants.js` | NEW — adds `featured` BOOLEAN column + partial index |
| `scripts/update-mobilemart-commission-rates.js` | NEW — sets contractual rates in product_variants |
| `scripts/update-mobilemart-commission-tiers.js` | NEW — upserts supplier_commission_tiers |
| `scripts/mark-featured-data-products.js` | NEW — rule-based, API-driven data product curation |
| `models/ProductVariant.js` | Added `featured` field to Sequelize model |
| `services/catalogSynchronizationService.js` | Added `getMobileMartContractualCommission()`, updated `mapMobileMartToProductVariant()`, added featured re-curation after daily sweep |
| `routes/overlayServices.js` | Data products query filters by `featured=true` with fallback |

## Database Changes

- `product_variants.featured` BOOLEAN NOT NULL DEFAULT false — all environments
- `product_variants.commission` updated for all MOBILEMART products — all environments
- `supplier_commission_tiers` rows upserted for MOBILEMART — all environments
- `product_variants.featured=true` set for curated data products — all environments

## Issues Encountered

- MobileMart `supplierProductId` values are Firestore-style hashes (e.g., `0ekytIEVVEyayAuBXXmq`), not the numeric PRD IDs from the spreadsheet. Switched to name-based pattern matching.
- Product names and prices in the database differ from the Excel spreadsheet (API data is more current). Confirmed that API data should be the single source of truth.
- Initial featured selection was skewed toward cheapest tiny bundles. Redesigned with price-tier-based selection (budget/mid/value per category).

## Next Steps

- Test the airtime/data overlay in Codespaces to verify featured products display correctly
- Consider adding product sorting (by price or popularity) in the frontend data bundle view
- The `mark-featured-data-products.js` script can be further tuned based on user analytics (once available)
- Remaining 22 MobileMart products at default 2.50% in staging/production are likely niche vouchers — can be updated as agreements are confirmed

## Context for Next Agent

- MobileMart commission infrastructure is now complete (parallel to Flash which was done in the previous session).
- The `featured` flag approach is banking-grade: API-driven, rule-based, automated via daily sync. No manual spreadsheet maintenance needed.
- The backend catalog endpoint has a safety fallback: if no featured data products exist, it returns all active products (prevents empty catalog).
