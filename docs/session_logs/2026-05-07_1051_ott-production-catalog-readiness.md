# Session Log - 2026-05-07 - OTT Production Catalog Readiness

**Session Date**: 2026-05-07 10:51 SAST  
**Agent**: Cursor AI Agent  
**User**: André  
**Session Duration**: OTT production catalog implementation checkpoint

---

## Session Summary
Implemented André's attached OTT Production Catalog Plan without editing the plan file and without production writes. The session added a repeatable read-only staging/production audit, confirmed the safe initial OTT catalog/payout policy, hardened brand recognition, and improved the wallet Withdraw Cash flow so cash providers require live availability plus fee quote confirmation before submission.

---

## Tasks Completed
- [x] Ran a read-only staging/production OTT DB audit using `scripts/db-connection-helper.js`.
- [x] Added `scripts/audit-ott-production-catalog.js` for repeatable SELECT-only catalog readiness checks.
- [x] Confirmed candidate OTT rows and exclusions for the initial production catalog phase.
- [x] Updated the policy after André confirmed the OTT portal active-provider screenshots and contractual rule: cash-send/payout can only use ABSA and Nedbank for now; Standard Bank needs approval first.
- [x] Added voucher/gift-card recognition for fast-food brands, Dis-Chem, Boxer, Ackermans, Ticketmaster, NetcarePlus, Pick n Pay, and Shoprite / Checkers.
- [x] Added OTT provider `10` classification for future Nedbank sync classification only.
- [x] Hardened `WithdrawCashOverlay` so fallback providers are unavailable unless confirmed by live OTT provider discovery.
- [x] Added fee/total debit preview before Withdraw Cash submission.
- [x] Updated tests, changelog, governance docs, OTT framework docs, handover, and tech debt.

---

## Key Decisions
- **Withdraw Cash placement**: ABSA and Nedbank cardless cash belong under `Withdraw Cash`, not `Send Money`, because lower-literacy users understand the outcome as getting cash with an SMS PIN.
- **Cash-send contract scope**: Only ABSA and Nedbank may be customer-facing now. Standard Bank must stay hidden until Standard Bank approves the service for MyMoolah.
- **Initial candidate list**: Candidate catalog/payout rows are Pick n Pay `68`, Shoprite / Checkers `69`, portal-active OTT gift-card brands, ABSA CashSend `112`, and Nedbank Cardless Withdrawal from the OTT portal.
- **PayShap excluded**: OTT PayShap `127` stays unwired to frontend surfaces in this phase.
- **Nedbank terms gate**: The OTT portal confirms Nedbank Cardless Withdrawal is active, but staging/production DB terms do not currently include provider `10`; quote/submit must remain blocked until finance-approved terms exist.
- **Amazon hold**: Amazon Gift Card `141` remains on hold because prior UAT testing returned provider-side failures.
- **Governance first**: No OTT products are currently imported in staging/production; after approved import, Product Catalog Governance backfill/review/approval must control customer exposure.

---

## Files Modified
- `scripts/audit-ott-production-catalog.js` - New read-only staging/production OTT catalog readiness audit.
- `services/voucherCatalogBrandService.js` - Added portal-active gift-card brand recognition, including fast-food brands, Dis-Chem, Boxer, Ackermans, Ticketmaster, NetcarePlus, and Shoprite / Checkers; tightened generic OTT voucher matching.
- `services/ott/ottProviderCatalogService.js` - Added provider `10` known classification for future Nedbank provider sync classification.
- `mymoolah-wallet-frontend/components/overlays/withdraw-cash/WithdrawCashOverlay.tsx` - Made fallback providers unavailable until live discovery confirms them, added provider-load warning, and added fee/total debit quote preview before submit.
- `tests/voucherCatalogBrandService.test.js` - Added recognition coverage for target OTT gift-card brands.
- `tests/ott-provider-catalog-service.test.js` - Added provider `10` classification coverage.
- `tests/productCatalogGovernanceService.test.js` - Added coverage that published mapping lookup requests only approved/published voucher rows.
- `docs/CHANGELOG.md` - Added change record.
- `docs/PRODUCT_CATALOG_GOVERNANCE.md` - Added OTT production catalog readiness notes and hold/exclusion rules.
- `docs/integrations/OTT_MOBILE_INTEGRATION_FRAMEWORK.md` - Added production catalog readiness update.
- `docs/AGENT_HANDOVER.md` - Updated latest status and session log pointer.
- `docs/CURSOR_2.0_RULES_FINAL.md` - Added tech debt entry for missing Nedbank commercial terms.

