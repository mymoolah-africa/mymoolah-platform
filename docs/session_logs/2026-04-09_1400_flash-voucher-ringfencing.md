# Session Log: Flash Voucher Deposit Ringfencing — AML Cash-Out Restriction

**Date**: 2026-04-09
**Start Time**: ~12:00 (Plan mode), ~14:00 (Agent mode)
**Agent**: Claude Opus 4.6 (Thinking)
**Version**: v2.92.0 → v2.93.0

---

## Session Summary

Implemented a dual-layer ringfencing mechanism for Flash voucher deposits (1Voucher, FNB Voucher, Flash Pay) to prevent cash-out of voucher-deposited funds — an AML/FICA compliance control requested by Flash. The system uses a dedicated ledger sub-account (`2100-01-02 Client Float Liability — Restricted`) and a wallet-level `restricted_balance` column. Cash-out channels (eeziCash PIN, EasyPay cash-out) are blocked; all other spend channels (VAS, QR, P2P, PayShap, bills, etc.) release restricted funds on use (FIFO). Also fixed a missing main deposit journal entry in the Flash voucher redemption flow and wrapped it in an atomic Sequelize transaction.

---

## Tasks Completed

1. **Migration** — `20260409_01_add_restricted_balance_and_voucher_deposit_account.js`
   - Added `restricted_balance DECIMAL(15,2)` to `wallets` table (NULL-allowed = instant, no table rewrite)
   - Seeded ledger account `2100-01-02` (Client Float — Restricted)

2. **Wallet Model** — `models/Wallet.js`
   - Added `restrictedBalance` field definition
   - Added `canCashOut(amount)` — checks `balance - restrictedBalance >= amount`
   - Added `spendRestricted(amount)` — FIFO decrement of restricted balance

3. **Restricted Funds Service** — `services/restrictedFundsService.js` (NEW)
   - `postVoucherDepositAndRestriction()` — posts deposit JE + restriction tracking JE
   - `releaseRestrictedFunds()` — decrements wallet restricted_balance + posts release JE

4. **Flash Voucher Deposit Fix** — `controllers/flashController.js`
   - Wrapped `redeemVoucherTopup` in Sequelize transaction for atomicity
   - Added missing main deposit JE (DR `1200-10-04` / CR `2100-01-01`)
   - Added restriction JE (DR `2100-01-01` / CR `2100-01-02`)
   - Tags Transaction metadata with `isRestricted: true`, `restrictionSource: 'flash_voucher'`

5. **Cash-Out Enforcement (3 BLOCKED channels)**
   - `controllers/flashController.js` → `purchaseCashOutPin()` — `canCashOut()` replaces balance check
   - `services/ussdMenuService.js` → `purchaseEeziVoucher()` — `canCashOut()` replaces `canDebit()`
   - `services/ussdMenuService.js` → `checkBalanceAndLimits()` — `isCashOut` param for USSD pre-check
   - `controllers/voucherController.js` → `issueEasyPayCashout()` — `canCashOut()` replaces balance check

6. **Restriction Release (ALL allowed spend paths)**
   - `routes/overlayServices.js` — airtime/data, electricity, bill payments
   - `services/productPurchaseService.js` — voucher purchases
   - `controllers/qrPaymentController.js` — QR payments
   - `controllers/walletController.js` — P2P send
   - `services/standardbankRppService.js` — PayShap RPP
   - `controllers/requestController.js` — payment request approval
   - `services/ussdMenuService.js` — eeziAirtime/Power, voucher purchase, P2P send
   - `controllers/voucherController.js` — EasyPay standalone voucher

7. **Reconciliation Checks**
   - `services/scheduledReconService.js` — `_checkRestrictedBalance()` method + updated solvency equation
   - `scripts/production-full-audit.js` — restricted balance integrity check (section 3d)

8. **Documentation**
   - `docs/CHART_OF_ACCOUNTS.md` — account `2100-01-02`, JE template 3.16, solvency update, env var, reserved ranges
   - `docs/CHANGELOG.md` — v2.93.0 entry
   - `.cursor/rules/tech-debt.mdc` — architectural decision + fixed deposit JE entry
   - `docs/FLASH_VOUCHER_RINGFENCING_UNDERTAKING.md` — formal undertaking letter to Flash

