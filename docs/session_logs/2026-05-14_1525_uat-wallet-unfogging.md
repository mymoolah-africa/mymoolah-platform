# Session Log - 2026-05-14 - UAT Wallet Unfogging

**Session Date**: 2026-05-14 15:25 SAST  
**Agent**: Cursor AI Agent  
**User**: André  
**Session Duration**: Short continuation session

---

## Session Summary
Implemented André's follow-up request to remove the fog/Coming Soon treatment for ABSA, Nedbank, and MoolahMove in UAT only. Staging and Production were protected by using an explicit UAT environment helper rather than broad non-production Vite mode checks.

---

## Tasks Completed
- [x] Added a shared wallet helper for UAT-only detection.
- [x] Unfogged ABSA and Nedbank Withdraw Cash provider cards in UAT only.
- [x] Enabled the MoolahMove Add Account tab and international account fields in UAT only.
- [x] Removed the MoolahMove Coming Soon/fog treatment from Send Money tiles in UAT only without routing testers into unsupported legacy form submission.
- [x] Follow-up: fixed Add Account modal top-corner styling and wired the Add New Beneficiary MoolahMove tile to the real MoolahMove fields.
- [x] Updated changelog, agent handover, and this session log.

---

## Key Decisions
- **UAT-only detection**: Used Codespaces/local Vite dev, explicit UAT build/env signals (`VITE_NODE_ENV=uat` or related UAT env names), or a UAT API base URL. Did not use `import.meta.env.MODE !== 'production'` because that could include Staging-like production builds and is not safe for Staging/Production separation.
- **Withdraw Cash scope**: Allowed both legacy/test and live OTT provider codes for ABSA/Nedbank (`112`/`67`, `10`/`4`) so UAT does not stay fogged when the API returns live codes.
- **Send Money MoolahMove safety**: The visible Send Money tiles are unfogged in UAT, but tapping them shows an informational modal instead of selecting `moolahmove` in the old MyMoolah/bank beneficiary form, which would create the wrong beneficiary type.

---

## Files Modified
- `mymoolah-wallet-frontend/utils/environment.ts` - New UAT-only environment helper.
- `mymoolah-wallet-frontend/components/overlays/withdraw-cash/WithdrawCashOverlay.tsx` - UAT-only ABSA/Nedbank availability override and live provider-code alias support.
- `mymoolah-wallet-frontend/components/overlays/shared/AddAccountModal.tsx` - MoolahMove tab/form enabled in UAT only.
- `mymoolah-wallet-frontend/pages/SendMoneyPage.tsx` - MoolahMove tiles unfogged in UAT only; Add New Beneficiary now opens real MoolahMove country/payment-method/account fields.
- `docs/CHANGELOG.md` - Added the UAT-only wallet availability entry.
- `docs/AGENT_HANDOVER.md` - Updated latest feature and session log pointer.
- `docs/session_logs/2026-05-14_1525_uat-wallet-unfogging.md` - This session log.

---

## Code Changes Summary
- Added `isWalletUatEnvironment()` to centralize wallet UAT detection.
- Kept Staging and Production unchanged by making MoolahMove disabled/Coming Soon outside UAT and preserving API-driven Withdraw Cash availability outside UAT.
- In UAT, ABSA/Nedbank cash provider cards display as available even when UAT discovery marks them unavailable.
- Follow-up changed Add Account modal radius from bottom-only to fully rounded and corrected MoolahMove beneficiary creation to use `mobile_money` / `international_bank` service types.

---

## Issues Encountered
- **No dedicated UAT helper existed**: Existing wallet checks used either Vite mode or UAT/test/local URL checks. A new small helper was safer than reusing broad non-production logic.
- **Send Money MoolahMove path is not fully wired**: The two Send Money tiles did not have a real MoolahMove form path. The UAT change avoids the broken selection path and directs testers to the existing account setup path.

---

## Testing Performed
- [x] TypeScript check: `npx tsc --noEmit` in `mymoolah-wallet-frontend` passed.
- [x] Wallet build: `npm run build` in `mymoolah-wallet-frontend` passed.
- [x] Cursor lints on touched frontend files reported no errors.
- [ ] Manual UAT browser verification still required after André deploys/pulls the wallet build.

---

## Next Steps
- [ ] Deploy/pull the wallet frontend to UAT and verify ABSA/Nedbank cards are no longer fogged.
- [ ] Verify MoolahMove Add Account shows the international fields in UAT.
- [ ] Confirm Staging and Production still show the prior Coming Soon/fogged state.

---

## Important Context for Next Agent
- This change is frontend-only and does not alter OTT backend provider approval, payout submission, or MoolahMove backend rails.
- Codespaces UAT often runs the wallet with `npm run dev`; the helper intentionally treats Vite `DEV` as UAT for this local testing flow while Staging/Production production builds remain excluded.
- If hosted UAT still appears fogged, check the UAT wallet build has `VITE_NODE_ENV=uat` or that `VITE_API_BASE_URL` contains `uat`.

---

## Questions/Unresolved Items
- Full MoolahMove send/payment execution remains future work; this session wires the beneficiary/account capture path only.

---

## Related Documentation
- `docs/CHANGELOG.md`
- `docs/AGENT_HANDOVER.md`
