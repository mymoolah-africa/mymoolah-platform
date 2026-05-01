# Session Log - 2026-05-01 - OTT Payout Catalog UAT Readiness

**Session Date**: 2026-05-01 11:46 SAST  
**Agent**: Cursor AI Agent  
**User**: André  
**Session Duration**: OTT payout/catalog implementation continuation

---

## Session Summary
Implemented the approved OTT payout/catalog completion plan through UAT. Added the missing COA/VAT and commercial terms schema, switched payout quotes to provider-specific DB policy, added read-only provider sync and customer-facing catalog import, wired OTT VAS products into the wallet-backed purchase service, ran focused tests, applied UAT migrations, confirmed UAT provider sync plus quote-only checks, and completed controlled Standard Bank Instant Money, Pick n Pay voucher, and Nando's gift-card tests.

---

## Tasks Completed
- [x] Added idempotent COA migration for VAT input and fee/expense accounts.
- [x] Updated `TaxTransaction` for existing `vat_direction`, `supplier_code`, and `is_claimable` columns.
- [x] Added `supplier_commercial_terms` schema and seeded OTT payout/voucher commercial terms.
- [x] Refactored OTT payout quotes to use DB commercial terms and snapshot full policy into `feeSnapshot`.
- [x] Added read-only OTT provider/limits sync and provider classification.
- [x] Imported customer-facing OTT voucher/electricity/gift-card products into UAT catalog.
- [x] Added focused unit tests for commercial terms, quote calculation, provider classification, and catalog commission audit split.
- [x] Ran UAT migrations, read-only provider sync, and quote-only checks.
- [x] Ran the André-approved controlled R10 Standard Bank Instant Money UAT payout for user `1` / `0825571055`.
- [x] Recovered and verified the payout after OTT submit timeout was later confirmed successful by `GetPaymentStatus`.
- [x] Implemented OTT supplier support in `ProductPurchaseService` for wallet-backed voucher/gift-card purchases.
- [x] Added supplier pricing fallback so OTT products use imported net commission from `product_variants`.
- [x] Ran controlled UAT Pick n Pay voucher and Nando's gift-card tests from the backend.
- [x] Fixed OTT VAT audit enrichment so payout MMTP fee VAT creates a `tax_transactions` row and OTT VAS commission VAT rows persist `supplier_code = OTT`.
- [x] Repaired UAT OTT VAT evidence rows for the controlled payout, Pick n Pay voucher, and Nando's gift-card tests.
- [x] Added payout reversal VAT handling so future reversed OTT payouts mark related payout-fee VAT evidence as `refunded`.
- [x] Added read-only OTT VAT evidence audit script for UAT/staging/production checks.

---

## Key Decisions
- **OTT remains one supplier with two rails**: payout providers use quote/cost policy, while vouchers/electricity/gift cards enter the product catalog.
- **Commission audit split preserved**: catalog ranking uses net economic commission, but pricing JSON stores gross commission, OTT switching/service fee, and net commission.
- **Payout fees are VAT-aware**: contractual fixed fees seeded as ex-VAT are converted to VAT-inclusive user debit amounts for quote totals; MMTP markup uses R0.87 ex-VAT as approved in the plan.
- **Timeouts are unknown outcomes**: submit timeouts must stay `processing` for polling instead of auto-refunding; OTT may have accepted and fulfilled the transaction.
- **Controlled payout completed**: `OTT_PAYOUT_ENABLED=false` remains the safe default outside controlled one-off commands; additional payout/voucher tests require André approval.
- **OTT VAS uses wallet-backed flow**: Do not call OTT voucher/gift-card providers directly for normal testing; use `ProductPurchaseService` so orders, supplier transactions, wallet debits, commission, and journals are created.
- **Amazon provider follow-up**: Amazon Gift Card `OTT-141` returned provider-side UAT errors and should be raised with OTT before wallet exposure.
- **OTT VAT evidence policy**: VAT is output VAT only on MMTP-owned markup/commission. Payout provider fees and voucher face value remain pass-through; `tax_transactions` evidence is tied to the actual wallet fee/commission transaction ID to preserve FK auditability.
- **Reversals must update VAT evidence**: If an OTT payout later reverses, the related payout-fee VAT evidence row must move to `refunded` so VAT period reporting does not overstate output VAT.

---