---

## Key Decisions

| Decision | Rationale |
|---|---|
| Dual-layer (ledger + wallet column) | Ledger provides audit truth; column provides O(1) runtime enforcement |
| `2100-01-02` as sub-liability | Mojaloop NDC pattern — restricted position tracked as separate liability class |
| FIFO release on allowed spend | Simplest model; no per-transaction tracking needed |
| Release JE errors non-fatal (try/catch) | Main spend flow must not break if ledger posting fails |
| Missing deposit JE fixed | Was only posting commission JE; now posts full deposit + restriction |
| Atomic Sequelize transaction | Wallet credit + VasTransaction + Transaction all in one commit-or-rollback |
| `isCashOut` param on `checkBalanceAndLimits` | Avoids false-blocking on USSD allowed spends (P2P, VAS, etc.) |

---

## Files Modified

| File | Change |
|---|---|
| `migrations/20260409_01_...js` | NEW — migration |
| `services/restrictedFundsService.js` | NEW — centralized ringfencing logic |
| `models/Wallet.js` | `restrictedBalance`, `canCashOut()`, `spendRestricted()` |
| `controllers/flashController.js` | Atomic deposit, restriction JE, cash-out enforcement |
| `controllers/voucherController.js` | Cash-out enforcement + release on standalone voucher |
| `controllers/walletController.js` | Release on P2P send |
| `controllers/qrPaymentController.js` | Release on QR payment |
| `controllers/requestController.js` | Release on payment request |
| `services/ussdMenuService.js` | Cash-out enforcement + release on allowed USSD flows |
| `services/standardbankRppService.js` | Release on PayShap RPP |
| `services/productPurchaseService.js` | Release on voucher purchases |
| `services/scheduledReconService.js` | Restricted balance recon check |
| `routes/overlayServices.js` | Release on VAS airtime/data/electricity/bills |
| `scripts/production-full-audit.js` | Restricted balance integrity check |
| `docs/CHART_OF_ACCOUNTS.md` | Account, templates, solvency, env var |
| `docs/CHANGELOG.md` | v2.93.0 entry |
| `docs/FLASH_VOUCHER_RINGFENCING_UNDERTAKING.md` | NEW — undertaking letter |
| `.cursor/rules/tech-debt.mdc` | Architectural decisions |

---

## Issues Encountered

- Flash voucher deposit flow was missing the main deposit journal entry (only posted commission). Fixed as part of this work.
- The deposit flow was not atomic (no Sequelize transaction). Fixed.

---

## Next Steps

1. **Run migration on UAT**: `./scripts/run-migrations-master.sh uat`
2. **Test in Codespaces**: Redeem a Flash voucher and verify:
   - `restricted_balance` is set on the wallet
   - Attempting eeziCash/EasyPay cash-out with only restricted funds fails
   - Buying airtime/electricity/etc. succeeds and decrements `restricted_balance`
3. **Run recon audit**: `node scripts/production-full-audit.js --uat` to verify restricted balance integrity
4. **Run migration on staging then production** after UAT smoke tests pass
5. **Send undertaking letter to Flash** (review `docs/FLASH_VOUCHER_RINGFENCING_UNDERTAKING.md`)
6. **Future consideration**: Add portal admin screen for viewing restricted balance per user

---

## Context for Next Agent

- The ringfencing is complete in code. Migration has NOT been run yet — Andre needs to run it in Codespaces.
- `restrictedFundsService.js` is the single source of truth for restriction/release logic.
- `wallet.canCashOut()` must be used at all cash-out points (not `canDebit()`).
- H2H EFT, RTC/TCIB, and MoolahMove (future bank transfer rails) are ALLOWED spend — when those flows are wired, they should call `releaseRestrictedFunds()` like other allowed paths.
- The Flash undertaking document is ready for Andre to review and send.
