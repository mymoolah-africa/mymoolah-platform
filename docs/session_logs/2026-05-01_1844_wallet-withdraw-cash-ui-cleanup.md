# Session Log - 2026-05-01 - Wallet Withdraw Cash UI Cleanup

**Session Date**: 2026-05-01 18:44 SAST  
**Agent**: Cursor AI Agent  
**User**: André  
**Session Duration**: Frontend cleanup and commit checkpoint

---

## Session Summary
Cleaned up wallet frontend naming and routed overlay behaviour after the OTT Withdraw Cash and Retail Vouchers changes. The work removed stale ATM/CashSend implementation naming, made OTT payout submission derive verified identity server-side, corrected voucher labels, and fixed routed modal scroll positioning so overlays open at the top.

---

## Tasks Completed
- [x] Renamed the dashboard card from `Active Vouchers` to `MyMoolah Vouchers`.
- [x] Updated Withdraw Cash provider discovery to merge OTT active providers with provider limits so live providers such as Nedbank can activate from API data.
- [x] Removed frontend ID/passport collection from the Withdraw Cash flow; `/api/v1/ott/payouts` now fills recipient identity from the KYC-verified `User` record.
- [x] Removed the two-step `Check fees` UI; Withdraw Cash now submits directly through the payout endpoint.
- [x] Replaced the old `ATMCashSendOverlay.tsx` implementation path with `withdraw-cash/WithdrawCashOverlay.tsx`.
- [x] Added `/withdraw-cash-overlay` as the canonical route while keeping `/atm-cashsend-overlay` as a compatibility alias.
- [x] Fixed routed overlay scroll restoration by resetting the wallet shell scroll container on route changes.
- [x] Swept shared popup modal containers so wallet modals anchor from the top rather than centered mid-screen.
- [x] Follow-up: removed the visible Verified Profile card and fixed the Withdraw Cash action as a bottom action bar.
- [x] Follow-up: changed Nedbank Cardless Cash Send to OTT provider code `10`, made it selectable, and hardened provider response parsing.
- [x] Follow-up: changed OTT provider discovery and limits to authenticated read-only calls so the screen no longer logs repeated KYC 403 errors before transaction submission.
- [x] Follow-up: added server-side `requestdate` and `yourUniqueReference` defaults for OTT provider discovery and limits to avoid empty-payload 400 responses.
- [x] Follow-up: updated amount chips and enforced wallet guardrails of R50 minimum and R4,000 maximum, with live OTT limits still able to narrow the range.

---

## Key Decisions
- **Server-authoritative identity for OTT payouts**: Frontend must not ask KYC-verified wallet users for ID/passport again. The backend now reads verified identity fields from `User` after `requireKYCVerification`.
- **Canonical naming is Withdraw Cash**: Code paths now use `withdraw-cash` / `WithdrawCashOverlay`; legacy `atm-cashsend` remains only as an alias for saved quick-access settings and old deep links.
- **Direct transaction action**: The wallet UI no longer exposes a separate `Check fees` step for Withdraw Cash; the backend still calculates and enforces fees internally.
- **Global route scroll reset**: The wallet's custom scroll container is reset on route changes rather than trying to fix every routed overlay individually.

---

## Files Modified
- `mymoolah-wallet-frontend/App.tsx` - Added route-scroll reset, canonical Withdraw Cash route, and legacy route alias.
- `mymoolah-wallet-frontend/components/overlays/withdraw-cash/WithdrawCashOverlay.tsx` - New canonical Withdraw Cash overlay implementation.
- `mymoolah-wallet-frontend/components/overlays/atm-cashsend/ATMCashSendOverlay.tsx` - Removed obsolete ATM/CashSend-named implementation file.
- `mymoolah-wallet-frontend/services/apiService.ts` - Merged OTT providers and provider-limits; made payout recipient optional for server-side identity merge.
- `routes/ott.js` - Builds OTT recipient details from the KYC-verified authenticated user before submitting payouts.
- `controllers/settingsController.js` - Changed the quick-access service id from `atm-cashsend` to `withdraw-cash`.
- `mymoolah-wallet-frontend/pages/TransactPage.tsx` and `components/BottomNavigation.tsx` - Updated canonical route/service id and legacy compatibility mapping.
- `mymoolah-wallet-frontend/pages/DashboardPage.tsx` and `components/DashboardPage.tsx` - Updated dashboard voucher label.
- Shared modal components - Top-aligned wallet popup modals.
- `docs/CHANGELOG.md`, `docs/AGENT_HANDOVER.md`, and this session log - Captured handover context.