## Files Modified
- `migrations/20260501_01_seed_vat_input_and_fee_accounts.js` - Seeds VAT input and fee/expense ledger accounts idempotently.
- `migrations/20260501_02_create_supplier_commercial_terms.js` - Creates `supplier_commercial_terms` and seeds OTT provider commercial terms.
- `models/TaxTransaction.js` - Maps existing VAT direction/input VAT support columns.
- `models/Supplier.js` - Adds association to commercial terms.
- `models/SupplierCommercialTerm.js` - Adds Sequelize model for effective-dated supplier economics.
- `services/ott/ottCommercialTermsService.js` - Adds policy lookup and fee/commission normalization.
- `services/ott/ottPayoutService.js` - Uses DB policy for quote/submit fee calculations.
- `services/ott/ottClient.js` - Expanded redaction for recipient ID fields and voucher/cash-send PIN/serial fields.
- `services/ott/ottProviderCatalogService.js` - Adds provider sync, classification, and catalog import.
- `services/productPurchaseService.js` - Adds OTT supplier branch and timeout polling for wallet-backed OTT VAS purchases.
- `services/supplierPricingService.js` - Adds OTT fallback to imported product variant net commission.
- `services/commissionVatService.js` - Persists `supplierCode`, `vatDirection`, and `isClaimable` on VAT rows using the mapped Sequelize fields.
- `services/ott/ottPayoutService.js` - Persists payout MMTP fee VAT evidence against the completed OTT fee transaction and marks it `refunded` when the payout reverses.
- `scripts/audit-ott-vat-evidence.js` - Adds read-only OTT VAT evidence reconciliation for VAT-control journals and tax rows.
- `scripts/ott-sync-providers.js` - Adds read-only sync runner with optional catalog import.
- `migrations/20260501_03_seed_ott_supplier_float.js` - Seeds OTT supplier float metadata for VAS face-value journals.
- `tests/ott-commercial-terms-service.test.js` - Adds focused policy calculation tests.
- `tests/ott-provider-catalog-service.test.js` - Adds provider classification and catalog import tests.
- `tests/ott-payout-service.test.js` - Updates quote/debit expectations for DB policy fees.
- `tests/commission-vat-service.test.js` - Adds VAT enrichment coverage for commission tax rows.
- `docs/CHANGELOG.md`, `docs/AGENT_HANDOVER.md`, `docs/CHART_OF_ACCOUNTS.md` - Updated current status and COA migration references.

---

## Code Changes Summary
- Added an effective-dated supplier commercial policy layer for OTT payout fees and VAS/voucher commissions.
- Replaced scalar env payout fee calculation with provider-code DB terms and full fee snapshotting for audit.
- Added safe read-only OTT provider sync and customer-facing catalog import for providers `3`, `60`, `68`, `69`, `140`, `141`, `146`, `156`, and `157`.
- Preserved test/mock providers `71`, `73`, `76`, and `78` as non-customer-facing.
- Hardened OTT submit timeout handling so unknown provider outcomes stay pending for polling instead of being auto-refunded.
- Added wallet-backed OTT VAS fulfilment through `PerformPayout`, including status polling on unknown outcomes, encrypted/masked voucher storage via existing voucher envelope logic, and masked OTT response data.
- Added future-path tax evidence for OTT payout MMTP fees: base R0.87, VAT R0.13, total R1.00 on the controlled R10 payout fee, with `supplierCode = OTT`, `vatDirection = output`, and `isClaimable = false`.
- Fixed OTT VAS commission tax enrichment so future Pick n Pay, Nando's, Shoprite, and other OTT catalog purchases keep supplier audit evidence in `tax_transactions`.

---

## Issues Encountered
- **Default `.env` pointed at local port 5433 and had OTT integration disabled**: first sync failed with `OTT_INTEGRATION_DISABLED`. Resolved by running with `ENV_FILE=.env.codespaces`, which used UAT port `6543` and the configured OTT test integration flags.
- **Submit timeout after controlled payout**: the first Standard Bank Instant Money submit timed out after 15 seconds. Local logic initially reversed the debit, but `GetPaymentStatus` returned success with OTT payment reference `118268`. Code was fixed so future unknown outcomes stay `processing`, and the UAT test row was recovered with a correction debit and balanced journal entry.
- **Amazon Gift Card provider failed in UAT**: R10 was rejected as below the provider minimum of R100; R100 returned OTT status `97` / `Internal Server Error`. No wallet debit posted on either failed Amazon attempt.
- **VAT audit enrichment gap**: Ledger VAT postings were financially correct, but `tax_transactions` evidence was incomplete. Fixed future code paths and repaired UAT evidence by inserting one payout-fee VAT row and enriching two OTT VAS VAT rows with `supplier_code = OTT`.

---

## Testing Performed
- [x] Unit tests written/updated.
- [x] Integration-style UAT migration and read-only sync run.
- [x] Manual quote-only checks performed.
- [x] Test results: pass.

Commands and evidence:
- `node --check` on new/changed migrations, models, OTT services, script, and focused tests.
- `npx jest tests/ott-product-purchase-service.test.js tests/supplier-pricing-ott.test.js tests/ott-commercial-terms-service.test.js tests/ott-provider-catalog-service.test.js tests/ott-payout-service.test.js tests/ott-client.test.js --runInBand --forceExit` - 21/21 passing.
- `./scripts/run-migrations-master.sh uat` - UAT migrations applied successfully.
- `ENV_FILE=.env.codespaces node scripts/ott-sync-providers.js --import-catalog` - read 16 providers, read 1 limits payload, upserted 16 providers, imported 9 catalog products.
- Quote-only UAT checks:
  - Standard Bank Instant Money `2`: R100 amount, R11.45 provider fee, R1.00 MMTP fee, R112.45 total debit.
  - ABSA CashSend `112`: R100 amount, R11.45 provider fee, R1.00 MMTP fee, R112.45 total debit.
  - PayShap Account `127`: R100 amount, R2.88 provider fee, R1.00 MMTP fee, R103.88 total debit.
