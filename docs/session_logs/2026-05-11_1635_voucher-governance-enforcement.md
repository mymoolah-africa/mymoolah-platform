# Session Log - 2026-05-11 - Voucher Governance Enforcement

**Session Date**: 2026-05-11 16:35  
**Agent**: Cursor AI Agent  
**User**: André  
**Session Duration**: Continuation session

---

## Session Summary
Fixed the Production wallet voucher catalog split-brain where the wallet was still driven by the fallback recognizer while governance mappings showed draft/unpublished. Production now runs voucher catalog governance enforcement and the selected blocked brands were approved without removing the existing working retail voucher cards.

---

## Tasks Completed
- [x] Swept the active backend, frontend, and governance script paths to confirm the wallet voucher overlay is API-driven and not using a static legacy voucher list.
- [x] Added recognition for André-approved additions: OTT Voucher, NetFlorist, EasyBet, GBets, and Gold Rush.
- [x] Added denomination-specific purchase identities so fixed grouped cards submit the correct product/variant for each selected amount.
- [x] Added and ran `scripts/approve-production-voucher-governance.js` with dry-run first, then Production apply.
- [x] Enabled Production governance enforcement through the durable backend deploy script and deployed backend/wallet.

---

## Key Decisions
- **Governance is the Production source of truth**: `PRODUCT_CATALOG_GOVERNANCE_ENABLED=true` is now set on Production backend deployments.
- **Preserve working wallet catalog**: The approval helper published the existing working retail voucher cards before enforcement was enabled, avoiding a sudden catalog shrink.
- **OTT Voucher is variable only**: Only MobileMart `OTT Variable Voucher` (`5BOioLwx80GvyiwTch2U`) was published; fixed OTT denomination rows remain unpublished.
- **NetFlorist fixed rows are supported**: Four fixed MobileMart NetFlorist rows were published, with frontend/backend purchase identity mapping so each fixed option submits its own SKU.
- **Unknown rows remain blocked**: Wallet Code, generic Flash Gift Card rows, EasyLoad, and World Bucks remain out of the customer-facing catalog pending separate review.

---

## Files Modified
- `services/voucherCatalogBrandService.js` - Added canonical mappings for selected approved brands.
- `routes/overlayServices.js` - Preferred variable variants for variable groups and returned `denominationOptions` for fixed grouped vouchers.
- `mymoolah-wallet-frontend/components/overlays/digital-vouchers/DigitalVouchersOverlay.tsx` - Normalised `denominationOptions` from the catalog response.
- `mymoolah-wallet-frontend/components/overlays/digital-vouchers/ProductDetailModal.tsx` - Submitted the selected fixed denomination's product/variant identity.
- `tests/voucherCatalogBrandService.test.js` - Added coverage for OTT, NetFlorist, EasyBet, GBets, and Gold Rush recognition.
- `scripts/approve-production-voucher-governance.js` - Added a dry-run-first Production voucher approval helper.
- `scripts/deploy-backend.sh` - Added durable `PRODUCT_CATALOG_GOVERNANCE_ENABLED` handling.
- `docs/CHANGELOG.md` - Documented the Production voucher governance enforcement.
- `docs/AGENT_HANDOVER.md` - Updated current status and deployment revisions.
- `docs/PRODUCT_CATALOG_GOVERNANCE.md` - Documented Production enforcement and approved voucher set.

---

## Code Changes Summary
- The wallet voucher catalog now has the data needed to purchase grouped fixed denominations safely.
- Production governance mappings were approved/published for 93 retail voucher rows, preserving 29 current retail cards and adding the selected blocked brands.
- OTT Variable was updated from min `1000` cents to `500` cents, keeping max `500000` cents.
- Production backend now runs with `PRODUCT_CATALOG_GOVERNANCE_ENABLED=true`.

---

## Issues Encountered
- **Stale Production DB proxy**: Local Production reads returned `ECONNRESET`; refreshed the local Cloud SQL proxy on port `6545` and continued.
- **Deploy script config drift risk**: `scripts/deploy-backend.sh` did not include `PRODUCT_CATALOG_GOVERNANCE_ENABLED`, which would have wiped the flag on future deploys. Fixed before backend deployment.
- **Fixed denomination purchase risk**: Grouped fixed cards could show multiple amounts while sending the representative variant for every purchase. Added `denominationOptions` to keep each amount tied to the correct SKU.

---

## Testing Performed
- [x] `node --check scripts/approve-production-voucher-governance.js services/voucherCatalogBrandService.js routes/overlayServices.js`
- [x] `bash -n scripts/deploy-backend.sh`
- [x] `npx jest tests/voucherCatalogBrandService.test.js tests/productCatalogGovernanceService.test.js --runInBand --forceExit` passed 50/50.
- [x] `npm run build` in `mymoolah-wallet-frontend` passed.
- [x] Cursor lints on touched files reported no errors.
- [x] Production dry-run and apply completed with the same 93 approval rows.
- [x] Cloud Run verification confirmed backend revision `mymoolah-backend-production-00212-ltt` with `PRODUCT_CATALOG_GOVERNANCE_ENABLED=true`.
- [x] Cloud Run verification confirmed wallet revision `mymoolah-wallet-production-00052-6l5`.
- [x] Backend `/health` returned OK and wallet returned HTTP 200.

---

## Next Steps
- [ ] André to visually confirm `wallet.mymoolah.africa/vouchers-overlay` shows OTT Voucher, NetFlorist, EasyBet, GBets, and Gold Rush.
- [ ] Do not run live voucher purchases unless André explicitly approves a controlled purchase test.
- [ ] Review remaining blocked rows separately: Wallet Code, generic Gift Card rows, EasyLoad, and World Bucks.

---

## Important Context for Next Agent
- Production voucher governance enforcement is now live; do not disable `PRODUCT_CATALOG_GOVERNANCE_ENABLED` without André approval.
- `scripts/approve-production-voucher-governance.js` is dry-run by default and requires `--production --confirm-production`; use `--apply` only after dry-run review.
- The helper intentionally preserves the current retail voucher catalog and keeps fallback recognizer rows blocked.
- NetFlorist has four fixed SKUs, not a variable R100-R1,000 SKU in Production.

---

## Questions/Unresolved Items
- Whether remaining blocked betting/retail rows should be reviewed in a second governance batch.
- Whether brand logos should be added for NetFlorist, EasyBet, GBets, and Gold Rush.

---

## Related Documentation
- `docs/PRODUCT_CATALOG_GOVERNANCE.md`
- `docs/CHANGELOG.md`
- `docs/AGENT_HANDOVER.md`
