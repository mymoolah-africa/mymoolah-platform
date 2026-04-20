# MyMoolah — Formal Undertaking to Flash

## Ringfencing of Flash Voucher Deposits (1Voucher, FNB Voucher, Flash Pay)

**Classification:** Confidential — Partner Communication
**Date:** April 2026
**From:** MyMoolah Treasury Platform (Pty) Ltd
**To:** Flash Mobile Vending (Pty) Ltd

---

**Subject: UNDERTAKING — RESTRICTION OF CASH-OUT ON FLASH VOUCHER DEPOSIT FUNDS**

Dear Flash Team,

Further to our commercial agreement for 1Voucher Redemption, FNB Voucher Redemption, and Flash Pay acceptance services (4.00% acceptance fee exclusive of VAT, daily net settlement), MyMoolah Treasury Platform (Pty) Ltd ("MMTP") hereby provides this formal undertaking regarding the controls we have implemented to prevent the cash-out of funds deposited via any Flash voucher cash-in mechanism.

---

## 1. Commitment

MMTP undertakes that all funds credited to user wallets via Flash voucher redemption (1Voucher, FNB Voucher, and Flash Pay, including any future Flash cash-in voucher types) shall be **ringfenced and restricted from any cash-out transaction**. These funds may only be used for the purchase of goods and services, including but not limited to:

- Prepaid airtime and data bundles
- Prepaid electricity tokens
- Bill payments
- QR code payments at merchants
- Peer-to-peer wallet transfers
- Bank transfers (PayShap RPP, H2H EFT, future RTC/TCIB rails)
- Cross-border remittances (MoolahMove)
- EasyPay standalone vouchers (redeemable for goods/services only)
- Digital voucher purchases (non-cash-equivalent)

These funds shall **not** be permitted for:

- eeziCash PIN purchases (cash withdrawal at retail points)
- EasyPay cash-out vouchers (cash withdrawal at EasyPay retailers)
- Any other mechanism that converts the digital value back to physical cash

---

## 2. Technical Implementation — Dual-Layer Ringfencing Architecture

MMTP employs a banking-grade, Mojaloop-compliant double-entry ledger system. The ringfencing of Flash voucher deposits is enforced at two independent layers:

### Layer 1 — Ledger Sub-Account (Accounting Control)

All Flash voucher deposits are posted to a dedicated sub-liability account in our Chart of Accounts:

| Account Code | Account Name | Type | Normal Side |
|---|---|---|---|
| `2100-01-02` | Client Float Liability — Restricted (Voucher Deposits) | Liability | Credit |

This account is a sub-ledger of our main Client Float Liability (`2100-01-01`) and tracks the aggregate restricted balance across all users. Every Flash voucher deposit generates three immutable, idempotent, balanced double-entry journal entries:

**JE1 — Gross Deposit (face value):**

```
Reference: VTOP-DEP-{unique-reference}

DEBIT   1200-10-04  Flash Float Account                    R{face_value}
CREDIT  2100-01-01  Client Float Liability                 R{face_value}
```

