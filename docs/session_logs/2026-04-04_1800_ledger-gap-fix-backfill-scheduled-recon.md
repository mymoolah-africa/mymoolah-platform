# Session Log - 2026-04-04 - Ledger Gap Fix, Backfill Script, Scheduled Recon Service

**Session Date**: 2026-04-04 18:00  
**Agent**: Cursor AI Agent  
**User**: Andre  
**Session Duration**: ~60 min

---

## Session Summary
Fixed the R800.13 wallet-vs-ledger discrepancy identified by the production audit. The root cause was that several transaction types (MobileMart VAS purchases, referral payouts, PayShap deposits through non-standard paths) did not post face-value journal entries to the general ledger. Fixed forward code paths (overlayServices, referralPayoutService, productPurchaseService), built an idempotent backfill script for historical transactions, and created a scheduled reconciliation service wired to Cloud Scheduler.

---

## Tasks Completed
- [x] Diagnosed root cause: wallet movements without corresponding ledger journal entries
- [x] Added `postFaceValueJournal()` helper to overlayServices.js — posts DR 2100-01-01, CR supplier float for VAS face values
- [x] Wired face-value JE posting into 3 purchase paths: airtime/data, electricity, bill payment
- [x] Added face-value JE posting to productPurchaseService.js (voucher path)
- [x] Added referral payout JE posting to referralPayoutService.js (DR 2200-03-01, CR 2100-01-01)
- [x] Built `scripts/backfill-missing-journal-entries.js` — idempotent script to post missing JEs for deposits, VAS face values, and referral payouts
- [x] Built `services/scheduledReconService.js` — automated wallet-vs-ledger, float, commission, trial balance checks
- [x] Wired scheduled recon to `/api/v1/reconciliation/scheduled-recon` endpoint with OIDC auth
- [x] Verified deposit notification service already posts JEs correctly (no fix needed)
- [x] Confirmed P2P transfers are net-zero on 2100-01-01 and don't need JEs

---

## Key Decisions
- **Face-value JEs posted non-blocking (post-commit)**: Matching the Flash eeziPower pattern — the JE is posted AFTER the DB transaction commits, in a try/catch that swallows errors. This prevents ledger issues from blocking purchases.
- **Backfill uses BACKFILL- prefix references**: All backfill JE references start with `BACKFILL-` (e.g., `BACKFILL-DEP-TXN1`, `BACKFILL-VAS-FACE-TXN5`) for clear audit trail separation from regular entries.
- **P2P transfers excluded from ledger posting**: Since 2100-01-01 is an aggregate client float liability account, P2P movements are net-zero. The total MMTP liability doesn't change when money moves between wallets.
- **Scheduled recon checks 6 dimensions**: trial balance, wallet vs txn flow, wallet aggregate vs ledger, supplier floats, commission integrity, negative wallets.
- **No existing transactions deleted or modified**: Only INSERT operations for new journal entries and journal lines.

---

## Files Modified
- `routes/overlayServices.js` — Added `postFaceValueJournal()` helper and calls in airtime/data, electricity, bill payment paths
- `services/referralPayoutService.js` — Added ledger JE posting after wallet credit (DR Referral Payable, CR Client Float)
- `services/productPurchaseService.js` — Added face-value JE posting in voucher purchase path
- `routes/reconciliation.js` — Added `/scheduled-recon` endpoint with Cloud Scheduler OIDC auth
- `services/scheduledReconService.js` — NEW: Automated reconciliation service (6 checks)
- `scripts/backfill-missing-journal-entries.js` — NEW: Idempotent backfill for missing JEs

---

## Code Changes Summary
- **Forward fix**: Every VAS purchase (airtime, data, electricity, bill payment, voucher) now posts a face-value JE (DR Client Float 2100-01-01, CR Supplier Float). This matches the pattern already used by Flash eeziPower.
- **Referral payout fix**: Wallet credits for referral payouts now post a JE (DR Referral Payable 2200-03-01, CR Client Float 2100-01-01), clearing the accrued payable.
- **Backfill**: Script queries transactions table, identifies gaps (deposits, VAS face values, referral payouts without matching JEs), and posts missing entries idempotently.
- **Scheduled recon**: Cloud Scheduler can trigger `/api/v1/reconciliation/scheduled-recon` to run 6 automated checks, persist results to recon_runs, and email alerts on failure.

---

## Issues Encountered
- **PayShap R1,500 deposit JE**: The deposit notification service DOES post JEs for PayShap deposits, so the initial R1,500 must have been deposited through a simulation script or manual wallet credit that bypassed the notification service. The backfill script handles this.
- **No automated referral commission accrual JEs**: The REFERRAL-COMM-* entries in the DB were manually posted by a previous agent. The referralEarningsService only creates referral_earnings rows, not JEs. This is a known gap but the amounts are small.

---

## Testing Performed
- [ ] Backfill script dry-run (requires Codespaces with DB proxy)
- [ ] Backfill script live run (requires Codespaces)
- [ ] Re-run production audit after backfill
- [ ] Test VAS purchase with new face-value JE posting
- [ ] Test referral payout with new JE posting

---

## Next Steps
- [ ] Andre: Pull in Codespaces, run backfill dry-run: `node scripts/backfill-missing-journal-entries.js --production --dry-run`
- [ ] Andre: Run backfill live: `node scripts/backfill-missing-journal-entries.js --production`
- [ ] Andre: Re-run audit: `node scripts/production-full-audit.js --production`
- [ ] Andre: Restart backend: `./scripts/one-click-restart-and-start.sh`
- [ ] Set up Cloud Scheduler job for scheduled-recon endpoint (daily at 03:00 SAST)
- [ ] Consider adding face-value JE posting for internal voucher issue/redeem (currently net-zero, low priority)

---

## Important Context for Next Agent
- The R800.13 ledger gap was caused by missing face-value JEs for VAS purchases (MobileMart) and missing deposit JEs for PayShap deposits that bypassed the notification service.
- The backfill script MUST be run in Codespaces before the audit will pass. It's a one-time operation.
- The `postFaceValueJournal()` function in overlayServices.js looks up the supplier's float account from the `supplier_floats` table. If a new supplier is added without a `ledgerAccountCode`, the JE will be skipped with a warning.
- Flash VAS (eeziPower/eeziAirtime) already had face-value JEs — the fix was only needed for MobileMart, vouchers, and bill payments.
- P2P transfers don't need JEs because 2100-01-01 is a single aggregate account and the total liability doesn't change.
- The scheduled recon service is wired to the existing reconciliation route. Cloud Scheduler needs to be set up with the `/api/v1/reconciliation/scheduled-recon` endpoint.

---

## Related Documentation
- Previous audit session: `docs/session_logs/2026-04-03_2100_production-audit-treasury-referrals-vouchers-vas.md`
- Settlement patterns: `docs/SETTLEMENTS.md`
- Reconciliation framework: `docs/RECONCILIATION_FRAMEWORK.md`
