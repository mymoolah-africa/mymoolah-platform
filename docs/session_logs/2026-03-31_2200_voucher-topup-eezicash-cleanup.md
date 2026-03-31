# Session Log - 2026-03-31 22:00 - Voucher Top-Up + eeziCash Fee Cleanup

**Session Date**: 2026-03-31 22:00  
**Agent**: Cursor AI Agent  
**User**: André  

---

## Session Summary
Implemented the Flash voucher top-up wallet deposit feature (1Voucher, FNB Voucher, Flash Pay) per the new March 2026 Flash contract. Users can redeem a voucher PIN to add funds to their wallet with a 4% fee (excl VAT). Also cleaned up stale eeziCash fee attribution from the previous session.

---

## Tasks Completed
- [x] Cleaned up stale `eezi_voucher` fee rows from `supplier_fee_schedule` and `supplier_tier_fees` — added DELETE cleanup step to `update-eezicash-fees.js`
- [x] Built `redeemVoucherTopup()` backend method in `flashController.js` — full wallet credit flow with 4% fee, ledger posting, FlashTransaction audit
- [x] Added auth-protected route: `POST /api/v1/flash/voucher-topup/redeem`
- [x] Created `TopupVoucherOverlay.tsx` frontend component — voucher type selection, PIN entry, fee display, success/error screens
- [x] Wired `/topup-voucher` route in App.tsx + TopBanner + BottomNavigation allowlists
- [x] Activated "Top-up with Voucher" card on TransactPage (was "Coming Soon", now "New" badge)
- [x] Created migration `20260331_01_add_voucher_topup_to_vas_type_enum.js` — adds `voucher_topup` to both vasType ENUMs
- [x] Updated model definitions: VasProduct + VasTransaction ENUMs include `voucher_topup`
- [x] Added `voucher_topup` commission tier (4%) to `update-flash-commission-tiers.js`
- [x] Migration + scripts run on UAT. Staging and production pending (user will run).

---

## Key Decisions
- **Fee = 4% flat (no VAT on top to user)**: Flash charges 4% excl VAT. MyMoolah passes this through with no markup. User receives face_value minus 4%. MyMoolah breaks even — this is a user acquisition feature.
- **PIN-only input**: User enters just the 16-digit PIN. Flash determines face value from the PIN. No amount field needed in the UI.
- **productCode configurable via env vars**: `FLASH_1VOUCHER_PRODUCT_CODE`, `FLASH_FNB_VOUCHER_PRODUCT_CODE`, `FLASH_FLASHPAY_PRODUCT_CODE` (all default to `1`). Can be adjusted when Flash confirms product codes for each type.
- **Separate endpoint from raw `redeem1Voucher`**: The existing `redeem1Voucher` is a thin API passthrough. The new `redeemVoucherTopup` handles the full wallet flow (credit, fees, ledger, audit).
- **Flash Pay included as voucher type**: All three types (1Voucher, FNB, Flash Pay) use the same `/1voucher/redeem` Flash API endpoint with potentially different product codes.

---

## Files Modified
- `controllers/flashController.js` — Added `redeemVoucherTopup()` method (~170 lines)
- `routes/flash.js` — Added `POST /voucher-topup/redeem` route with auth middleware
- `models/VasProduct.js` — Added `voucher_topup` to vasType ENUM
- `models/VasTransaction.js` — Added `cash_out` and `voucher_topup` to vasType ENUM
- `migrations/20260331_01_add_voucher_topup_to_vas_type_enum.js` — New migration
- `mymoolah-wallet-frontend/components/overlays/topup-voucher/TopupVoucherOverlay.tsx` — New overlay component
- `mymoolah-wallet-frontend/App.tsx` — Import + route + TopBanner allowlist
- `mymoolah-wallet-frontend/components/BottomNavigation.tsx` — Both allowlists
- `mymoolah-wallet-frontend/pages/TransactPage.tsx` — Activated card (available: true, badge: 'New')
- `scripts/update-flash-commission-tiers.js` — Added voucher_topup tier (4%)
- `scripts/update-eezicash-fees.js` — Added cleanup DELETE for stale eezi_voucher rows from supplier_fee_schedule + supplier_tier_fees

---

## Issues Encountered
- **Stale eezi_voucher fee rows**: Previous migrations had incorrectly seeded token generation/redemption fees under `eezi_voucher` service type in `supplier_fee_schedule` and `supplier_tier_fees`. These fees are exclusively for `cash_out`. Added cleanup DELETE to the script. UAT cleanup removed 2 + 4 stale rows.
- **VasTransaction vasType ENUM mismatch**: Model definition only had 4 values but DB had more (via previous migrations). Updated model to include `cash_out` and `voucher_topup`.

---

## Testing Performed
- [x] Migration run on UAT — `voucher_topup` added to both ENUMs
- [x] Commission tiers script run on UAT — voucher_topup at 4% upserted
- [x] eeziCash fees script run on UAT — 2 stale fee rows + 4 stale tier rows cleaned up
- [ ] Manual testing of voucher redemption flow (pending Flash endpoint activation)
- [ ] Staging and production migrations (user will run)

---

## Next Steps
- [ ] Run migrations + scripts on staging and production (commands provided to user)
- [ ] André to rebuild frontend and restart: `cd mymoolah-wallet-frontend && npm run build && cd .. && ./scripts/one-click-restart-and-start.sh`
- [ ] Test the overlay UI in Codespaces (will work in simulation mode)
- [ ] When Flash activates endpoints: set `FLASH_LIVE_INTEGRATION=true` and test real redemption
- [ ] Confirm product codes for FNB voucher and Flash Pay from Flash
- [ ] **Next feature**: Bill payments (André's next priority)

---

## Important Context for Next Agent
- The voucher top-up feature is built but Flash hasn't activated the redemption endpoints yet. It works in simulation mode (`FLASH_LIVE_INTEGRATION` not set or `false`). In simulation, pass `simulatedAmount` in the request body to set the fake face value.
- The existing `redeem1Voucher` in flashController.js sends `amount` but the Flash API spec (from FLASH_TESTING_REFERENCE.md) shows `productCode` instead. The new `redeemVoucherTopup` correctly sends `productCode`.
- Flash contract PDF is at `integrations/flash/My Moolah (Redemptions and Flash Pay).pdf` — confirms 4% fee for all three types, daily net settlement.
- The `commissionVatService.js` `postCommissionVatAndLedger` is used for ledger entries. There's also a reference to `commissionVatAndLedger.js` in the cash-out code (line 1008) but the actual file is `commissionVatService.js`.
- eeziCash fee cleanup removed stale rows. If someone re-runs old migrations, the rows could reappear — the cleanup in `update-eezicash-fees.js` handles this idempotently.

---

## Related Documentation
- Flash contract: `integrations/flash/My Moolah (Redemptions and Flash Pay).pdf`
- Flash testing reference: `integrations/flash/FLASH_TESTING_REFERENCE.md`
- Flash API error codes: 2401 (already used), 2402 (not found), 2403 (cancelled), 2405 (expired)
