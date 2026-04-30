# Session Log - 2026-04-30 - Discovery RTP PBAC Suppression

**Session Date**: 2026-04-30 12:25 SAST  
**Agent**: Cursor AI Agent  
**User**: André  
**Session Duration**: Follow-up after H2H R100 recovery

---

## Session Summary
Fixed the unsafe Discovery RTP retry behaviour by suppressing hidden automatic PBAC retries after proxy-based RTP system rejects. After a live retest still showed Discovery rejecting the original proxy mandate with `EERRR,EBONF`, added Discovery-specific primary PBAC routing when Discovery account details are supplied.

---

## Tasks Completed
- [x] Kept existing production transaction descriptions unchanged.
- [x] Added neutral future deposit descriptions: `Deposit from <sender>` when reliable sender data exists, otherwise `Deposit`.
- [x] Updated bank-origin deposit icons to use the inbound arrow icon instead of the wallet icon.
- [x] Changed RTP callback handling so proxy system rejects no longer auto-create PBAC retries by default.
- [x] Verified production `20260430_v4` still failed the original Discovery proxy RTP with `RJCT` / `EERRR,EBONF`, while correctly suppressing hidden PBAC retry.
- [x] Added Discovery-specific primary PBAC routing so Discovery RTPs use bank account details from initiation instead of proxy-first.
- [x] Cleaned wallet transaction display so raw SBSA `/PREF/...PAYSHAP PAYMENT FROM` narratives render as `Deposit`.
- [x] Added focused regression tests for deposit descriptions and RTP auto-PBAC suppression.

---

## Key Decisions
- **No hidden second mandates**: A proxy/mobile RTP reject must not silently create a new PBAC/account-based mandate. Account-based RTP should be explicit in product flow.
- **Discovery PBAC primary**: For Discovery Bank only, when both mobile and account details are available, build the RTP as PBAC from initiation because live proxy mandates reject as not payable.
- **Audit metadata retained**: Suppressed auto-PBAC attempts are recorded on the RTP request metadata with `pbacAutoRetry: suppressed`.
- **Legacy escape hatch**: `STANDARDBANK_RTP_AUTO_PBAC_RETRY_ENABLED=true` can intentionally re-enable legacy auto-PBAC, but default behaviour is safe suppression.
- **Discovery override**: `STANDARDBANK_RTP_DISCOVERY_PROXY_FIRST=true` can restore Discovery proxy-first routing if SBSA/Discovery later fix or require the proxy route.

---

## Files Modified
- `services/standardbankRtpService.js` - Suppressed default auto-PBAC retry on proxy system rejects, added Discovery primary PBAC routing, and exported feature flag/routing helpers.
- `tests/standardbank/standardbankRtpService.test.js` - Added Discovery-style `EBONF` suppression coverage and Discovery PBAC-primary initiation coverage.
- `services/standardbankDepositNotificationService.js` - Added sender extraction and neutral deposit description generation.
- `services/standardbank/sbsaStatementService.js` - Passed full statement narrative into deposit notification payloads.
- `controllers/standardbankController.js` - Passed sender name into inbound PayShap deposit processing.
- `mymoolah-wallet-frontend/utils/transactionIcons.tsx` - Classified SBSA/bank-origin deposits as banking transactions for inbound arrow icon display.
- `mymoolah-wallet-frontend/utils/transactionDisplay.ts` - Centralised cleanup of raw transaction descriptions for wallet lists and detail modals.
- Wallet dashboard/history/detail components - Applied display cleanup consistently without changing persisted historical transaction rows.
- `tests/standardbank/depositDescription.test.js` - Added deposit description tests.
- `docs/CHANGELOG.md` and `docs/AGENT_HANDOVER.md` - Updated current status and validation notes.

---

## Testing Performed
- [x] Wallet frontend build.
- [x] Focused RTP and deposit Jest tests.
- [x] Syntax checks.
- [x] Linter check on edited files.

Commands:
- `npm run build` from `mymoolah-wallet-frontend`
- `node --check services/standardbankRtpService.js && node --check tests/standardbank/standardbankRtpService.test.js`
- `node --check services/standardbankDepositNotificationService.js && node --check services/standardbank/sbsaStatementService.js && node --check controllers/standardbankController.js && node --check tests/standardbank/depositDescription.test.js`
- `npx jest tests/standardbank/standardbankRtpService.test.js tests/standardbank/depositDescription.test.js tests/standardbank/sbsaStatementService.statementCreditSafety.test.js tests/standardbank/inboundCreditEventService.test.js --runInBand --no-cache`

Latest result: `20/20` focused tests passed. Discovery test logs `mode=PBAC`, `DbtrAcct.Id.Item.Id=18828076450`, `DbtrAgt=679000`, and `hasProxy=false`.

Latest display cleanup result: wallet frontend build passed; focused backend tests pass `21/21`.

---

## Production Evidence
- Backend revision during failed retest: `mymoolah-backend-production-00171-nft`, image `gcr.io/mymoolah-db/mymoolah-backend:20260430_v4`.
- Discovery RTP message id: `MMRTPMMRTP1777546327002c81puw`.
- Timeline: initiated `2026-04-30T10:52:07Z`, pending callbacks at `10:52:16Z`, rejected at `10:52:46Z`.
- Reject reasons: group `EBONF: One or more request to pays failed when trying to create batch`, payment `EERRR: Error`.
- DB state: one RTP row, status `rejected`, metadata `pbacAutoRetry: suppressed`, `proxyRejectCodes: [EERRR, EBONF]`; no PBAC retry record created.
- Follow-up Discovery instant payment was credited at 13:08; UI screenshot showed raw `/PREF/...PAYSHAP PAYMENT FROM` narrative, now cleaned in display code.

---

## Next Steps
- [x] Commit and push Discovery PBAC-primary and wallet display cleanup changes to `main`.
- [ ] Deploy latest `main` backend if not already done after commit `3703ebed`.
- [ ] After deploy, retest Discovery RTP with account details present and confirm initial log says `mode=PBAC`, not `mode=PROXY`.
- [ ] If product wants account-based RTP fallback later, build an explicit user/customer initiated PBAC flow rather than automatic retry.

---

## Important Context for Next Agent
- Discovery PBAC-primary and wallet display cleanup changes were committed and pushed to `main`; latest pushed commit is `3703ebed fix(wallet): clean bank deposit transaction descriptions`.
- The final end-of-day docs wrap in `docs/session_logs/2026-04-30_1625_discovery-rtp-h2h-wrap.md` was intentionally left uncommitted per André's instruction.
- The H2H R100 recovery from the previous session is already deployed and verified; do not reprocess it.
- Existing historical transaction descriptions were intentionally not changed because André said no need.

---

## Questions/Unresolved Items
- Production deployment/retest status after commit `3703ebed` was not verified in this log.

---

## Related Documentation
- `docs/AGENT_HANDOVER.md`
- `docs/CHANGELOG.md`
- `docs/session_logs/2026-04-30_1220_h2h-r100-reprocess.md`
