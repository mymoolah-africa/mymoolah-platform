# Session Log - 2026-04-05 - Electricity Commission-Based Supplier Comparison

**Session Date**: 2026-04-05 ~15:00-18:10 SAST  
**Agent**: Cursor AI Agent  
**User**: Andre  
**Session Duration**: ~3 hours

---

## Session Summary

Investigated failed electricity purchases for user 0720213994 (meter 04285639987), identified MobileMart API timeout as root cause. Implemented commission-based supplier comparison for electricity (same pattern as airtime/data), including ProductVariant-based routing, circuit breaker + failover, and correct ledger journal entries. Fixed MobileMart R30 minimum amount requirement, dynamic min/max in frontend, and corrected the token delivery notice text. Deployed v2 to both staging and production.

---

## Tasks Completed
- [x] Investigated production electricity purchase failures (MobileMart timeout on prevend)
- [x] Increased MobileMart API timeout from 30s to 60s (prior commit)
- [x] Added retry mechanism for both MobileMart and Flash API calls (prior commit)
- [x] Added user-friendly ErrorModal for failed purchases (prior commit)
- [x] Routed electricity through `v_best_offers` materialized view in `productCatalogService.js`
- [x] Added `productId` to electricity purchase payload in `overlayService.ts`
- [x] Frontend stores winning variant ID from catalog and sends in purchase call
- [x] Refactored electricity purchase route: ProductVariant resolution, circuit breaker, failover
- [x] Correct supplierId derivation for ledger journal entries (face-value + commission)
- [x] Fixed MobileMart R30 minimum amount validation (was R20, MobileMart rejects below R30)
- [x] Dynamic min/max from catalog in frontend (no more hardcoded R20/R2000)
- [x] Fixed token delivery notice: removed SMS mention
- [x] Deployed `20260405_v2` to staging (backend + wallet)
- [x] Deployed `20260405_v2` to production (backend + wallet)
- [x] Verified successful R30 electricity purchase on production (MobileMart, token 58302326064655072709)

---

## Key Decisions
- **Backward compatibility**: If `productId` is not sent (old app versions), backend falls back to env-var routing (current behavior). No breaking changes.
- **Supplier-specific min amounts**: MobileMart requires R30 min, Flash accepts R10. Backend validates after supplier resolution, not before.
- **Catalog drives min amount**: Frontend now uses `catalog.minAmount` instead of hardcoded R20. Catalog endpoint derives min from winning supplier.
- **Circuit breaker + failover**: Same pattern as airtime/data (lines 970-1014 of overlayServices.js). If primary supplier circuit is OPEN, proactively swaps to alternative.
- **Flash service provider from beneficiary**: Flash lookup now uses beneficiary's `meterType` instead of hardcoded 'ESKOM'.

---

## Files Modified
- `services/productCatalogService.js` — Added `'electricity'` to `_getFromView` condition (one-line change)
- `mymoolah-wallet-frontend/services/overlayService.ts` — Added `productId?` to purchase payload, `ElectricityProduct` interface, `minAmount`/`maxAmount` to `ElectricityCatalog`
- `mymoolah-wallet-frontend/components/overlays/ElectricityOverlay.tsx` — Store winning variant ID from catalog, send in purchase, dynamic min/max, fixed token delivery notice
- `routes/overlayServices.js` — Full refactor of electricity purchase: ProductVariant resolution, circuit breaker, failover, supplier-specific min amount, correct supplierId derivation, catalog endpoint min amount from winning supplier
- `services/mobilemartAuthService.js` — Timeout increased to 60s (prior commit)

---

## Code Changes Summary
- Electricity now uses `v_best_offers` materialized view for commission-based supplier selection (same as airtime/data)
- Frontend sends winning ProductVariant ID in purchase payload
- Backend resolves supplier from variant, routes to correct API (MobileMart or Flash)
- `supplierId` flows correctly to `postFaceValueJournal` (DR Client Float / CR Supplier Float) and `allocateCommissionAndVat` (commission + VAT journals)
- Supplier-specific minimum amounts: R30 for MobileMart, R10 for Flash

---

## Issues Encountered
- **MobileMart R30 minimum**: Their prevend returns `minimumPurchaseAmount: 10` but purchase API rejects below R30. Added explicit supplier-specific validation.
- **`v_best_offers` may have no electricity rows**: If the materialized view hasn't been populated with electricity product variants, the catalog returns no products and `bestProductId` is null — falling back to env-var routing. This needs the view to be refreshed after electricity variants are populated.
- **`tax_transactions` FK constraint**: Production log showed `insert or update on table "tax_transactions" violates foreign key constraint "tax_transactions_originalTransactionId_fkey"` during commission posting. Non-blocking (commission JEs still posted), but audit trail record failed.

---

## Testing Performed
- [x] Staging test: R20 purchase failed (correctly identified MobileMart R30 minimum)
- [x] Production test: R30 purchase succeeded (MobileMart, token 58302326064655072709, 7.3 kWh)
- [x] Zero linter errors across all modified files
- [ ] Full audit script run (recommended for next session)

---

## Next Steps
- [ ] Verify `v_best_offers` has electricity rows (`SELECT COUNT(*) FROM v_best_offers WHERE "vasType" = 'electricity'`) — if 0, refresh the view after ensuring electricity product_variants exist
- [ ] Investigate `tax_transactions` FK constraint issue in `commissionVatService.js`
- [ ] Run `production-full-audit.js --production` to verify the R30 purchase journals are correct
- [ ] Test another purchase after v2 deployment to confirm `[Electricity] Resolved ProductVariant` log appears (confirming commission-based routing is active)

---

## Important Context for Next Agent
- The electricity supplier comparison code is deployed but may not be actively routing yet because `v_best_offers` might have no electricity rows. The env-var fallback is working correctly.
- MobileMart minimum is R30 for electricity (their API is inconsistent — prevend says R10, purchase enforces R30).
- The `tax_transactions` FK issue is a pre-existing concern that affects commission audit trail persistence but not the actual commission ledger entries.
- Commits: `cb092ce7` (supplier comparison), `24cc1510` (min amount + notice fix). Both pushed and deployed as `20260405_v2`.

---

## Related Documentation
- Plan: `.cursor/plans/electricity_supplier_comparison_fb7bb7f1.plan.md`
- Chart of Accounts: `docs/CHART_OF_ACCOUNTS.md` (Section 3.4 for VAS journal templates)
- Previous session: `docs/session_logs/2026-03-31_2130_electricity-eezi-power-commission-optimization.md`
- Audit script: `scripts/production-full-audit.js`
