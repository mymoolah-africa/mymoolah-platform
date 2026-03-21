# Session Log - 2026-03-21 - PayShap RTP: Peach→SBSA Fix + Peach Decommission

**Session Date**: 2026-03-21 ~15:00–17:45  
**Agent**: Cursor AI Agent (Claude)  
**User**: Andre  
**Previous Session**: `docs/session_logs/2026-03-21_1115_dialog-scroll-fix.md`

---

## Session Summary

Discovered that the PayShap Request-to-Pay (RTP) frontend was calling the **decommissioned Peach Payments** endpoint instead of the **live Standard Bank** endpoint. Fixed by switching the API call in `pages/RequestMoneyPage.tsx` from `/api/v1/peach/request-money` to `/api/v1/standardbank/payshap/rtp`. This also fixed the creditor name issue — the SBSA controller looks up the wallet holder's firstName/lastName from the database, so debtors now see "Andre Botes" instead of "MyMoolah Treasury". Tested successfully in UAT (sandbox) and staging (production credentials). After confirmation, fully decommissioned the Peach Payments PayShap integration — all routes commented out, archived headers added, proxy route removed — with code preserved for potential future reactivation.

---

## Tasks Completed

- [x] Diagnosed wrong integration: frontend was calling Peach instead of Standard Bank for PayShap RTP
- [x] Fixed `pages/RequestMoneyPage.tsx` — switched endpoint to `/api/v1/standardbank/payshap/rtp`
- [x] Tested in UAT — HTTP 202 accepted from SBSA sandbox
- [x] Tested in staging (production credentials) — full end-to-end: PDNG → ACCC → wallet credited
- [x] Confirmed creditor name fix — debtor notification shows "Request to Pay from Andre Botes"
- [x] Decommissioned Peach PayShap: routes commented out, archived headers added
- [x] Removed proxy route that forwarded `/api/v1/peach/request-money` to SBSA
- [x] Hardcoded `credentials.peach = false` in `config/security.js`
- [x] Preserved all Peach code for potential future reactivation
- [x] Documented reactivation steps in `routes/peach.js` header

---

## Key Decisions

- **Switch endpoint, not rewrite**: The SBSA backend controller was already correct and working — only the frontend needed one URL change.
- **Decommission, don't delete**: Peach code preserved (commented out) since the agreement may be reactivated in future. Clear ARCHIVED banners prevent accidental rewiring.
- **No proxy route**: Removed the proxy that forwarded Peach endpoint calls to SBSA — frontend now calls SBSA directly.

---

## Files Modified

- `mymoolah-wallet-frontend/pages/RequestMoneyPage.tsx` — Changed API endpoint from `/api/v1/peach/request-money` to `/api/v1/standardbank/payshap/rtp`; removed Peach-specific fields (`businessContext`, `clientId`, redirect URL handling)
- `routes/peach.js` — All PayShap routes commented out; only `/status` endpoint remains; reactivation instructions in header
- `server.js` — Removed conditional `isPeachArchived` logic and proxy route; simplified Peach mounting to archived-only
- `controllers/peachController.js` — Added ARCHIVED header banner (no code deleted)
- `integrations/peach/client.js` — Added ARCHIVED header banner (no code deleted)
- `config/security.js` — Hardcoded `credentials.peach = false`; removed env var check

---

## Code Changes Summary

### Fix (commit `e697a8a8`)
- **Frontend**: One line change — API endpoint URL switch from Peach to Standard Bank
- **Effect**: PayShap RTP now flows through `standardbankController.initiatePayShapRtp` which resolves user's `firstName`/`lastName` from DB

### Decommission (commit `4159344a`)
- **5 files modified**: Routes, server, controller, client, security config
- **No code deleted**: All Peach functions preserved but unreachable
- **Safeguards**: Commented routes, hardcoded `false`, archived banners, no proxy

---

## Issues Encountered

- **Critical: Wrong integration active** — The active `pages/RequestMoneyPage.tsx` was calling Peach Payments (`/api/v1/peach/request-money`) instead of Standard Bank (`/api/v1/standardbank/payshap/rtp`). A previous agent had wired the frontend to Peach after the agreement was already cancelled. An old `components/RequestMoneyPage.tsx` (dead code, not imported by `App.tsx`) had the correct SBSA endpoint.
- **Resolution**: Single-line frontend fix + full Peach decommission to prevent recurrence.

---

## Testing Performed

- [x] UAT test with SBSA sandbox account `000602739172` — HTTP 202 accepted, PROXY mode confirmed
- [x] Staging test with production SBSA credentials — full end-to-end success:
  - PDNG (Pending/Presented) at 17:40:35
  - ACCC (Accepted/Paid) at 17:41:37
  - Wallet credited at 17:41:37
- [x] Creditor name confirmed: debtor notification shows "Request to Pay from Andre Botes"
- [x] No linter errors on any modified file

---

## Next Steps

- [ ] Deploy to production — rebuild frontend + redeploy backend
- [ ] Test RTP in production with a real external payer (not Andre's own account)
- [ ] Monitor for any residual Peach endpoint calls in production logs
- [ ] Consider removing the dead `components/RequestMoneyPage.tsx` file (old version that was never imported)

---

## Important Context for Next Agent

- **Peach Payments is DECOMMISSIONED** — Do NOT reactivate without explicit approval from Andre. Agreement was cancelled. See `routes/peach.js` header for reactivation steps if ever needed.
- **PayShap RTP uses Standard Bank exclusively** — endpoint is `POST /api/v1/standardbank/payshap/rtp`. Controller resolves creditor name from User table `firstName`/`lastName`.
- **Two RequestMoneyPage files exist** — `pages/RequestMoneyPage.tsx` (ACTIVE, imported by App.tsx) and `components/RequestMoneyPage.tsx` (DEAD CODE, not imported). The dead one can be cleaned up.
- **The creditor name fix works** — SBSA controller at lines 504-511 of `standardbankController.js` looks up `firstName`/`lastName` and passes as `creditorName` to Pain.013 builder.
- **Production deployment pending** — Andre will pull, rebuild frontend, and redeploy to staging for final verification before production.

---

## Related Documentation

- `docs/SBSA_PAYSHAP_UAT_ACTIVATION_PLAN.md` — SBSA test accounts and activation checklist
- `docs/SBSA_PAYSHAP_UAT_GUIDE.md` — SBSA UAT environment setup
- `routes/peach.js` — Reactivation instructions for Peach Payments
