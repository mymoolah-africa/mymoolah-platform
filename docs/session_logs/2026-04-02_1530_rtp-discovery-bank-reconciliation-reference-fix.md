# Session Log - 2026-04-02 15:30 - RTP Discovery Bank Reconciliation & Reference Fix

**Session Date**: 2026-04-02 15:30 SAST  
**Agent**: Cursor AI Agent (Claude Opus)  
**User**: André  
**Session Duration**: ~45 minutes

---

## Session Summary
André completed a live R10 RTP (Request to Pay) transaction to Discovery Bank on the production platform. The agent performed a full double-entry ledger reconciliation confirming all amounts were correctly allocated (R4.25 wallet credit, R5.75 SBSA fee with R5.00 ex-VAT + R0.75 VAT, journal balanced DR=CR=R10.00). During review, André identified a critical issue: the `CdtrRefInf.Ref` in Pain.013 was using user-provided description text instead of the creditor's MSISDN from the database. This was fixed — the reference now always contains `"{CreditorName}: {creditorPhoneNumber}"` sourced from the user's DB record, ensuring the deposit notification service can auto-match inbound credits to the correct wallet.

---

## Tasks Completed
- [x] Full production RTP reconciliation — Discovery Bank R10 transaction verified across all ledgers
- [x] Confirmed wallet balance correctly moved from R550.00 to R554.25 (net credit R4.25)
- [x] Verified SBSA fee posting: R5.75 (incl. VAT) → R5.00 ex-VAT + R0.75 VAT (15%)
- [x] Verified journal entry #5: DR Bank R10.00 = CR Float R4.25 + CR SBSA Cost R5.00 + CR VAT R0.75
- [x] Verified tax transaction record with correct pass-through VAT accounting (net R0)
- [x] Verified notification sent with `balance_refresh` trigger
- [x] Fixed CdtrRefInf.Ref to use creditor MSISDN from DB instead of user-provided description
- [x] Fix applied to both `initiateRtpRequest()` and `retryRtpAsPbac()` paths

---

## Key Decisions
- **CdtrRefInf.Ref must contain creditor MSISDN**: The deposit notification service (`standardbankDepositNotificationService.js`) uses `resolveReference()` to match the reference to a phone number and find the correct wallet. User-provided text in this field would break auto-crediting. The user's description/reference is now stored in RTP metadata as `userDescription` but never placed in the bank reference.
- **Phone format: local 0-prefixed**: The MSISDN is stored as `+27825571055` in the DB but converted to `0825571055` for the reference using `.replace(/^\+27/, '0')`, matching the format the deposit notification service expects.
- **Balance auto-refresh timing**: The notification mechanism works (notification created with `reason: "balance_refresh"`), but the ~1 minute delay before balance updated is a UX polish item, not a data integrity issue. The 10-second polling interval combined with deduplication logic can occasionally miss a refresh cycle.

---

## Files Modified
- `services/standardbankRtpService.js` — Fixed `remittanceInfo` construction in both `initiateRtpRequest()` (line ~138-141) and `retryRtpAsPbac()` (line ~561-564) to use creditor's `phoneNumber` from DB instead of user-provided `description`/`reference`. Added `creditorPhoneNumber` and `userDescription` to RTP metadata.

---

## Code Changes Summary
- **`initiateRtpRequest()`**: User lookup now fetches `phoneNumber` in addition to `firstName`/`lastName`. `remittanceInfo` built as `"{CreditorName}: {creditorPhoneNumber}"` with `merchantTransactionId` as fallback only if phone is unavailable.
- **`retryRtpAsPbac()`**: Same pattern — fetches user's `phoneNumber` for the PBAC retry remittance info.
- **RTP metadata**: Now includes `creditorPhoneNumber` (the resolved phone) and `userDescription` (the user's original description/reference input) for audit trail.

---

## Issues Encountered
- **ECONNRESET on production proxy (port 6545)**: Stale Cloud SQL Auth Proxy connections. Fixed by killing stale processes and running `./scripts/ensure-proxies-running.sh`.
- **Column name mismatches in queries**: Production `users` table uses `phoneNumber` (not `mobileNumber`) and phone numbers are stored with `+27` prefix. Adjusted queries accordingly.
- **Balance auto-refresh delay**: The frontend polls notifications every 10 seconds. The `txn_wallet_credit` notification was created correctly with `reason: "balance_refresh"`, but the balance didn't update for ~1 minute. This is a minor UX issue in the deduplication logic in `MoolahContext.tsx` — the `window.__processedTxnNotifIds` Set can cause refresh skips under certain timing conditions.

---

## Testing Performed
- [x] Production RTP transaction verified end-to-end (Discovery Bank, R10)
- [x] All ledger entries verified balanced (DR = CR = R10.00)
- [x] Wallet balance verified (R550.00 → R554.25)
- [x] Fee breakdown verified (R5.75 = R5.00 ex-VAT + R0.75 VAT)
- [x] Tax transaction record verified (pass-through, net VAT R0)
- [x] Notification record verified (type `txn_wallet_credit`, payload includes `balance_refresh`)
- [x] Code change reviewed — no lint errors

---

## Next Steps
- [ ] Deploy updated `standardbankRtpService.js` to production (Cloud Run)
- [ ] Test another RTP to verify the reference now contains the auto-resolved MSISDN
- [ ] Investigate balance auto-refresh timing issue in `MoolahContext.tsx` (UX polish)
- [ ] Continue PayShap RTP testing with other banks (Capitec, FNB, ABSA, Nedbank)

---

## Important Context for Next Agent
- The RTP reference fix (commit `0a990d56`) is committed and pushed but **not yet deployed to production**. André needs to redeploy for the fix to take effect.
- The previous RTP transaction (Discovery Bank R10) worked correctly despite the bug because André happened to type `0825571055` as the description — which matched his phone number. The fix ensures this always happens automatically.
- There were 2 RTP requests today: ID 1 (rejected/declined by André on Discovery app) and ID 2 (approved, R10 paid). Only ID 2 generated wallet credit + journal entries.
- Production wallet balance for User 1 (Andre Botes, +27825571055): R554.25
- The `DuePyblAmt` in the Pain.013 is set to `9.99` — this is the net amount after the SBSA fee, minus 1 cent (SBSA requirement). This is correct and expected.
- Balance auto-refresh uses notification polling (10s interval). Not WebSocket-based. The `MoolahContext.tsx` deduplication with `window.__processedTxnNotifIds` can occasionally skip a refresh.

---

## Production RTP Reconciliation Summary

| Component | Amount | Ledger Account | DR/CR |
|-----------|--------|---------------|-------|
| Bank inflow | R10.00 | 1100-01-01 (User Wallet Clearing) | DR |
| Wallet credit | R4.25 | 2100-01-01 (Client Float Liability) | CR |
| SBSA fee ex-VAT | R5.00 | 5000-10-01 (Cost of Sales: PayShap SBSA Fee) | CR |
| VAT on SBSA fee | R0.75 | 2300-10-01 (VAT Control Account) | CR |
| **Total** | **DR R10.00 = CR R10.00** | **Balanced** | **Yes** |

---

## Related Documentation
- `services/standardbankRtpService.js` — RTP service with fix
- `services/standardbankDepositNotificationService.js` — Deposit notification wallet matching (uses reference)
- `services/payshapFeeService.js` — Fee tiers and VAT extraction
- `mymoolah-wallet-frontend/contexts/MoolahContext.tsx` — Balance refresh polling logic
- `docs/SBSA_PAYSHAP_UAT_GUIDE.md` — PayShap UAT testing guide
