# MyMoolah Treasury Platform — Chart of Accounts

**Last Updated**: 2026-04-04
**Document Version**: 1.0.0
**Classification**: Internal — Banking-Grade Financial Architecture
**Owner**: MyMoolah Treasury / Finance

> Single authoritative reference for all ledger accounts, journal patterns,
> settlement mapping, solvency rules, and product-registration procedures.
> All new financial products MUST register accounts here before code is written.

---

## Table of Contents

1. [Purpose & Ownership](#1-purpose--ownership)
2. [Chart of Accounts](#2-chart-of-accounts)
3. [Journal Entry Templates](#3-journal-entry-templates)
4. [Mojaloop Settlement Mapping](#4-mojaloop-settlement-mapping)
5. [Solvency Rules & Balance Equations](#5-solvency-rules--balance-equations)
6. [Product Registration Checklist](#6-product-registration-checklist)
7. [Reserved Account Ranges](#7-reserved-account-ranges)
8. [Environment Variable Map](#8-environment-variable-map)
9. [Future Product Verticals](#9-future-product-verticals)
10. [Cross-References & Related Documents](#10-cross-references--related-documents)

---

## 1. Purpose & Ownership

This document is the **canonical Chart of Accounts (CoA)** for the MyMoolah
Treasury Platform (MMTP). Every ledger account that exists — or is planned —
MUST be listed here with its code, name, type, normal side, migration status,
and the services that post to it.

**Rules:**

- No account code may be used in application code unless it appears in this
  document and has a corresponding row in the `ledger_accounts` table (via
  migration).
- Accounts marked **NEEDS MIGRATION** are referenced in code with env-var
  fallback defaults. They function in environments where the env var is set
  or where the account was manually created, but they lack an idempotent
  migration and MUST be migrated before production hardening.
- Account codes follow the pattern `XXXX-YY-ZZ` where:
  - `XXXX` = major category (aligned to standard accounting: 1=Asset, 2=Liability, 3=Equity, 4=Revenue, 5=Expense, 9=Clearing/Suspense)
  - `YY` = sub-category (e.g., 10=supplier floats, 01=general)
  - `ZZ` = sequence within sub-category
- The `LedgerAccount` Sequelize model uses column name `code` (not `account_code`).

---

## 2. Chart of Accounts

### 2.1 Assets (1xxx-xx-xx)

Assets represent resources controlled by MMTP — bank balances, float holdings,
and receivables. Normal side: **debit** (increases on debit, decreases on credit).

| Code | Name | Normal | Migration | Used By | Notes |
|------|------|--------|-----------|---------|-------|
| `1100-01-01` | Standard Bank Current Account | debit | `20260207120003`, `20260224_03` | walletController, rtpService, rppService, overlayServices, backfill scripts | Primary operating bank account; all external fund movements clear through here |
| `1100-02-01` | SBSA Statement Reconciliation Account | debit | **NEEDS MIGRATION** | `sbsaStatementService.js` (`SBSA_MAIN_ACCOUNT_CODE`) | MT940/MT942 statement balance tracking; env var `SBSA_MAIN_ACCOUNT_CODE` defaults to this code |
| `1200-01-01` | Client Float — General | debit | `20260224_03` | — | General-purpose client float pool (not currently posted to; reserved) |
| `1200-05-01` | Interchange Receivable | debit | `20260224_03` | — | PayShap interchange (reserved for future use) |
| `1200-10-01` | Zapper Float Account | debit | `20260224_03` | `qrPaymentController.js` | Zapper QR payment float |
| `1200-10-02` | EasyPay Top-up Float Account | debit | `20260224_03`, `20260116_check...` | `voucherController.js` | EasyPay cash-in / deposit voucher float |
| `1200-10-03` | EasyPay Cash-out Float Account | debit | `20260224_03`, `20260116_add...` | `voucherController.js` | EasyPay cash-out (eeziPay) float |
| `1200-10-04` | Flash Float Account | debit | `20260224_03` | `flashController.js` | Flash VAS (airtime, data, electricity, vouchers, eeziCash) |
| `1200-10-05` | MobileMart Float Account | debit | `20260224_03`, `20260115_create...` | `overlayServices.js`, `productPurchaseService.js` | MobileMart VAS (airtime, data, electricity, billers) |
| `1200-10-06` | DT Mercury / VALR Float Account | debit | `20260224_03`, `20260207120001` | `usdcTransactionService.js`, `internationalPaymentService.js` | USDC/ZAR trades via VALR (FSCA FSP 53308) |
| `1200-10-07` | PayShap Outbound Float | debit | `20260224_03` | `standardbankRppService.js` | PayShap RPP outbound; **do NOT use for Yellow Card** (see Section 9.1) |
| `1200-10-10` | NFC Deposit Float Account | debit | `20260224_03`, `20260210_03` | `nfcDepositService.js` | NFC acquiring float (Halo Dot Phase 1) |

### 2.2 Liabilities (2xxx-xx-xx)

Liabilities represent obligations MMTP owes — user wallet balances, payables,
clearing accounts, and funds held on behalf of others. Normal side: **credit**
(increases on credit, decreases on debit).

| Code | Name | Normal | Migration | Used By | Notes |
|------|------|--------|-----------|---------|-------|
| `2100-01-01` | Client Float Liability | credit | `20260224_03` | walletController, requestController, voucherController, overlayServices, flashController, rtpService, rppService, referralPayoutService, productPurchaseService, backfill scripts | **Core account** — aggregate of all user wallet balances; must equal `Σ wallets.balance` |
| `2100-02-01` | Client Clearing Account | credit | `20260224_03` | — | Settlement clearing between client and MMTP (reserved) |
| `2100-05-01` | Merchant Ad Float | credit | `20260224_03` | `adService.js` | Watch-to-Earn merchant prefunded float; **note**: `adService.js` also references `2100-05-001` (extra digit) — known cosmetic bug, should be `2100-05-01` |
| `2200-01-01` | MM Commission Clearing | credit | `20260224_03` | `commissionVatService.js`, `qrPaymentController.js` | Commission holding before recognition |
| `2200-02-01` | Supplier Clearing Account | credit | `20260224_03` | — | Supplier settlement netting (reserved) |
| `2200-03-01` | Referral Commission Payable | credit | **NEEDS MIGRATION** | `referralPayoutService.js`, `backfill-missing-journal-entries.js` | Accrued referral commissions awaiting payout; env var `LEDGER_ACCOUNT_REFERRAL_PAYABLE` defaults to this code |
| `2300-10-01` | VAT Control Account | credit | `20260224_03` | `commissionVatService.js`, `standardbankRtpService.js`, `standardbankRppService.js` | Output VAT payable to SARS (15%); canonical VAT account for all flows |
| `2400-01-01` | A Botes Loan Account | credit | `20260404_01` | `backfill-journal-entries-v2.js`, `production-full-audit.js` | Director loan capital injection; DR Bank / CR this account on injection |
| `2500-01-01` | Voucher Clearing | credit | `20260404_01` | `voucherController.js`, `backfill-journal-entries-v2.js`, `production-full-audit.js` | Internal MM voucher liability; balance = unredeemed voucher value; zero when all redeemed |
| `2600-01-01` | Unallocated Deposits / Suspense | credit | **NEEDS MIGRATION** | `standardbankDepositNotificationService.js` | Deposits that cannot be matched to a user wallet; env var `LEDGER_ACCOUNT_UNALLOCATED` defaults to this code; must be manually resolved within 24h |

### 2.3 Equity (3xxx-xx-xx)

No equity accounts are currently seeded. Reserved range `3000-xx-xx` to `3999-xx-xx`.
Future use: retained earnings, owner's equity, capital accounts.

### 2.4 Revenue (4xxx-xx-xx)

Revenue accounts track income earned by MMTP. Normal side: **credit**
(increases on credit, decreases on debit for reversals).

| Code | Name | Normal | Migration | Used By | Notes |
|------|------|--------|-----------|---------|-------|
| `4000-10-01` | Commission Revenue | credit | `20260224_03` | `commissionVatService.js`, `qrPaymentController.js`, `production-full-audit.js` | VAS commission income (airtime, data, electricity, billers, vouchers) |
| `4000-20-01` | Transaction Fee Revenue | credit | `20260224_03` | `standardbankRppService.js` | PayShap / RTP transaction fee markup |
| `4100-01-06` | USDC Fee Revenue | credit | `20260224_03`, `20260207120002` | `usdcTransactionService.js` | 7.5% USDC send transaction fee (VAT inclusive) |
| `4100-05-01` | Ad Revenue | credit | `20260224_03` | `adService.js` | Watch-to-Earn ad view revenue (merchant pays per view) |

### 2.5 Expenses (5xxx-xx-xx)

Expense accounts track costs incurred. Normal side: **debit**
(increases on debit, decreases on credit for reversals).

| Code | Name | Normal | Migration | Used By | Notes |
|------|------|--------|-----------|---------|-------|
| `5000-10-01` | Cost of Sales: PayShap SBSA Fee | debit | `20260224_03`, `20260224_02` | `standardbankRtpService.js`, `standardbankRppService.js` | SBSA fee per PayShap RPP/RTP transaction (R5.00 ex-VAT per txn) |
| `5100-02-01` | Referral Expense | debit | **NEEDS MIGRATION** | `production-full-audit.js` | Referral commission expense; currently referenced only in audit reconciliation — accrual posting path TBD |
| `5100-03-01` | Ad Reward Expense | debit | `20260224_03` | `adService.js` | Watch-to-Earn user reward payout (R2–R3 per view) |

### 2.6 Clearing / Suspense (9xxx-xx-xx)

Temporary holding accounts that must net to zero over their lifecycle.

| Code | Name | Type | Normal | Migration | Used By | Notes |
|------|------|------|--------|-----------|---------|-------|
| `9999-00-01` | USDC Fee Clearing / Suspense | liability | credit | `20260224_03` | `usdcTransactionService.js` | Stages USDC fee before recognition |
| `9999-00-02` | USDC Fee Recognition | asset | debit | `20260209120001` | — | Fee recognition clearing |

---

## 3. Journal Entry Templates

All journal entries are posted via `ledgerService.postJournalEntry()` which
enforces: Σ debits = Σ credits, atomic transaction, unique `reference` for
idempotency, and `DECIMAL(18,2)` precision.

### 3.1 EasyPay Deposit (Cash-In)

User pays cash at EasyPay retailer; MMTP receives notification and credits wallet.

```
Reference: DEP-{transactionId}

DR  1100-01-01  Standard Bank Current Account    R100.00
CR  2100-01-01  Client Float Liability            R100.00
```

### 3.2 PayShap RTP Inbound (Request-to-Pay — Paid Callback)

User requests money via RTP; payer's bank pays MMTP via PayShap.
SBSA charges R5.75 (R5.00 + R0.75 VAT) per transaction — full pass-through to user.

```
Reference: SBSA-RTP-{rtpId}

DR  1100-01-01  Standard Bank Current Account    R10.00    (gross inflow)
CR  2100-01-01  Client Float Liability            R4.25    (net to wallet)
CR  5000-10-01  Cost of Sales: PayShap SBSA Fee   R5.00    (SBSA fee ex-VAT)
CR  2300-10-01  VAT Control Account               R0.75    (VAT on SBSA fee)
```

### 3.3 PayShap RPP Outbound (Regular Payment Push)

User sends money to external bank account via PayShap.
MMTP charges user: principal + SBSA fee + MM markup + VAT.

```
Reference: SBSA-RPP-{transferId}

DR  2100-01-01  Client Float Liability           R{total}  (full user charge)
CR  1100-01-01  Standard Bank Current Account    R{principal}  (outflow to beneficiary)
CR  5000-10-01  Cost of Sales: PayShap SBSA Fee  R{sbsaFee}    (SBSA fee ex-VAT)
CR  4000-20-01  Transaction Fee Revenue          R{mmMarkup}   (MM markup ex-VAT)
CR  2300-10-01  VAT Control Account              R{netVat}     (VAT on combined fees)
```

### 3.4 VAS Purchase (Airtime / Data / Electricity / Bills)

User buys VAS product; supplier float is debited, commission is earned.

```
Reference: VAS-{transactionId}

Face-value journal:
DR  2100-01-01  Client Float Liability           R{faceValue}
CR  1200-10-XX  Supplier Float Account           R{faceValue}

Commission journal (if applicable):
DR  2200-01-01  MM Commission Clearing           R{commExVat}
CR  4000-10-01  Commission Revenue               R{commExVat}
CR  2300-10-01  VAT Control Account              R{commVat}
```

### 3.5 P2P Transfer (Wallet-to-Wallet)

User sends money to another MyMoolah user. Net-zero on the same liability
account (2100-01-01) — posted for audit trail completeness.

```
Reference: P2P-{senderTransactionId}

DR  2100-01-01  Client Float Liability           R{amount}  (sender debit)
CR  2100-01-01  Client Float Liability           R{amount}  (receiver credit)
```

### 3.6 Voucher Issue

User purchases an internal MyMoolah voucher. Wallet is debited, voucher
clearing increases until redemption.

```
Reference: VOUCHER-ISSUE-{transactionId}

DR  2100-01-01  Client Float Liability           R{amount}
CR  2500-01-01  Voucher Clearing                 R{amount}
```

### 3.7 Voucher Redeem

Recipient redeems a voucher. Voucher clearing is released, wallet is credited.

```
Reference: VOUCHER-REDEEM-{transactionId}

DR  2500-01-01  Voucher Clearing                 R{amount}
CR  2100-01-01  Client Float Liability           R{amount}
```

### 3.8 Director Loan Capital Injection

Director injects capital into MMTP via bank transfer.

```
Reference: DIRECTOR-LOAN-{date}

DR  1100-01-01  Standard Bank Current Account    R{amount}
CR  2400-01-01  A Botes Loan Account             R{amount}
```

### 3.9 Wallet Allocation from Loan

Portion of director loan allocated to user wallet for operational use.

```
Reference: LOAN-ALLOC-{date}

DR  2400-01-01  A Botes Loan Account             R{amount}
CR  2100-01-01  Client Float Liability           R{amount}
```

### 3.10 Referral Payout

Accrued referral commission is paid out to user wallet.

```
Reference: REFERRAL-PAYOUT-{transactionId}

DR  2200-03-01  Referral Commission Payable      R{amount}
CR  2100-01-01  Client Float Liability           R{amount}
```

### 3.11 USDC Send (Buy USDC via VALR)

User buys USDC for cross-border value transfer.

```
Reference: USDC-{transactionId}

DR  2100-01-01  Client Float Liability           R{total}    (ZAR debit)
CR  1200-10-06  DT Mercury / VALR Float          R{faceValue}  (ZAR to VALR)
CR  4100-01-06  USDC Fee Revenue                 R{feeExVat}
CR  9999-00-01  USDC Fee Clearing / Suspense     R{feeVat}
```

### 3.12 Watch-to-Earn (Ad View Reward)

Merchant float is debited; user receives reward; MMTP earns margin.

```
Reference: AD-VIEW-{viewId}

DR  2100-05-01  Merchant Ad Float                R{costPerView}
CR  2100-01-01  Client Float Liability           R{userReward}    (user payout)
CR  4100-05-01  Ad Revenue                       R{mmMargin}      (MMTP margin)
```

### 3.13 Supplier Float Top-Up

MMTP tops up a supplier float via bank transfer (e.g., MobileMart R2,500 prepayment).

```
Reference: FLOAT-TOPUP-{supplier}-{date}

DR  1200-10-XX  Supplier Float Account           R{amount}
CR  1100-01-01  Standard Bank Current Account    R{amount}
```

### 3.14 Unallocated Deposit (Suspense)

Bank deposit received but reference cannot be matched to a user.

```
Reference: SBSA-UNALLOC-{transactionId}

DR  1100-01-01  Standard Bank Current Account    R{amount}
CR  2600-01-01  Unallocated Deposits / Suspense  R{amount}
```

Resolution (when user is identified):

```
Reference: SBSA-RESOLVE-{transactionId}

DR  2600-01-01  Unallocated Deposits / Suspense  R{amount}
CR  2100-01-01  Client Float Liability           R{amount}
```

### 3.15 NFC Deposit (Halo Dot)

User taps card to deposit via NFC acquiring.

```
Reference: NFC-{transactionId}

DR  1200-10-10  NFC Deposit Float Account        R{amount}
CR  2100-01-01  Client Float Liability           R{amount}
```

---

## 4. Mojaloop Settlement Mapping

MMTP operates as a Mojaloop-compliant DFSP (Digital Financial Service Provider).
The following maps MMTP's internal CoA to Mojaloop settlement concepts.

| Mojaloop Concept | MMTP Account(s) | Description |
|------------------|-----------------|-------------|
| DFSP Position Account | `2100-01-01` Client Float Liability | Net position of all user obligations |
| DFSP Settlement Account | `1100-01-01` Standard Bank Current | Actual bank funds backing positions |
| Hub Reconciliation | `2200-02-01` Supplier Clearing | Inter-participant clearing |
| Participant NDC (Net Debit Cap) | Wallet balance check | No overdrafts — enforced at `Wallet.debit()` with `SELECT FOR UPDATE` |
| Settlement Window | Recon runs (`recon_runs` table) | Daily T+1 reconciliation per supplier |
| Transfer State Machine | `MyMoolahTransaction.status` | `pending → completed / failed / reversed` |
| Payee FSP Float | `1200-10-XX` Supplier Float | Pre-funded balances with each VAS supplier |
| Payer FSP Float | `2100-01-01` Client Float | User wallet balance = payer's available position |
| Settlement Transfer | JournalEntry + JournalLine | Immutable double-entry record per transfer |
| Lookup/Discovery | PayShap proxy resolution | MSISDN → bank account via SBSA proxy |
| Bulk Settlement | MT940/MT942 statement recon | Daily bank statement reconciliation |

### Mojaloop FSPIOP Compliance

| Requirement | MMTP Implementation |
|-------------|---------------------|
| Deterministic transfer outcome | Every `MyMoolahTransaction` reaches terminal state (`completed` or `failed`) |
| End-to-end traceability | `transactionId` (UUID) flows through journal `reference`, transaction record, and supplier API |
| Idempotency | Journal `reference` uniqueness constraint; `ON CONFLICT DO NOTHING` on account creation |
| Position tracking | Real-time via `Wallet.balance` (individual) and `SUM(wallets.balance)` (aggregate) |
| Net settlement | Daily recon runs compute net positions per supplier (`scheduledReconService.js`) |
| ISO 20022 messaging | PayShap Pain.001/Pain.013 for RPP/RTP; MT940/MT942 for statement reconciliation |

---

## 5. Solvency Rules & Balance Equations

These equations are enforced by `production-full-audit.js` and
`scheduledReconService._checkSolvency()`. Violation of any CRITICAL rule
triggers an alert and halts financial operations.

### 5.1 Fundamental Accounting Equation

```
Assets = Liabilities + Equity + (Revenue − Expenses)
```

Verified via trial balance: `Σ all debit-normal balances = Σ all credit-normal balances`.
Tolerance: **R0.01**. Variance above this is a **CRITICAL FAIL**.

### 5.2 Client Fund Safeguarding (CRITICAL)

```
Client Float Liability (2100-01-01 net balance)
  ≤  Bank (1100-01-01 net balance)
   + Σ Supplier Floats (1200-10-XX net balances)
```

Users' funds must be fully backed by bank cash plus supplier float holdings.
If violated: users' funds are not fully covered — **CRITICAL FAIL, halt deposits/withdrawals**.

This is the primary solvency check, aligned with SARB client fund protection
requirements and Mojaloop prudential standards.

### 5.3 Wallet Aggregate Integrity (CRITICAL)

```
Σ (wallets.balance WHERE balance > 0) = Net credit balance of 2100-01-01
```

Individual user wallet balances must sum to the ledger account balance.
Tolerance: **R0.01**. Verified hourly by scheduled recon.

### 5.4 Supplier Float Cover

```
For each supplier float 1200-10-XX:
  Ledger net balance ≥ supplier_floats.balance (operational balance)
```

### 5.5 Voucher Cover

```
Net credit balance of 2500-01-01 = Σ (active unredeemed voucher amounts)
```

Balance should be R0.00 when all issued vouchers are fully redeemed.

### 5.6 Trial Balance (Zero Variance)

```
Σ (debit-normal account balances) − Σ (credit-normal account balances) = 0
```

Computed across all active `ledger_accounts`. Variance > R0.01 is **CRITICAL FAIL**.

### 5.7 Journal Entry Balance

```
For every JournalEntry:
  Σ debit lines = Σ credit lines
```

Enforced at write time by `ledgerService.postJournalEntry()`.
No imbalanced entries may exist in the database.

### 5.8 No Negative Wallets

```
For all rows in wallets:
  balance ≥ 0
```

Enforced by `Wallet.debit()` with `SELECT FOR UPDATE` row-level locking.

---

## 6. Product Registration Checklist

Before writing any code for a new financial product, complete this checklist
to ensure the CoA, journal patterns, and audit infrastructure are in place.

### Pre-Development

- [ ] **Define accounts**: List all new ledger accounts needed (asset, liability, revenue, expense, clearing)
- [ ] **Assign codes**: Use the next available code in the appropriate reserved range (Section 7)
- [ ] **Add to this document**: Update Section 2 with new accounts, Section 3 with journal templates
- [ ] **Create migration**: `YYYYMMDD_NN_create_{product}_ledger_accounts.js` with `up()` and `down()`
- [ ] **Define env vars**: Add `LEDGER_ACCOUNT_*` env vars with defaults (Section 8)
- [ ] **Journal templates**: Document every DR/CR pattern the product will use
- [ ] **Solvency impact**: Determine if new accounts affect solvency equations (Section 5)

### Implementation

- [ ] **Use `ledgerService.postJournalEntry()`**: Never post journal lines directly
- [ ] **Use `accountCode` (not `account_code`)**: Match the Sequelize model column name
- [ ] **Use `{ accountCode, dc, amount, memo }` line format**: Not `{ ledgerAccountId, debit, credit }`
- [ ] **Set idempotent `reference`**: Format: `{PRODUCT}-{transactionId}` (e.g., `LENDING-DISB-12345`)
- [ ] **Handle failures**: Wrap JE posting in try/catch; log errors but do not block the primary transaction
- [ ] **Add to audit script**: Update `production-full-audit.js` with new account balance checks

### Post-Deployment

- [ ] **Run migration**: `./scripts/run-migrations-master.sh uat` → staging → production
- [ ] **Verify accounts**: Confirm accounts exist in `ledger_accounts` table
- [ ] **Test journal posting**: Verify DR = CR for sample transactions
- [ ] **Update scheduled recon**: Add float/balance checks to `scheduledReconService.js`
- [ ] **Run full audit**: `node scripts/production-full-audit.js --{env}` — all checks must PASS

---

## 7. Reserved Account Ranges

Ranges are pre-allocated to prevent code conflicts when multiple products are
developed in parallel. Claim the next available code within your range.

| Range | Category | Allocation | Status |
|-------|----------|------------|--------|
| `1100-01-xx` | Bank Accounts | Standard Bank, reconciliation | **LIVE** (01 current, 02 statement recon) |
| `1100-02-xx` | Bank Accounts — Partner Rails | TCIB corridor clearing, future banks | Reserved |
| `1200-01-xx` | Client Float — General | General-purpose | **LIVE** (01 general) |
| `1200-05-xx` | Receivables | Interchange, merchant receivables | **LIVE** (01 interchange) |
| `1200-10-01..10` | Supplier / Partner Floats | VAS, payment, NFC floats | **LIVE** (01–07, 10 allocated) |
| `1200-10-11..20` | Supplier Floats — Expansion | Future VAS/payment suppliers | Reserved |
| `1200-20-xx` | TCIB Corridor Floats | Per-corridor settlement floats | Reserved (Section 9.8) |
| `1300-xx-xx` | Lending Receivables | Loan book, interest receivable | Reserved (Section 9.3) |
| `1400-xx-xx` | Insurance Assets | Premium receivables, claims recoverable | Reserved (Section 9.4) |
| `1500-xx-xx` | Investment Assets | MMF holdings, savings instruments | Reserved (Section 9.9) |
| `2100-01-xx` | Client Float Liabilities | User wallet aggregate | **LIVE** (01 main) |
| `2100-02-xx` | Client Clearing | Settlement clearing | **LIVE** (01 clearing) |
| `2100-05-xx` | Merchant Floats | Ad, loyalty, merchant prefunding | **LIVE** (01 ad float) |
| `2200-01-xx` | Commission Clearing | Commission holding before recognition | **LIVE** (01 clearing) |
| `2200-02-xx` | Supplier Clearing | Supplier settlement | **LIVE** (01 clearing) |
| `2200-03-xx` | Payables — Commissions | Referral, affiliate payables | Code-referenced (01 referral) |
| `2300-10-xx` | Tax Control | VAT, WHT, other tax payables | **LIVE** (01 VAT control) |
| `2400-xx-xx` | Shareholder / Director Loans | Capital injections, loan tracking | **LIVE** (01 A Botes loan) |
| `2500-xx-xx` | Voucher / Coupon Clearing | Internal instrument clearing | **LIVE** (01 voucher clearing) |
| `2600-xx-xx` | Suspense / Unallocated | Deposits pending identification | Code-referenced (01 unallocated) |
| `2700-xx-xx` | Stokvel Pools | Member contributions, pool liabilities | Reserved (Section 9.5) |
| `2800-xx-xx` | Savings Goals | Ring-fenced savings, goal targets | Reserved (Section 9.7) |
| `3000-xx-xx` | Equity | Retained earnings, share capital | Reserved |
| `4000-10-xx` | Commission Revenue | VAS commission income | **LIVE** (01 revenue) |
| `4000-20-xx` | Transaction Fee Revenue | PayShap, payment fees | **LIVE** (01 fees) |
| `4100-01-xx` | Product Fee Revenue | USDC, MoolahMove, lending fees | **LIVE** (06 USDC); Reserved (07 MoolahMove) |
| `4100-05-xx` | Ad Revenue | Watch-to-Earn, sponsorships | **LIVE** (01 ad revenue) |
| `4200-xx-xx` | Lending Interest Income | Loan interest, late fees | Reserved (Section 9.3) |
| `4300-xx-xx` | Insurance Premium Income | Premium collections | Reserved (Section 9.4) |
| `4400-xx-xx` | Subscription Revenue | Monthly subscription fees | Reserved (Section 9.10) |
| `4500-xx-xx` | Stokvel Fee Revenue | Administration, transaction fees | Reserved (Section 9.5) |
| `5000-10-xx` | Cost of Sales | PayShap SBSA fees, supplier costs | **LIVE** (01 SBSA fee) |
| `5100-01-xx` | Operating Expenses — General | Office, cloud, SaaS | Reserved |
| `5100-02-xx` | Referral / Affiliate Expense | Commission expense recognition | Code-referenced (01 referral) |
| `5100-03-xx` | Reward / Loyalty Expense | Ad rewards, cashback, loyalty points | **LIVE** (01 ad reward) |
| `5200-xx-xx` | Lending Provisions | Bad debt, expected credit loss | Reserved (Section 9.3) |
| `5300-xx-xx` | Insurance Claims Expense | Claims paid, reserves | Reserved (Section 9.4) |
| `9999-xx-xx` | Clearing / Suspense | Temporary balancing accounts | **LIVE** (00-01 USDC clearing, 00-02 USDC recognition) |

---

## 8. Environment Variable Map

All ledger account codes are configurable via environment variables with
sensible defaults. This allows per-environment overrides without code changes.

| Env Var | Default | Account | Used In |
|---------|---------|---------|---------|
| `LEDGER_ACCOUNT_CLIENT_FLOAT` | `2100-01-01` | Client Float Liability | walletController, requestController, overlayServices, flashController, referralPayoutService, productPurchaseService, standardbankRtpService, standardbankRppService, standardbankDepositNotificationService |
| `LEDGER_ACCOUNT_BANK` | `1100-01-01` | Standard Bank Current Account | standardbankRtpService, standardbankRppService, standardbankDepositNotificationService |
| `LEDGER_ACCOUNT_UNALLOCATED` | `2600-01-01` | Unallocated Deposits / Suspense | standardbankDepositNotificationService |
| `LEDGER_ACCOUNT_REFERRAL_PAYABLE` | `2200-03-01` | Referral Commission Payable | referralPayoutService |
| `LEDGER_ACCOUNT_PAYSHAP_SBSA_COST` | `5000-10-01` | Cost of Sales: PayShap SBSA Fee | standardbankRtpService, standardbankRppService |
| `LEDGER_ACCOUNT_TRANSACTION_FEE_REVENUE` | *(none)* | Transaction Fee Revenue | standardbankRppService, voucherController |
| `LEDGER_ACCOUNT_VAT_CONTROL` | *(none)* | VAT Control Account | standardbankRtpService, standardbankRppService, voucherController, commissionVatService |
| `LEDGER_ACCOUNT_MM_COMMISSION_CLEARING` | *(none)* | MM Commission Clearing | commissionVatService, qrPaymentController |
| `LEDGER_ACCOUNT_COMMISSION_REVENUE` | *(none)* | Commission Revenue | commissionVatService, qrPaymentController |
| `LEDGER_ACCOUNT_NFC_FLOAT` | `1200-10-10` | NFC Deposit Float Account | nfcDepositService |
| `LEDGER_ACCOUNT_FLASH_FLOAT` | `1200-10-04` | Flash Float Account | flashController |
| `LEDGER_ACCOUNT_ZAPPER_FLOAT` | `1200-10-01` | Zapper Float Account | qrPaymentController |
| `LEDGER_ACCOUNT_EASYPAY_TOPUP_FLOAT` | `1200-10-02` | EasyPay Top-up Float | migration scripts |
| `LEDGER_ACCOUNT_EASYPAY_CASHOUT_FLOAT` | `1200-10-03` | EasyPay Cash-out Float | voucherController |
| `LEDGER_ACCOUNT_MOBILEMART_FLOAT` | `1200-10-05` | MobileMart Float | migration scripts |
| `LEDGER_ACCOUNT_USDC_FEE_CLEARING` | `9999-00-01` | USDC Fee Clearing / Suspense | usdcTransactionService |
| `SBSA_MAIN_ACCOUNT_CODE` | `1100-02-01` | SBSA Statement Reconciliation | sbsaStatementService |

**Notes:**

- Env vars with default `*(none)*` rely on the service looking up the account
  by code from `ledger_accounts` at runtime; they don't post if the account
  is missing. Setting the env var is recommended for deterministic behaviour.
- All defaults should be set in production deploy scripts to avoid silent
  fallback surprises.

---

## 9. Future Product Verticals

This section documents planned account structures for future products. Codes
are reserved in Section 7 but NOT yet created as migrations. Each vertical
follows the Product Registration Checklist (Section 6) when development begins.

### 9.1 MoolahMove (International Remittance)

**Status**: Skeleton implementation exists in `services/internationalPaymentService.js`.
VALR integration is live; Yellow Card integration awaits KYB approval and sandbox credentials.

**Architecture — Simple Pass-Through Model**:

The user accepts a ZAR → USD quote (rate locked by VALR for 30 seconds). MMTP
buys USDC via VALR, then pushes USDC to Yellow Card for disbursement. **Local
fiat payout is Yellow Card's obligation after handoff** — MMTP does not
guarantee local currency amounts.

**Canonical Accounts**:

| Code | Name | Type | Normal | Notes |
|------|------|------|--------|-------|
| `1200-10-06` | DT Mercury / VALR Float | asset | debit | **LIVE** — ZAR leg of USDC purchase |
| `4100-01-07` | MoolahMove Fee Revenue | revenue | credit | Needs migration; 5% of face value ex-VAT |
| `2300-10-01` | VAT Control Account | liability | credit | **LIVE** — use canonical VAT account (NOT `2300-01-01`) |

**Canonical Journal Template** (MoolahMove Send):

```
Reference: MOOLAHMOVE-{transactionId}

DR  2100-01-01  Client Float Liability           R{zarTotal}      (wallet debit)
CR  1200-10-06  VALR Float                       R{zarFaceValue}  (ZAR → USDC leg)
CR  4100-01-07  MoolahMove Fee Revenue           R{feeExVat}      (5% fee ex-VAT)
CR  2300-10-01  VAT Control Account              R{feeVat}        (15% VAT on fee)
```

**Known Draft Misalignments in `internationalPaymentService.js`**:

| Issue | Current Code | Canonical | Action Required |
|-------|-------------|-----------|-----------------|
| Column name mismatch | `{ account_code: '1200-10-06' }` | `{ code: '1200-10-06' }` | Fix Sequelize `where` clause to use `code` |
| Yellow Card float uses PayShap code | `1200-10-07` used as "Yellow Card float" | `1200-10-07` = PayShap Outbound Float | Do NOT use `1200-10-07` for Yellow Card; MoolahMove is pass-through — no MMTP-side YC float needed. USDC goes from VALR directly to Yellow Card's deposit address. If a short-lived clearing account is needed, allocate a new code (e.g., `1200-10-11`). |
| Wrong VAT account | `2300-01-01` for MoolahMove VAT | `2300-10-01` is canonical VAT Control | Use `2300-10-01` for all VAT; `2300-01-01` does not exist in any migration |
| Line format mismatch | `{ ledgerAccountId, debit, credit }` | `{ accountCode, dc, amount, memo }` | Refactor to use `ledgerService.postJournalEntry()` standard line format |
| Fee revenue account not migrated | `4100-01-07` referenced but not in `ledger_accounts` | — | Create migration before Phase 2 activation |

### 9.2 Lending (Micro-Loans / Buy Now Pay Later)

**Regulatory**: National Credit Act (NCA), National Credit Regulator (NCR)
registration required. Maximum interest rates per NCA schedule.

**Planned Accounts**:

| Range | Code | Name | Type | Normal |
|-------|------|------|------|--------|
| Assets | `1300-01-01` | Loan Book — Principal Outstanding | asset | debit |
| Assets | `1300-02-01` | Interest Receivable | asset | debit |
| Liabilities | `2200-04-01` | Loan Disbursement Payable | liability | credit |
| Revenue | `4200-01-01` | Interest Income — Micro-Loans | revenue | credit |
| Revenue | `4200-02-01` | Initiation Fee Revenue | revenue | credit |
| Revenue | `4200-03-01` | Service Fee Revenue (Monthly) | revenue | credit |
| Expense | `5200-01-01` | Expected Credit Loss Provision | expense | debit |
| Expense | `5200-02-01` | Bad Debt Write-Off | expense | debit |
| Clearing | `9200-01-01` | Loan Disbursement Clearing | liability | credit |

**Key Journals**: Disbursement (DR Loan Book / CR Client Float), Repayment
(DR Client Float / CR Loan Book + Interest Receivable), Provision (DR ECL
Provision / CR Loan Book), Write-off (DR Bad Debt / CR Loan Book).

### 9.3 Insurance (Funeral Cover / Device Protection)

**Regulatory**: FSCA licence, Policyholder Protection Rules, Short-Term/Long-Term
Insurance Act as applicable.

**Planned Accounts**:

| Range | Code | Name | Type | Normal |
|-------|------|------|------|--------|
| Assets | `1400-01-01` | Premium Receivable | asset | debit |
| Liabilities | `2200-05-01` | Unearned Premium Reserve | liability | credit |
| Liabilities | `2200-06-01` | Claims Payable | liability | credit |
| Revenue | `4300-01-01` | Premium Income — Funeral Cover | revenue | credit |
| Revenue | `4300-02-01` | Premium Income — Device Protection | revenue | credit |
| Expense | `5300-01-01` | Claims Expense | expense | debit |
| Expense | `5300-02-01` | Claims Handling Expense | expense | debit |

### 9.4 Stokvels (Savings Groups)

**Regulatory**: Exempt from Banks Act if total deposits < R9.99M (SARB
Exemption Notice 6 of 2023). POPIA applies to member data.

**Planned Accounts**:

| Range | Code | Name | Type | Normal |
|-------|------|------|------|--------|
| Liabilities | `2700-01-01` | Stokvel Pool — Member Contributions | liability | credit |
| Liabilities | `2700-02-01` | Stokvel Payout Payable | liability | credit |
| Revenue | `4500-01-01` | Stokvel Administration Fee | revenue | credit |
| Clearing | `9700-01-01` | Stokvel Contribution Clearing | liability | credit |

**Key Journals**: Contribution (DR Client Float 2100-01-01 / CR Pool 2700-01-01),
Payout (DR Pool 2700-01-01 / CR Client Float 2100-01-01), Admin Fee
(DR Pool 2700-01-01 / CR Stokvel Fee 4500-01-01).

### 9.5 Loyalty / Cashback

**Planned Accounts**:

| Range | Code | Name | Type | Normal |
|-------|------|------|------|--------|
| Liabilities | `2100-06-01` | Loyalty Points Liability | liability | credit |
| Revenue | `4100-06-01` | Cashback Funding Revenue (from merchants) | revenue | credit |
| Expense | `5100-03-02` | Cashback Payout Expense | expense | debit |

### 9.6 Savings Goals

**Planned Accounts**:

| Range | Code | Name | Type | Normal |
|-------|------|------|------|--------|
| Liabilities | `2800-01-01` | Savings Goal — Ring-fenced | liability | credit |

Savings goals are sub-ledger entries under `2100-01-01` (client float).
Wallet balance is not duplicated — the `2800-01-01` account tracks the
ring-fenced portion as a memo-only sub-liability.

### 9.7 Merchant Services

**Planned Accounts**:

| Range | Code | Name | Type | Normal |
|-------|------|------|------|--------|
| Liabilities | `2100-07-01` | Merchant Settlement Pool | liability | credit |
| Revenue | `4100-07-01` | Merchant Transaction Fee Revenue | revenue | credit |
| Clearing | `9100-01-01` | Merchant Settlement Clearing | liability | credit |

### 9.8 TCIB — Transactions Cleared on an Immediate Basis

**Regulatory Context**: SARB Directive 1/2025 mandates migration of all
domestic electronic payment clearing to the TCIB rail by **March 2027**.
TCIB replaces legacy EFT batch clearing with real-time ISO 20022 messaging
(pacs.008/pacs.002 for credit transfers, pacs.004 for returns).

MMTP must be TCIB-ready to maintain PayShap/RTP capabilities and comply
with the SARB payment modernisation programme.

**Architecture**: Per-corridor settlement floats to manage liquidity across
different clearing participants.

**Planned Accounts**:

| Range | Code | Name | Type | Normal |
|-------|------|------|------|--------|
| Assets | `1200-20-01` | TCIB Float — SBSA Corridor | asset | debit |
| Assets | `1200-20-02` | TCIB Float — ABSA Corridor | asset | debit |
| Assets | `1200-20-03` | TCIB Float — FNB Corridor | asset | debit |
| Assets | `1200-20-04` | TCIB Float — Nedbank Corridor | asset | debit |
| Assets | `1200-20-05` | TCIB Float — Capitec Corridor | asset | debit |
| Assets | `1200-20-10` | TCIB Float — General / Other | asset | debit |
| Revenue | `4000-20-02` | TCIB Transaction Fee Revenue | revenue | credit |
| Expense | `5000-10-02` | TCIB Settlement Cost | expense | debit |

**Key Considerations**:

- Each corridor float represents pre-funded liquidity with a specific
  clearing bank, sized based on expected daily transaction volumes.
- ISO 20022 `pacs.008` (credit transfer) maps to RPP outbound flow.
- ISO 20022 `pacs.002` (status report) maps to RTP callback processing.
- Settlement windows and net position calculations follow existing
  Mojaloop patterns (Section 4).
- TCIB readiness deadline: March 2027. MMTP's existing PayShap
  infrastructure (Pain.001/Pain.013) provides a strong foundation.

### 9.9 MMF / Investments (Money Market Fund)

**Regulatory**: FSCA licence, Collective Investment Schemes Control Act (CISCA).

**Planned Accounts**:

| Range | Code | Name | Type | Normal |
|-------|------|------|------|--------|
| Assets | `1500-01-01` | MMF Investment Holdings | asset | debit |
| Revenue | `4600-01-01` | MMF Interest Pass-Through | revenue | credit |

### 9.10 Subscriptions

**Planned Accounts**:

| Range | Code | Name | Type | Normal |
|-------|------|------|------|--------|
| Revenue | `4400-01-01` | Monthly Subscription Revenue — Premium | revenue | credit |
| Revenue | `4400-02-01` | Monthly Subscription Revenue — Business | revenue | credit |

---

## 10. Cross-References & Related Documents

| Document | Path | Relationship |
|----------|------|-------------|
| Settlement & Float Model | `docs/SETTLEMENTS.md` | Float architecture, settlement journal patterns, monitoring |
| Auditing Skill | `.agents/skills/auditing/SKILL.md` | Mojaloop CoA standards (5-digit reference codes), reconciliation engine, compliance |
| Core Account Seed Migration | `migrations/20260224_03_seed_core_ledger_accounts.js` | 24 core accounts (INSERT ON CONFLICT DO NOTHING) |
| Loan & Voucher Account Migration | `migrations/20260404_01_create_botes_loan_and_voucher_clearing_accounts.js` | 2400-01-01 (A Botes Loan), 2500-01-01 (Voucher Clearing) |
| PayShap Cost Account Migration | `migrations/20260224_02_create_payshap_sbsa_cost_ledger_account.js` | 5000-10-01 (SBSA Fee) |
| NFC Float Migration | `migrations/20260210_03_create_nfc_float_ledger_account.js` | 1200-10-10 (NFC Acquiring Float) |
| USDC Account Migrations | `migrations/20260207120001-*.js` through `20260209120001-*.js` | VALR float, USDC fee revenue, fee recognition, wallet clearing |
| Ledger Service | `services/ledgerService.js` | `postJournalEntry({ reference, description, lines })` — the ONLY way to post JEs |
| LedgerAccount Model | `models/LedgerAccount.js` | Sequelize model; column name is `code` (not `account_code`) |
| Production Audit Script | `scripts/production-full-audit.js` | Implements solvency checks, trial balance, wallet aggregate, float verification |
| Scheduled Recon Service | `services/scheduledReconService.js` | Automated solvency check via `_checkSolvency()` |
| Backfill Scripts | `scripts/backfill-journal-entries-v2.js`, `scripts/backfill-missing-journal-entries.js` | Historical JE backfill for pre-audit-era transactions |
| Commission Config | `config/supplier-commissions.json` | Externalized commission rates per supplier/product |
| Database Connection Guide | `docs/DATABASE_CONNECTION_GUIDE.md` | DB connection, migration procedures |
| Changelog | `docs/CHANGELOG.md` | Version history including account additions |
| Tech Debt Register | `.cursor/rules/tech-debt.mdc` | Tracks the 4 accounts needing migrations |
| SBSA H2H Guide | `docs/SBSA_H2H_SETUP_GUIDE.md` | MT940/MT942 statement processing, bank reconciliation |
| MoolahMove Service | `services/internationalPaymentService.js` | Draft implementation with known misalignments (Section 9.1) |

### Auditing Skill CoA Reference Mapping

The auditing skill (`.agents/skills/auditing/SKILL.md`) uses 5-digit
Mojaloop-aligned reference codes (e.g., `10100`, `20100`). These are
**reference standards** — the actual codes in `ledger_accounts` use the
`XXXX-YY-ZZ` format. Mapping:

| Skill Reference | MMTP Code | Account |
|-----------------|-----------|---------|
| 10100 (Settlement Bank) | `1100-01-01` | Standard Bank Current Account |
| 10200 (Float Holding) | `1200-01-01` | Client Float — General |
| 10500 (USDC Custody) | `1200-10-06` | DT Mercury / VALR Float |
| 10700 (EasyPay Clearing) | `1200-10-02` / `1200-10-03` | EasyPay Top-up / Cash-out |
| 20100 (User Wallets) | `2100-01-01` | Client Float Liability |
| 20200 (Merchant Float) | `2100-05-01` | Merchant Ad Float |
| 20500 (Suspense) | `2600-01-01` | Unallocated Deposits / Suspense |
| 40100–40600 (Revenue) | `4000-10-01`, `4000-20-01`, `4100-*` | Revenue accounts |
| 50100–50500 (Expenses) | `5000-10-01`, `5100-*` | Expense accounts |

---

*End of Chart of Accounts — MyMoolah Treasury Platform v1.0.0*
