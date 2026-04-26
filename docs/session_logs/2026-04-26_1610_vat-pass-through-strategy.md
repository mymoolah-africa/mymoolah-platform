# Session Log - 2026-04-26 - VAT Pass-Through Strategy

**Session Date**: 2026-04-26 16:10 SAST  
**Agent**: Cursor AI Agent  
**User**: André  
**Session Duration**: Continuation session

---

## Session Summary

Formalised MMTP's VAT accounting strategy and aligned live pass-through fee paths. The key policy is now explicit: MMTP records VAT control/TaxTransaction rows only on MMTP-owned revenue, markup, or commission; supplier, bank, client, and merchant throughput fees stay VAT-inclusive in clearing/payable accounts.

Historical production cleanup was also completed for PayShap RTP: 6 legacy RTP journal entries were corrected non-destructively with new `CORR-RTP-PASS-*` journals.

---

## Tasks Completed

- [x] Formalised VAT accounting policy in `docs/VAT_ACCOUNTING_STRATEGY.md`.
- [x] Swept live VAT writers across PayShap, Zapper, EasyPay, Flash, VAS commission, and scripts.
- [x] Fixed PayShap RTP forward ledger posting to use SBSA/supplier clearing instead of SBSA cost + VAT control.
- [x] Fixed Zapper QR fee allocation so supplier VAT is informational only and MMTP VAT control records only MMTP fee VAT.
- [x] Fixed EasyPay cash-out ledger posting so provider fee is pass-through and only MMTP margin VAT hits VAT control.
- [x] Fixed Flash cash-out ledger posting so provider fee is pass-through and only MMTP margin VAT hits VAT control.
- [x] Added production RTP correction script and applied it successfully.
- [x] Updated major docs and agent handover.

---

## Key Decisions

- **VAT control scope**: Only MMTP-owned revenue creates VAT control entries. Pass-through supplier/bank/client/merchant charges do not.
- **Pass-through ledger target**: Use supplier clearing/payable accounts for VAT-inclusive throughput fees, not cost-of-sales, unless MMTP is absorbing the fee.
- **Historical correction method**: Preserve immutable historical journals and insert balancing correction journals.
- **TaxTransaction scope**: Do not create TaxTransaction rows for pass-through-only flows going forward.

---

## Files Modified

- `docs/VAT_ACCOUNTING_STRATEGY.md` - New canonical VAT policy and flow classification matrix.
- `services/standardbankRtpService.js` - RTP SBSA fee now posts to clearing as pass-through; no VAT-control/TaxTransaction write.
- `services/standardbankRppService.js` - Comment clarified: TaxTransaction is only for MMTP markup VAT.
- `services/payshapFeeService.js` - RTP fee comments aligned to pass-through policy.
- `services/tierFeeService.js` - Supplier VAT comments changed to informational unless MMTP is principal.
- `controllers/qrPaymentController.js` - Removed Zapper input VAT TaxTransaction and VAT-control debit.
- `controllers/voucherController.js` - EasyPay cash-out provider fee posts to clearing; MMTP margin split ex-VAT + VAT.
- `controllers/flashController.js` - Flash cash-out provider fee posts to clearing; MMTP margin split ex-VAT + VAT.
- `scripts/correct-production-rtp-pass-through-ledger.js` - New non-destructive production correction script.
- `scripts/correct-production-rpp-pass-through-ledger.js` - Confirmed connection cleanup pattern.
- `scripts/audit-and-update-zapper-transactions.js` - Disabled legacy script unless explicitly allowed, because it predates the policy.
- `scripts/production-full-audit.js` - Legacy RTP TaxTransaction comment clarified.
- `tests/standardbankRppService.insufficient-balance.test.js` - Added RTP ledger-line coverage.
- `docs/CHART_OF_ACCOUNTS.md`, `docs/BANKING_GRADE_ARCHITECTURE.md`, `docs/CHANGELOG.md`, `docs/README.md`, `docs/integrations/StandardBankPayShap.md`, `docs/AGENT_HANDOVER.md` - Updated policy and correction notes.

---

## Code Changes Summary

- PayShap RTP forward flow now balances as: DR Bank principal, CR Client Float net credit, CR Supplier Clearing SBSA fee VAT-inclusive.
- Zapper QR, EasyPay cash-out, and Flash cash-out no longer post pass-through VAT to MMTP VAT control.
- Added a production-safe correction script for legacy RTP pass-through journals.
- Legacy Zapper audit/update script now refuses to run unless `ZAPPER_LEGACY_FEE_AUDIT_ALLOW=true` is set after Finance confirms scope.

---

## Issues Encountered

- **Production audit query hung**: A read-only inline audit query hung after returning the RTP journal counts. It was stopped and replaced with smaller scoped queries using proper client release/cleanup.
- **RTP correction script initially held the pool open**: Added `client.release()` before `dbHelper.closeAll()` so scripts exit cleanly.
- **Existing Jest warning**: Jest still warns about unknown config option `setupFilesAfterSetup`; this existed before this task and did not block the targeted tests.

---

## Testing Performed

- [x] Unit tests updated.
- [x] Targeted test run passed:
  - `npm test -- --runTestsByPath tests/standardbankRppService.insufficient-balance.test.js`
  - Result: 1 suite passed, 3 tests passed.
- [x] Syntax checks passed:
  - `node --check` on touched services, controllers, and scripts.
- [x] Linter check passed:
  - Cursor lints reported no errors on touched files.
- [x] Production correction validation:
  - RTP dry-run found 6 eligible corrections totalling R34.50.
  - RTP apply posted 6 `CORR-RTP-PASS-*` journals.
  - RTP follow-up dry-run found 0 remaining eligible corrections.
  - Read-only checks found no remaining Zapper VAT debit lines, EasyPay provider expense lines, or Flash cash-out VAT-control lines matching legacy pass-through patterns.

---

## Next Steps

- [ ] Commit the VAT strategy/code/docs changes when André confirms or requests commit.
- [ ] Deploy backend so forward-code VAT treatment is active in runtime environments.
- [ ] Keep historical correction scripts for audit evidence; do not rerun apply unless dry-run shows eligible corrections.

---

## Important Context for Next Agent

- Production DB has already been corrected for historical RPP and RTP pass-through ledger treatment via immutable correction journals.
- Do not delete or mutate old journal rows; use correction journals only.
- `docs/VAT_ACCOUNTING_STRATEGY.md` is now the canonical policy for VAT treatment.
- Existing historical docs/session logs may still describe old RTP VAT treatment as the then-current state; treat those as historical, not current policy.

---

## Questions/Unresolved Items

- Full deployment was not performed in this turn.
- No git commit was created in this turn unless André requests it next.

---

## Related Documentation

- `docs/VAT_ACCOUNTING_STRATEGY.md`
- `docs/CHART_OF_ACCOUNTS.md`
- `docs/BANKING_GRADE_ARCHITECTURE.md`
- `docs/CHANGELOG.md`
- `docs/AGENT_HANDOVER.md`
