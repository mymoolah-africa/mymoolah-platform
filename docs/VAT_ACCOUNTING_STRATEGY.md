# MMTP VAT Accounting Strategy

**Last Updated**: 2026-04-26  
**Owner**: MyMoolah Treasury / Finance  
**Classification**: Internal - Banking-Grade Accounting Policy

## Core Policy

MMTP records VAT control entries only on MMTP's own earned revenue. Amounts collected from users and passed through to suppliers, clients, merchants, banks, or payment processors are not MMTP revenue and must not create MMTP VAT control records.

This means:

- **MMTP revenue / markup / commission**: Post revenue ex-VAT to the relevant revenue account and VAT to `LEDGER_ACCOUNT_VAT_CONTROL`.
- **Supplier, bank, client, or merchant pass-through fee**: Post the full VAT-inclusive amount to the relevant supplier clearing, bank clearing, merchant float, or client/settlement payable account. Do not post VAT control for MMTP.
- **TaxTransaction records**: Create output VAT records only for MMTP revenue. Do not create input/output VAT records to net pass-through fees to zero.
- **Metadata** may retain supplier VAT breakdowns for audit, supplier invoice matching, and reconciliation, but these values are informational unless Finance confirms MMTP is principal for that transaction.

## Classification Matrix

| Flow | MMTP Role | VAT Treatment | Ledger Treatment |
|------|-----------|---------------|------------------|
| PayShap RPP SBSA fee | Agent / pass-through collector | No MMTP VAT control | Credit SBSA/supplier clearing for the VAT-inclusive SBSA fee |
| PayShap RPP MMTP markup | Principal earning revenue | Output VAT on MMTP markup only | Credit fee revenue ex-VAT and VAT control |
| PayShap RTP SBSA fee | Agent / pass-through collector | No MMTP VAT control | Credit SBSA/supplier clearing for the VAT-inclusive SBSA fee |
| Wallet-bank EFT fee | MMTP customer transaction fee | Output VAT on MMTP fee unless policy marks it exempt/out of scope | Credit transaction fee revenue ex-VAT and VAT control |
| Zapper QR supplier fee | Agent / pass-through collector | No MMTP VAT control | Credit Zapper/merchant float or supplier clearing for VAT-inclusive supplier cost |
| Zapper QR MMTP fee | Principal earning revenue | Output VAT on MMTP fee only | Credit commission revenue ex-VAT and VAT control |
| EasyPay/Flash cash-out provider fee | Agent / pass-through collector | No MMTP VAT control | Credit supplier clearing/float for VAT-inclusive provider fee |
| EasyPay/Flash cash-out MMTP margin | Principal earning revenue | Output VAT on MMTP margin only | Credit fee revenue ex-VAT and VAT control |
| VAS supplier commission earned by MMTP | Principal earning commission | Output VAT on MMTP commission | Credit commission revenue ex-VAT and VAT control |

## Implementation Rules

1. Do not use `LEDGER_ACCOUNT_VAT_CONTROL` for pass-through amounts.
2. Do not create `TaxTransaction` rows for pass-through-only flows.
3. Do not post supplier pass-through fees to MMTP cost-of-sales unless MMTP is absorbing the supplier fee instead of collecting it from the user.
4. If a user fee contains both pass-through and MMTP markup, split it:
   - Pass-through portion: full VAT-inclusive amount to clearing/payable.
   - MMTP portion: ex-VAT revenue plus VAT control.
5. Journal entries must stay balanced without relying on artificial input/output VAT cancellation.

## Current Code Alignment

As of 2026-04-26, the following live paths are aligned with this policy:

- `services/standardbankRppService.js`
- `services/standardbankRtpService.js`
- `controllers/qrPaymentController.js`
- `controllers/voucherController.js` EasyPay cash-out creation
- `controllers/flashController.js` Flash cash-out PIN creation
- `services/commissionVatService.js` for MMTP-earned VAS commission

Historical production cleanup completed on 2026-04-26:

- PayShap RPP: previously corrected with `CORR-RPP-PASS-*` journals.
- PayShap RTP: 6 historical entries corrected with `CORR-RTP-PASS-*` journals, reclassifying R34.50 of SBSA pass-through fees from SBSA cost/VAT control to supplier clearing.
- Read-only checks found no remaining Zapper VAT debit lines, EasyPay provider-expense lines, or Flash cash-out VAT-control lines matching the legacy pass-through patterns.

## Related References

- `docs/CHART_OF_ACCOUNTS.md`
- `docs/BANKING_GRADE_ARCHITECTURE.md`
- `docs/integrations/StandardBankPayShap.md`