- UAT catalog rows confirmed:
  - `OTT-3`: 3.00% net commission.
  - `OTT-68`: 0.70% net, 1.00% gross, 0.30% OTT service fee.
  - `OTT-69`: 0.70% net, 1.00% gross, 0.30% OTT service fee.
- Controlled payout evidence:
  - Provider: Standard Bank Instant Money `2`.
  - User: UAT user `1` / `0825571055`.
  - Amount: R10.00.
  - Fees: R11.45 provider fee, R1.00 MMTP fee, R22.45 total debit.
  - OTT payment reference: `118268`.
  - Payout: `OTT-1777629657504-e811bbf7`, final status `completed`.
  - Journal: `OTT-PAYOUT-OTT-1777629657504-e811bbf7`, 4 lines, R22.45 debits and R22.45 credits.
  - Wallet balance after final recovery: R33,101.55 balance, R407.00 restricted balance.
- Controlled wallet-backed VAS evidence:
  - Pick n Pay Voucher `OTT-68`, R10: order `a377eac4-48fd-475d-a541-a6edb8696a70`, OTT reference `118269`, completed order, successful supplier transaction, wallet payment transaction, balanced `VAS-FACE-*` journal R10/R10, balanced `COMMISSION-*` journal R0.07/R0.07.
  - Nando's Gift Card `OTT-156`, R10: order `90ce29b2-bfc9-44e5-aa18-68b4e4b8eebf`, OTT reference `118270`, completed order, successful supplier transaction, wallet payment transaction, balanced `VAS-FACE-*` journal R10/R10, balanced `COMMISSION-*` journal R0.07/R0.07.
  - Wallet after Nando's test: R33,081.55 balance, R387.00 restricted balance.
- VAT repair validation:
  - `node --check services/commissionVatService.js && node --check services/ott/ottPayoutService.js` passed.
  - `npx jest tests/ott-payout-service.test.js tests/commission-vat-service.test.js --runInBand --forceExit` passed 11/11 tests.
  - UAT repair inserted one `ott_payout_fee` VAT row linked to `OTT-CORR-FEE-OTT-1777629657504-e811bbf7`: base R0.87, VAT R0.13, total R1.00, `supplier_code = OTT`, `vat_direction = output`, `is_claimable = false`.
  - UAT repair enriched two OTT VAS commission VAT rows (`VOUCHER_1777631416565_w6odpx`, `VOUCHER_1777631510127_zz9t5r`) to `supplier_code = OTT`; both remain output VAT, not claimable, with base R0.06, VAT R0.01, total R0.07.
  - UAT journal verification confirmed `OTT-PAYOUT-OTT-1777629657504-e811bbf7` balances R22.45/R22.45 and the two OTT commission journals balance R0.07/R0.07.
  - `ENV_FILE=.env.codespaces node scripts/audit-ott-vat-evidence.js --uat` checked 3 OTT VAT evidence rows with 0 issues.

---

## Next Steps
- [ ] Send OTT dev team Amazon Gift Card provider evidence: R10 minimum rejection and R100 status `97` internal server error.
- [ ] André to approve any next payout provider test: ABSA CashSend or PayShap Account.
- [ ] For electricity tests: provide/approve a real UAT meter number before running a purchase.
- [ ] Confirm whether OTT supports void/reversal for voucher/gift-card products before broader wallet exposure.
- [ ] Supply `OTT_WEBHOOK_SECRET` if available; until then, rely on submit response plus polling for initial UAT checks.

---

## Important Context for Next Agent
- Do not edit the Cursor plan file at `/Users/andremacbookpro/.cursor/plans/ott_payout_catalog_0eeddf41.plan.md`.
- `OTT_PAYOUT_ENABLED=false` must remain the default until André approves a wallet-debit payout.
- Use `ENV_FILE=.env.codespaces` for local UAT OTT sync/quote checks; default `.env` may point to a local port and leave OTT disabled.
- Customer-facing OTT catalog import currently includes 9 providers from the UAT active provider list; mock providers remain non-customer-facing.
- Standard Bank Instant Money is using the approved placeholder R9.96 ex-VAT supplier fee until OTT confirms separate commercial terms.
- The first controlled Standard Bank test succeeded at OTT after a submit timeout. Always poll unknown outcomes before refunding or retrying.
- Pick n Pay and Nando's are proven through the wallet-backed VAS path; Amazon is not proven and appears to need OTT provider support.

---

## Questions/Unresolved Items
- Is the OTT webhook secret available now, or should webhook verification remain deferred for the first controlled test?
- Confirm whether all non-bank retailer/gift-card products have the same 1.00% gross less 0.30% OTT service fee economics, or whether each brand needs separate commercial terms.
- What real UAT meter number should be used for the first OTT electricity token test?

---

## Related Documentation
- `docs/integrations/OTT_MOBILE_INTEGRATION_FRAMEWORK.md`
- `docs/CHART_OF_ACCOUNTS.md`
- `docs/VAT_ACCOUNTING_STRATEGY.md`
- `docs/DATABASE_CONNECTION_GUIDE.md`
