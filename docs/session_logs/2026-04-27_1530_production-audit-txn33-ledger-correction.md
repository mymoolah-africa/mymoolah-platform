# Session Log - 2026-04-27 - Production Audit TXN33 Ledger Correction

**Session Date**: 2026-04-27 15:30 SAST  
**Agent**: Cursor AI Agent  
**User**: André  
**Session Duration**: ~30 minutes

---

## Session Summary
Updated the production full audit script for the new VAT/pass-through model and investigated the remaining production audit failure. The R50 wallet-ledger discrepancy was traced to TXN#33, a completed MobileMart electricity purchase whose commission journal existed but whose VAS face-value journal was missing; with André's explicit approval, a non-destructive correction journal was inserted and the full production audit now reconciles with zero failures.

---

## Tasks Completed
- [x] Confirmed VAT strategy against audit/code paths and external principal-vs-agent standards.
- [x] Updated `scripts/production-full-audit.js` so PayShap RTP/RPP and inclusive VAT rounding match the Apr 2026 VAT/pass-through model.
- [x] Traced the R50 production wallet-ledger discrepancy using SELECT-only diagnostics first.
- [x] Confirmed TXN#33 (`TXN-1775385125460-oiwqno`) was missing its R50 VAS face-value journal.
- [x] Created `scripts/correct-production-missing-vas-face-txn33.js` with dry-run/apply modes, account validation, source transaction validation, and idempotency guard.
- [x] Ran dry-run, then applied one balanced correction journal after André approved production DB correction.
- [x] Re-ran full production audit and confirmed zero failures.

---

## Key Decisions
- **Non-destructive correction only**: Existing production transactions, VAS rows, and journals were not updated or deleted. The fix was an immutable balancing journal.
- **Correction reference**: Used `VAS-FACE-TXN-1775385125460-oiwqno` so future audits can match the face-value journal to the original wallet transaction.
- **Audit script policy alignment**: PayShap pass-through fees are validated through supplier clearing, while MMTP VAT control is tested only for MMTP-owned revenue/markup/commission.

---

## Files Modified
- `scripts/production-full-audit.js` - Updated tax/VAT rounding and PayShap RTP/RPP audit logic for the current VAT pass-through strategy.
- `scripts/correct-production-missing-vas-face-txn33.js` - New production-safe, idempotent correction script for the missing TXN#33 VAS face journal.
- `docs/CHANGELOG.md` - Documented audit update, production correction, and validation results.
- `docs/AGENT_HANDOVER.md` - Updated latest feature/status for next-agent continuity.
- `docs/session_logs/2026-04-27_1530_production-audit-txn33-ledger-correction.md` - This session log.

---

## Code Changes Summary
- Tax transaction audit now considers `calculationMethod` and validates inclusive VAT using total amount where appropriate.
- PayShap audit no longer applies inbound RTP assumptions to outbound RPP journals.
- RTP audit includes SBSA clearing/pass-through and historical `CORR-RTP-PASS-*` correction lines.
- RPP audit validates full wallet debit against bank principal, SBSA clearing, MMTP fee revenue, and MMTP VAT, including historical `CORR-RPP-PASS-*` correction lines.
- TXN#33 correction script posts DR `2100-01-01` / CR `1200-10-05` for R50.00 once only.

---

## Issues Encountered
- **Stale production proxy**: Initial read-only trace hit `read ECONNRESET`. Restarted only the local production Cloud SQL proxy and retried.
- **Audit script false positives**: Old section 8 selected all `SBSA-%` journals and applied RTP logic to RPP, causing false PayShap failures after pass-through corrections.
- **Real data discrepancy**: TXN#33 had wallet/VAS/commission records, but no face-value journal.

---

## Testing Performed
- [x] Syntax checks:
  - `node --check scripts/production-full-audit.js`
  - `node --check scripts/correct-production-missing-vas-face-txn33.js`
- [x] Production correction dry-run:
  - `node scripts/correct-production-missing-vas-face-txn33.js --production --dry-run`
- [x] Production correction apply:
  - `node scripts/correct-production-missing-vas-face-txn33.js --production --apply`
- [x] Idempotency verification:
  - Re-running dry-run after apply refused duplicate correction because `VAS-FACE-TXN-1775385125460-oiwqno` already exists.
- [x] Final production audit:
  - `node scripts/production-full-audit.js --production`
  - Result: `STRUCTURAL PASS`, `COMPLETENESS PASS`, `ACCURACY PASS`, `COMPLIANCE PASS`, `0 failures`, `2 warnings`.
- [x] Cursor lints:
  - No linter errors on modified script files.

---

## Next Steps
- [ ] Commit and push the script/docs changes when André confirms.
- [ ] Decide separately whether to populate the audit hash-chain table; current audit warning remains because the table exists but is empty.
- [ ] Keep the R400 transaction anomaly as an informational/statistical warning unless Finance wants a manual annotation workflow.

---

## Important Context for Next Agent
- Production DB was changed only by inserting one balanced journal entry:
  - Reference: `VAS-FACE-TXN-1775385125460-oiwqno`
  - DR `2100-01-01` R50.00
  - CR `1200-10-05` R50.00
- Do not rerun the apply path; the script is idempotent and will refuse because the correction reference exists.
- Final production audit has zero failures. Remaining warnings are not ledger breaks: R400 statistical anomaly and empty hash-chain audit trail.
- The updated audit script should be used for future production audits under the Apr 2026 VAT pass-through policy.

---

## Questions/Unresolved Items
- Should the correction script remain permanently for audit evidence, or be archived after commit?
- Should EasyPay/Flash cash-out margins also persist `tax_transactions` rows for consistency with RPP/QR/VAS commission VAT sub-ledgers?

---

## Related Documentation
- `docs/VAT_ACCOUNTING_STRATEGY.md`
- `docs/CHANGELOG.md`
- `docs/AGENT_HANDOVER.md`
- `scripts/production-full-audit.js`
- `scripts/correct-production-missing-vas-face-txn33.js`
