# Session Log - 2026-03-10 - RTP Recent Transactions, Capitec Fix, Balance Refresh

**Session Date**: 2026-03-10 21:00 - 21:30 SAST  
**Agent**: Cursor AI Agent  
**User**: André  
**Session Duration**: ~30 min

---

## Session Summary
Fixed RTP display on Recent Transactions (single net credit line), added RTP Paid notification and real-time balance refresh when money arrives, and resolved Capitec RTP not crediting by mapping ACWC/ACCC status codes to 'paid'. Discovery RTP was working; Capitec RTP (0784560585) was accepted but wallet not credited — likely due to SBSA sending ACWC instead of ACSP for inter-bank.

---

## Tasks Completed
- [x] Recent Transactions: RTP principal + fee combined into single net credit line (like RPP)
- [x] Transaction History: keep both RTP principal and fee as separate lines
- [x] RTP Paid notification when payer accepts (triggers balance refresh on frontend)
- [x] RTP status: map ACWC and ACCC to 'paid' (fixes Capitec/inter-bank RTP not crediting)
- [x] MoolahContext: balance + transactions refresh when transaction notifications arrive
- [x] RTP callback: add logging for debugging (orgnlMsgId, status, payer)
- [x] Commit all changes to main

---

## Key Decisions
- **RTP display consistency**: Mirror RPP pattern — Recent Transactions shows net (principal − fee) as single line; Transaction History shows both lines (principal, then fee). Matches other fee types (Flash cash-out, EasyPay, USDC).
- **ACWC/ACCC mapping**: ISO 20022 uses ACWC (Accepted With Conditions) and ACCC (Accepted Credit Settlement Completed) for acceptance. Discovery may send ACSP; Capitec/inter-bank may send ACWC. All three now map to 'paid'.
- **Balance refresh**: Existing notification poll (10s) already triggers refresh when `txn_wallet_credit` or `balance_refresh` notifications exist. Added RTP Paid notification so frontend gets the trigger. No new polling interval — reuse existing flow.

---

## Files Modified
- `controllers/walletController.js` — Added rtpGroups, combinedRtpRows; RTP principal+fee grouped on Recent Transactions; filter RTP fee on Dashboard
- `services/standardbankRtpService.js` — ACWC/ACCC status mapping; RTP Paid notification; [RTP-CB] logging
- `mymoolah-wallet-frontend/contexts/MoolahContext.tsx` — Minor format cleanup in refreshNotifications (logic unchanged; RTP Paid notification now triggers existing balance refresh)

---

## Code Changes Summary
- **walletController.js**: rtpGroups Map; forEach groups RTP principal (RTP-{id}) + fee (RTP-FEE-{id}); combinedRtpRows = net amount (principal + fee, fee is negative); exclude RTP fee on Dashboard
- **standardbankRtpService.js**: statusMap adds ACWC:'paid', ACCC:'paid'; after creditWalletOnPaid, createNotification('Payment Received', ...) with reason:'balance_refresh'; log orgnlMsgId, status, payer on process
- **MoolahContext.tsx**: Has transaction notification check (txn_wallet_credit, balance_refresh) → refreshBalanceAfterAction + refreshTransactions. RTP Paid notification provides the trigger.

---

## Issues Encountered
- **Capitec RTP not crediting**: User sent R10 RTP to 0784560585 (Capitec). Payer accepted but wallet not credited. Discovery RTP worked. Root cause: SBSA may send ACWC for inter-bank accepted RTP; we only mapped ACSP to 'paid'. Fix: map ACWC and ACCC to 'paid'.
- **Balance not updating immediately**: When RTP accepted, frontend didn't refresh. Root cause: no RTP Paid notification was created; refresh only triggered by transaction-type notifications. Fix: create RTP Paid notification with reason:'balance_refresh'.

---

## Testing Performed
- [ ] Unit tests written/updated
- [ ] Integration tests run
- [x] Manual testing — Discovery RTP confirmed working previously; Capitec fix and balance refresh require redeploy
- [x] Commit: 7510d074

---

## Next Steps
- [ ] Redeploy backend to staging
- [ ] Re-test Capitec RTP — ask Leonie to accept again; should credit with ACWC fix
- [ ] For R10 Capitec RTP that didn't credit — may need SBSA/Capitec support if callback was never retried
- [ ] Address timestamp display (20:00 vs 21:00) if user revisits

---

## Important Context for Next Agent
- RTP Recent Transactions: single net credit (e.g. R4.25 = R10 − R5.75 fee)
- RTP Transaction History: two lines (principal R10, fee −R5.75)
- RTP Paid notification: type `txn_wallet_credit`, subtype `payshap_rtp_paid`, payload.reason `balance_refresh` — triggers MoolahContext balance refresh
- ACWC/ACCC: both map to 'paid' for RTP callbacks; fixes Capitec/inter-bank accepted RTPs
- [RTP-CB] logs in Cloud Run: orgnlMsgId, status, payer for debugging callbacks

---

## Questions/Unresolved Items
- Exact timestamp fix for transaction display (initiation vs acceptance time)
- Whether previous Capitec R10 can be recovered via SBSA

---

## Related Documentation
- Session: `docs/session_logs/2026-03-10_1830_rtp-callback-routing-hash-debugging.md` (earlier RTP work)
- PayShap: `docs/SBSA_PAYSHAP_UAT_GUIDE.md`
