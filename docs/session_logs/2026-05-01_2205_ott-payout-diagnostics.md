# Session Log - 2026-05-01 - OTT Payout Diagnostics

**Session Date**: 2026-05-01 22:05 SAST  
**Agent**: Cursor AI Agent  
**User**: André  
**Session Duration**: Follow-up after Codespaces Withdraw Cash 500 log

---

## Session Summary
Investigated André's Codespaces backend log for a new Withdraw Cash failure on `POST /api/v1/ott/payouts`. The log showed a route-level HTTP 500 but no internal error detail, so this session added safe server-side diagnostics and a dev-only support code display in the wallet overlay to make the next retest identify the actual backend cause immediately.

---

## Tasks Completed
- [x] Reviewed the provided Codespaces backend log and confirmed `/api/v1/ott/payouts` returned HTTP 500 without printing the internal exception.
- [x] Added safe backend diagnostics to the shared OTT route error handler.
- [x] Updated all OTT route catch blocks to pass request context into `handleError`.
- [x] Updated the Withdraw Cash overlay so dev/Codespaces displays the backend error code in brackets.
- [x] Ran focused backend and frontend validation.
- [x] Updated changelog and handover documentation.

---

## Key Decisions
- **Do not guess the root cause from a swallowed 500**: The provided log proves the route did not expose the exception, so diagnostics were added before making deeper service changes.
- **Keep customer responses safe**: Backend responses still return safe messages for 5xx errors; the internal details are logged server-side.
- **Expose support code only in dev/Codespaces**: The wallet overlay adds the backend `error` code to the visible message only when `import.meta.env.DEV` is true.

---

## Files Modified
- `routes/ott.js` - Added safe OTT failure logging and passed request context into route error handling.
- `mymoolah-wallet-frontend/components/overlays/withdraw-cash/WithdrawCashOverlay.tsx` - Shows backend error code in dev/Codespaces error messages.
- `docs/CHANGELOG.md` - Added this diagnostic update.
- `docs/AGENT_HANDOVER.md` - Updated current status and next-agent context.

---

## Code Changes Summary
- OTT route errors now log method, path, authenticated user id, provider code, amount, internal code, status, endpoint key, details, and a short stack preview for 5xx failures.
- Withdraw Cash still shows safe customer wording, but dev/Codespaces appends the backend support code so UAT retests can distinguish fee policy, provider, ledger, reversal, wallet, and unexpected code paths.

---

## Issues Encountered
- **No stack trace in Codespaces log**: The original `/api/v1/ott/payouts` failure only logged `500 - 838ms`, so the actual exception could not be identified from that pasted log.
- **Local read-only UAT DB check failed**: A read-only diagnostic query using `scripts/db-connection-helper.js` failed locally with `read ECONNRESET`, likely because the active Cloud SQL proxy was in Codespaces rather than this local Mac session.

---

## Testing Performed
- [x] Backend syntax check passed.
- [x] Focused OTT payout service tests passed.
- [x] Wallet frontend build passed.
- [x] Cursor lints checked on touched files.

Commands/results:
- `node --check routes/ott.js` - passed.
- `npm test -- --runInBand tests/ott-payout-service.test.js` - passed 10/10.
- `npm run build` in `mymoolah-wallet-frontend` - passed.
- Cursor lints on `routes/ott.js` and `WithdrawCashOverlay.tsx` - no linter errors.

---

## Next Steps
- [ ] André to pull latest code in Codespaces.
- [ ] Rebuild wallet frontend because `WithdrawCashOverlay.tsx` changed.
- [ ] Restart backend/proxy/Redis with `./scripts/one-click-restart-and-start.sh`.
- [ ] Retry Withdraw Cash and inspect the new `[OTT] Request failed:` backend log plus any support code shown in the wallet.
- [ ] If the code is `OTT_LEDGER_POST_FAILED`, inspect ledger account/config and the latest `ott_payouts.metadata.ledgerError`.
- [ ] If the code is `OTT_FEE_POLICY_MISSING`, inspect active `supplier_commercial_terms` for the selected provider code.
- [ ] If the code is an OTT client/provider error, inspect the logged endpoint key and redacted provider response.

---

## Important Context for Next Agent
- The Pick n Pay voucher purchase blocker was already resolved before this session.
- This Withdraw Cash 500 is a separate `/api/v1/ott/payouts` path, not `/api/v1/products/purchase`.
- Do not reintroduce frontend ID/passport collection; OTT payout recipient identity should remain server-side from the KYC-verified user record.
- `OTT_PAYOUT_ENABLED=false` remains the default outside controlled UAT testing.

---

## Questions/Unresolved Items
- The exact root cause of the 500 remains pending until Codespaces retest prints the newly added backend diagnostic line.

---

## Related Documentation
- `docs/CHANGELOG.md`
- `docs/AGENT_HANDOVER.md`
- `docs/session_logs/2026-05-01_1844_wallet-withdraw-cash-ui-cleanup.md`
