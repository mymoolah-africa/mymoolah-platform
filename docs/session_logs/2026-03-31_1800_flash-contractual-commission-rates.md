# Session Log: Flash Contractual Commission Rates

**Date**: 2026-03-31 18:00
**Agent**: Cursor AI (Claude)
**Duration**: ~2 hours
**Status**: Code complete, pending migration + script execution in Codespaces

---

## Summary

Replaced hardcoded 2.50% commission rates for Flash products with actual contractual rates from the Flash agreement (March 2026). Added support for fixed-amount commissions (e.g., Flash Token R3.00, DSTV R3.00) in addition to existing percentage-based commissions. Updated eeziCash fee schedule.

## Prior Context

- Previous session simplified airtime/data product display (one card per network, R2-R999 variable amount).
- Frontend was preferring MobileMart over Flash when commissions were tied.
- Discovery: all Flash and MobileMart commissions were hardcoded to 2.50% in catalogSynchronizationService.js and the database.
- Andre provided Flash contract PDF with actual commission rates.

## Tasks Completed

1. **Frontend fix committed and pushed** (Phase 0)
   - MobileMart preference in product grouping
   - Airtime range enforced to R2-R999

2. **Migration created** (Phase 1)
   - `20260331_02_add_commission_type_columns.js`
   - Adds `commissionType` ENUM ('percentage', 'fixed_amount') to `product_variants` and `supplier_commission_tiers`
   - Adds `fixedAmountCents` INTEGER to `supplier_commission_tiers`
   - Idempotent (checks IF NOT EXISTS)

3. **Commission update scripts** (Phase 2 + 4)
   - `scripts/update-flash-commission-rates.js` — updates product_variants per environment
   - `scripts/update-flash-commission-tiers.js` — updates supplier_commission_tiers per environment
   - Both idempotent, support --uat, --staging, --production, --all flags

4. **Catalog sync updated** (Phase 3)
   - `catalogSynchronizationService.js` — new `getFlashContractualCommission()` method replaces hardcoded 2.50%
   - MobileMart left at 2.50% with TODO comment (next session)

5. **Commission/VAT service updated** (Phase 5)
   - `supplierPricingService.js` — new `getCommissionInfo()` and `computeCommissionFromInfo()` for fixed-amount support
   - `commissionVatService.js` — `calculateCommissionCents()` now uses `getCommissionInfo()` 
   - `productPurchaseService.js` — `calculatePricing()` updated
   - `flashController.js` — `purchaseEeziVoucher` updated

6. **eeziCash fee schedule script** (Phase 6)
   - `scripts/update-eezicash-fees.js` — sets R0.50 token generation + R4.50 token redemption (VAT excl) in supplier_fee_schedule
   - Customer-facing R8.00 fee already correctly implemented in flashController.js (purchaseCashOutPin)

## Key Decisions

| Decision | Rationale |
|----------|-----------|
| Add commissionType to both product_variants AND supplier_commission_tiers | product_variants = catalog display; supplier_commission_tiers = purchase-time calculation |
| Keep getCommissionRatePct backward-compatible | Avoid breaking any callers we haven't found |
| Flash first, MobileMart later | Isolates risk; Flash has the most complex fee structure |
| Default bill_payment to 2.50% | Flash Pay default when no specific biller match |
| Municipality fixed at R2.00 | Contract says R2.00-R2.50; using R2.00 as conservative default |
| eeziCash R8.00 fee unchanged | Already correctly hardcoded in purchaseCashOutPin |

## Flash Commission Rates (from contract, VAT-inclusive)

- Cellular (airtime/data): 3.00% (Cell C, MTN, Telkom, Vodacom, FNB Connect)
- Eezi Vouchers: 3.50% | Eezi Power: 1.00%
- Electricity: 0.85%
- Gift vouchers: 2.40%-7.00% (per brand, see script)
- Flash Token: R3.00 fixed | DSTV: R3.00 fixed
- 1Voucher/FNB Voucher: 1.00% | Municipalities: R2.00 fixed
- eeziCash fees (cost to MMTP): R0.50 generation + R4.50 redemption (VAT excl)

## eeziCash Accounting (per transaction)

- Customer fee: R8.00 (VAT incl) → Revenue R6.96 + VAT R1.04
- Flash cost: R5.00 (VAT excl) → Cost R5.00 + VAT input R0.75 = R5.75
- MMTP margin: R1.96 | Net VAT payable: R0.29

## Files Modified

| File | Change |
|------|--------|
| `migrations/20260331_02_add_commission_type_columns.js` | NEW — adds commissionType + fixedAmountCents |
| `scripts/update-flash-commission-rates.js` | NEW — updates product_variants |
| `scripts/update-flash-commission-tiers.js` | NEW — updates supplier_commission_tiers |
| `scripts/update-eezicash-fees.js` | NEW — updates supplier_fee_schedule |
| `services/supplierPricingService.js` | MODIFIED — added getCommissionInfo, computeCommissionFromInfo |
| `services/commissionVatService.js` | MODIFIED — calculateCommissionCents uses getCommissionInfo |
| `services/productPurchaseService.js` | MODIFIED — calculatePricing uses getCommissionInfo |
| `services/catalogSynchronizationService.js` | MODIFIED — Flash sync uses contractual rates |
| `controllers/flashController.js` | MODIFIED — purchaseEeziVoucher uses getCommissionInfo |
| `models/ProductVariant.js` | MODIFIED — added commissionType field |
| `mymoolah-wallet-frontend/services/apiService.ts` | COMMITTED — MobileMart preference + R2-R999 |

## Issues / Risks

- Migration must run BEFORE the update scripts (scripts check for new columns and adapt)
- MobileMart commission rates still at 2.50% default — needs next session with MobileMart agreement
- Gift voucher rate matching uses LIKE patterns on product names — may miss some if Flash API names differ significantly
- The `update-flash-commission-tiers.js` ON CONFLICT clause may need adjustment if the unique constraint on supplier_commission_tiers doesn't cover all needed columns

## Next Steps

1. In Codespaces: Pull, run migrations on all 3 envs, run update scripts
2. Verify commission calculations on UAT with a test purchase
3. Next session: Add MobileMart contractual rates from their agreement
4. Consider: Admin portal screen to view/edit commission rates

## Context for Next Agent

- Flash commission infrastructure is complete. MobileMart needs same treatment.
- The `getFlashContractualCommission()` method in catalogSynchronizationService has ALL Flash rates in a lookup function — this prevents the daily catalog sync from overwriting with wrong rates.
- The `supplier_commission_tiers` table is what the ledger actually reads at purchase time via `supplierPricingService.getCommissionInfo()`.
- The `product_variants.commission` column is informational (frontend display, grouping).
- eeziCash fees (R0.50 + R4.50) are in `supplier_fee_schedule` — the R8.00 customer fee is hardcoded in `purchaseCashOutPin` in flashController.js.