**JE2 — Fee Deduction (Flash's 4% excl VAT + 15% VAT = 4.6%):**

```
Reference: VTOP-FEE-{unique-reference}

DEBIT   2100-01-01  Client Float Liability                 R{fee}
CREDIT  1200-10-04  Flash Float Account                    R{fee}
```

Net ledger effect on Flash Float: DR face_value − CR fee = DR net_deposit (what Flash settles to MMTP).

**JE3 — Restriction Tracking (posted atomically with deposit):**

```
Reference: VTOP-RESTRICT-{unique-reference}

DEBIT   2100-01-01  Client Float Liability                 R{net_deposit}
CREDIT  2100-01-02  Client Float — Restricted (Voucher)    R{net_deposit}
```

When the user spends restricted funds on permitted services, a release journal entry is posted:

```
Reference: RESTRICT-RELEASE-{transaction-id}

DEBIT   2100-01-02  Client Float — Restricted              R{release_amount}
CREDIT  2100-01-01  Client Float Liability                 R{release_amount}
```

Where `release_amount = min(user_restricted_balance, spend_amount)`, following FIFO (First In, First Out) principles.

### Layer 2 — Wallet-Level Enforcement (Runtime Control)

Each user wallet maintains a `restricted_balance` field alongside the main `balance`. The enforcement logic at every cash-out endpoint is:

```javascript
Wallet.prototype.canCashOut = function(amount) {
  const unrestricted = parseFloat(this.balance) - parseFloat(this.restrictedBalance || 0);
  if (unrestricted < parseFloat(amount)) {
    return {
      allowed: false,
      reason: 'Insufficient unrestricted balance. Voucher deposit funds cannot be used for cash-out.'
    };
  }
  return this.canDebit(amount);
};
```

This check is enforced at every cash-out endpoint:
- eeziCash PIN purchase (app and USSD)
- EasyPay cash-out voucher issuance

If a user with R500 total balance (R200 from Flash voucher deposits, R300 from bank deposits) attempts to cash out R400, the system rejects the transaction because only R300 is available for cash-out.

### Layer 3 — Automated Reconciliation (Integrity Verification)

Our scheduled reconciliation engine runs hourly solvency checks that verify:

```
SUM(wallets.restricted_balance) = Net credit balance of account 2100-01-02
```

Any variance exceeding R0.01 triggers an immediate alert. The solvency equation has been updated to:

```
Client Float Liability (2100-01-01 + 2100-01-02 net balance)
  <= Bank Account (1100-01-01 net balance) + Supplier Floats (1200-10-XX net balances)
```

---

## 3. Anti-Money Laundering (AML) Compliance

This ringfencing mechanism is designed to comply with the **Financial Intelligence Centre Act (FICA), Act 38 of 2001**, by ensuring that anonymous cash-equivalent value (vouchers purchased with cash at retail points) cannot be converted back to cash through the MMTP platform. This is a standard AML control aligned with:

- **SARB** guidance on e-money and mobile money platforms
- **Mojaloop FSPIOP** prudential standards for digital financial service providers
- **ISO 20022** transaction traceability requirements
- **POPIA** data protection (no personal data is exposed in restriction logic)

---

## 4. Audit Trail and Reporting

All Flash voucher deposits, restriction releases, and blocked cash-out attempts are:

- **Recorded as immutable journal entries** in our double-entry ledger (SHA-256 hash-chained for tamper detection)
- **Tagged with source voucher type** (`1voucher`, `fnb`, `flashpay`) in transaction metadata
- **Available for reconciliation** and audit reporting upon request
- **Retained** in accordance with FICA record-keeping requirements (minimum 5 years)

MMTP can provide Flash with periodic reports on:

| Report | Contents |
|---|---|
| Voucher Deposit Summary | Total deposits processed by type, period, and aggregate restricted balance |
| Blocked Cash-Out Attempts | Count, amounts, and user tier breakdown of rejected cash-out transactions |
| Restriction Release Activity | Goods/services spend breakdown showing how restricted funds were consumed |
| Reconciliation Status | Ledger vs wallet restricted balance integrity check results |

---

## 5. Future Flash Cash-In Products

This undertaking extends to **any future Flash cash-in voucher or payment acceptance product**. Any new Flash deposit mechanism integrated into MMTP will automatically inherit the same dual-layer ringfencing controls.

### 5A. Alignment with POL-020 (20 April 2026)

On 20 April 2026, MyMoolah adopted **POL-020 — Cash Withdrawal & Ring-Fencing of Own Funds**, which extends the same underlying mechanism (single-pool `wallets.restricted_balance`, wallet-level `canCashOut` guard, sub-liability account `2100-01-02`, and FIFO release on permitted non-cash spend) to cover **all own-money deposits** into MyMoolah wallets — not only Flash voucher cash-in. The effect is that the cash-withdrawal ban described in this undertaking remains absolute for Flash voucher deposits, and now sits inside a broader regulatory posture under which only **third-party credits** (salaries, disbursements, loans, P2P transfers) fund cash withdrawals through **any Cash-Withdrawal Partner** — eeziCash (Flash), EasyPay retail cash-withdrawal, Cliquefin / OTT cash-withdrawal vouchers, USSD cash-withdrawal, or any future equivalent. Policy reference: `docs/policies/20-Cash-Withdrawal-Policy.md`. Engineering reference: `docs/OWN_FUNDS_RINGFENCE_IMPLEMENTATION_PLAN.md`. No change to Flash voucher handling or settlement is implied by this alignment.

The system is architecturally designed for extensibility:
- The `restrictedFundsService.js` module handles all restriction logic centrally
- New payment rails (H2H EFT, RTC/TCIB) automatically receive the restriction-release treatment (allowed spend)
- New cash-out mechanisms must be explicitly added to the blocked list

---

## 6. Technical Contact

For any questions or requests for further technical detail regarding this implementation:

- **Technical Lead:** [Name]
- **Email:** [email]
- **Platform:** api-mm.mymoolah.africa (production)

---

We trust this provides sufficient assurance of our commitment to responsible financial services and AML compliance. We welcome any questions, audit requests, or suggestions for additional controls.

Yours faithfully,

**[Signatory Name]**
Director / Chief Technology Officer
MyMoolah Treasury Platform (Pty) Ltd

---

*This document is version-controlled and maintained alongside the MMTP codebase. Any changes to the ringfencing architecture are tracked in the project changelog and Chart of Accounts.*
