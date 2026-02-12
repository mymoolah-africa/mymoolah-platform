# Session Log - 2026-02-12 - PayShap Fee Implementation (R4 user fee, VAT split)

**Session Date**: 2026-02-12 15:00  
**Agent**: Cursor AI Agent  
**User**: André  
**Session Duration**: ~45 min

---

## Session Summary
Implemented PayShap transaction fees per business logic: R4.00 VAT incl charged to wallet user for RPP and RTP. RPP debits principal+fee; RTP credits principal−fee (fee deducted from receipt). VAT correctly split to revenue and VAT control accounts; TaxTransaction for audit.

---

## Tasks Completed
- [x] RPP: Debit wallet (principal + R4), post ledger with fee revenue + VAT control
- [x] RTP: Credit wallet (principal − R4) when Paid; fee deducted from receipt
- [x] VAT: R4 → ~R3.48 net revenue, ~R0.52 VAT payable; TaxTransaction created
- [x] Env: PAYSHAP_FEE_MM_ZAR=4, PAYSHAP_FEE_SBSA_ZAR=3
- [x] Transaction records: principal + fee for user history
- [x] RTP min amount validation (must exceed fee)
- [x] Docs: StandardBankPayShap.md, SBSA_PAYSHAP_UAT_GUIDE.md, changelog

---

## Key Decisions
- **RPP**: User pays principal + fee; total debit = amount + R4
- **RTP**: User receives principal − fee; net credit = amount − R4 (RTP is administrative request; fee deducted when Paid)
- **VAT**: Use existing LEDGER_ACCOUNT_TRANSACTION_FEE_REVENUE and LEDGER_ACCOUNT_VAT_CONTROL; TaxTransaction for audit
- **SBSA fee (R3)**: Env var added; to be recorded when SBSA settles/invoices

---

## Files Modified
- `services/standardbankRppService.js` - Fee debited, ledger + TaxTransaction
- `services/standardbankRtpService.js` - Fee deducted from credit, ledger + TaxTransaction
- `controllers/standardbankController.js` - RPP response includes fee/totalDebit; RTP response includes fee/netCredit
- `env.template` - PAYSHAP_FEE_MM_ZAR, PAYSHAP_FEE_SBSA_ZAR
- `docs/integrations/StandardBankPayShap.md` - Fee structure section
- `docs/SBSA_PAYSHAP_UAT_GUIDE.md` - Env vars
- `docs/CHANGELOG.md` - New entry
- `docs/AGENT_HANDOVER.md` - Latest achievement

---

## Business Logic Summary
| Flow | Principal | Fee | User wallet effect |
|------|-----------|-----|--------------------|
| **RPP** (outbound) | R100 sent | R4 charged | Debit R104 (principal + fee) |
| **RTP** (inbound) | R200 received | R4 deducted | Credit R196 (principal − fee) |

---

## Issues Encountered
- StandardBankTransaction has no metadata column; removed metadata from create
- TaxTransaction entityType: 'bank' not in enum; used 'customer'

---

## Next Steps
- [ ] SBSA fee (R3.00) recording when SBSA settles/invoices
- [ ] Frontend: display fee in RPP/RTP confirm flow
- [ ] User to push: `git push origin main`

---

## Important Context for Next Agent
- RTP is an administrative request; no money moves at initiation
- PAYSHAP_FEE_MM_ZAR=4 controls user fee; PAYSHAP_FEE_SBSA_ZAR=3 for future SBSA cost recording
- Ledger accounts: LEDGER_ACCOUNT_TRANSACTION_FEE_REVENUE, LEDGER_ACCOUNT_VAT_CONTROL required for fee posting

---

## Related Documentation
- `docs/integrations/StandardBankPayShap.md`
- `docs/SBSA_PAYSHAP_UAT_GUIDE.md`
- Earlier: `2026-02-12_1200_sbsa-payshap-uat-implementation.md`, `2026-02-12_1400_sbsa-payshap-business-model-deposit-notification.md`