---

## Code Changes Summary
- Withdraw Cash now uses `withdraw-cash/WithdrawCashOverlay.tsx`, direct submit, verified profile messaging, and server-side identity enrichment.
- Follow-up simplified the screen further by removing the visible Verified Profile card; server-side identity enrichment remains unchanged.
- Nedbank Cardless Cash Send now uses OTT provider code `10` and appears selectable instead of `Soon`.
- OTT payout provider loading now merges `/api/v1/ott/providers` and `/api/v1/ott/provider-limits`.
- `/api/v1/ott/providers` and `/api/v1/ott/provider-limits` require authentication but no longer require KYC; `/api/v1/ott/payouts/quote`, `/api/v1/ott/payouts`, and payout status routes remain KYC-gated.
- The read-only provider routes build the OTT-required `requestdate` and `yourUniqueReference` server-side before signing.
- Cash amount presets now render as larger chips: R50, R100, R200, R500, R1,000, R2,000, and R4,000.
- Wallet route changes reset the internal scroll container to top.
- Shared modal containers no longer open centered/mid-page.

---

## Issues Encountered
- **Stale running UI showed `Check fees`**: Source no longer contained the string; Codespaces/local running server needed the new commit and rebuild.
- **Confusing legacy filename**: `ATMCashSendOverlay.tsx` made the current flow look like a duplicate implementation; renamed to a canonical Withdraw Cash path.
- **PII prompt in frontend**: The overlay was asking for ID/passport even though the wallet already has KYC-verified identity; fixed by moving identity merge to the backend route.

---

## Testing Performed
- [x] Wallet frontend build: `npm run build` in `mymoolah-wallet-frontend`.
- [x] Backend syntax: `node --check controllers/settingsController.js && node --check routes/ott.js`.
- [x] Focused OTT payout tests: `npx jest tests/ott-payout-service.test.js --runInBand --forceExit` passed `10/10`.
- [x] Cursor lints on touched frontend files: no linter errors.
- [ ] Manual Codespaces UAT wallet-debit test: not run; André will test after pull.

---

## Next Steps
- [ ] André to pull latest `main` in Codespaces and test the wallet UI.
- [ ] Verify `Transact -> Add Money -> Bank Transfer` opens at the top.
- [ ] Verify `Transact -> Withdraw Cash` shows the canonical overlay, no ID/passport prompt, and no `Check fees` button.
- [ ] Run any controlled UAT wallet-debit Withdraw Cash test only after André explicitly approves.

---

## Important Context for Next Agent
- `OTT_PAYOUT_ENABLED=false` remains the safe default outside controlled test commands.
- `/atm-cashsend-overlay` remains a compatibility alias only; new UI should navigate to `/withdraw-cash-overlay`.
- Legacy saved quick-access settings may still contain `atm-cashsend`; `BottomNavigation` maps that to `withdraw-cash`.
- OTT payout identity fields are intentionally server-side; do not reintroduce frontend ID/passport prompts.

---

## Questions/Unresolved Items
- Confirm live OTT UAT payload for Nedbank provider code/name during Codespaces testing.
- Decide later whether to migrate persisted user settings from `atm-cashsend` to `withdraw-cash` in DB.

---

## Related Documentation
- `docs/AGENT_HANDOVER.md`
- `docs/CHANGELOG.md`
- `docs/CODESPACES_TESTING_REQUIREMENT.md`