---

## Code Changes Summary
- Added a repeatable SELECT-only audit script that reports OTT commercial terms, product import status, governance status, and supplier float status for staging/production.
- Improved voucher recognition so approved OTT products can display as `Pick n Pay`, `Shoprite / Checkers`, `Nando's`, `KFC`, `Hungry Lion`, `Fishaways`, `RocoMamas`, and other confirmed portal-active gift-card brands instead of generic supplier names.
- Kept PayShap and Standard Bank hidden. Nedbank is portal-confirmed and contractually allowed, but remains quote/terms-gated until backend commercial terms are present.
- Added quote-first Withdraw Cash UX so customers see cash amount, transaction fee, and total debit before they can submit.

---

## Issues Encountered
- **Generic OTT matcher caught Nando's**: The first test run showed `OTT Mobile Gift Cards | Nandos` was being recognized as `OTT Voucher`. Fixed by tightening the generic OTT voucher regex.
- **Nedbank terms missing**: The OTT portal shows Nedbank Cardless Withdrawal as active, but staging/production commercial terms do not include provider `10`. This is documented as active tech debt and the wallet now avoids submit without live confirmation and successful quote.
- **No OTT products imported in staging/production**: The audit confirmed there are no OTT product variants or governance mappings yet, so wallet catalog exposure still requires approved import/backfill/publish steps.

---

## Testing Performed
- [x] Unit tests written/updated.
- [x] Read-only DB audit run against staging and production.
- [x] Wallet frontend build run.
- [x] Cursor lints checked.
- [x] Test results: pass.

Commands/results:
- `node --check scripts/audit-ott-production-catalog.js && node --check services/voucherCatalogBrandService.js && node --check services/ott/ottProviderCatalogService.js` - passed.
- `npx jest tests/voucherCatalogBrandService.test.js tests/ott-provider-catalog-service.test.js tests/productCatalogGovernanceService.test.js --runInBand --forceExit` - passed 39/39, with pre-existing Jest config warnings only.
- `npm run build` in `mymoolah-wallet-frontend` - passed.
- `node scripts/audit-ott-production-catalog.js --staging` - completed read-only.
- `node scripts/audit-ott-production-catalog.js --production` - completed read-only.
- Cursor lints on touched files - no linter errors.

---

## Next Steps
- [ ] André to review the candidate list and approve any staging catalog import/backfill/publish sequence before it runs.
- [ ] Add finance-approved commercial terms for Nedbank before enabling quote/submit.
- [ ] Keep Standard Bank hidden until Standard Bank approves the service for MyMoolah.
- [ ] Keep Amazon `141` on hold until OTT resolves the provider-side UAT failure.
- [ ] If staging rollout is approved: run the OTT sync/import, run governance backfill, approve/publish only selected SKUs, enable governance, and test in Codespaces/staging.
- [ ] Production catalog import, governance publication, payout enablement, or wallet-debit tests require explicit André approval and a controlled test window.

---

## Important Context for Next Agent
- Do not edit the plan file `/Users/andremacbookpro/.cursor/plans/ott_production_catalog_266671a6.plan.md`.
- No production writes were performed in this session.
- Current production OTT float is `R1,000.00`; staging float row exists but has `R0.00`.
- `scripts/audit-ott-production-catalog.js` is read-only and safe for staging/production diagnostics when proxies and Secret Manager access are available.
- Product Catalog Governance remains the customer exposure control for imported OTT vouchers/gift cards.
- The wallet build passed after `WithdrawCashOverlay` quote preview changes.

---

## Questions/Unresolved Items
- Nedbank fee terms still need confirmation before backend enablement.
- OTT portal screenshots confirm additional active gift-card brands; governance publication still needs raw provider snapshot evidence after import.
- OTT Amazon Gift Card provider issue still needs partner follow-up before customer exposure.

---

## Related Documentation
- `docs/integrations/OTT_MOBILE_INTEGRATION_FRAMEWORK.md`
- `docs/PRODUCT_CATALOG_GOVERNANCE.md`
- `docs/CHANGELOG.md`
- `docs/AGENT_HANDOVER.md`
- `docs/CURSOR_2.0_RULES_FINAL.md`
