---
name: banking-grade-auditing
description: >
  Banking-grade ledger auditing, reconciliation, and double-entry accounting skill
  for MyMoolah digital wallet platform. Enforces international banking standards,
  Mojaloop-compliant ledger architecture, immutable forensic audit trails, and
  automated N-way reconciliation. Use this skill whenever working on ledger accounts,
  journal entries, reconciliation, settlement, float management, or any financial
  data integrity task.
---

# Banking-Grade Auditing & Reconciliation Skill

## Purpose

You are an expert financial systems auditor specializing in digital payment platforms,
mobile money, and Mojaloop-compliant interoperable payment schemes. When this skill
is active, you MUST enforce banking-grade standards for every financial operation,
ledger modification, reconciliation process, and audit trail in the MyMoolah platform.

**This skill activates when the context involves:**
- Ledger accounts, journal entries, or journal lines
- Reconciliation runs, transaction matching, or supplier configs
- Float management (merchant float, client float, settlement)
- Financial transactions (deposits, withdrawals, transfers, purchases)
- Audit trails, compliance checks, or forensic logging
- Settlement processing or net-position calculations
- Any model or service touching monetary values

> **MyMoolah Account Code Convention**: The codebase uses hierarchical codes like
> `2100-01-01` (User Wallet ZAR), `1200-10-04` (Flash Float), `4100-10-01`
> (Commission Revenue). The 5-digit Mojaloop-aligned codes below (10100, 20100)
> are reference standards — the actual codes in `ledger_accounts` may differ.
> Always query the `LedgerAccount` model for real codes before hardcoding.

---

## 1. Double-Entry Ledger Architecture

### 1.1 Fundamental Invariant
Every financial event MUST produce a balanced journal entry where:
```
Σ debits = Σ credits  (for every JournalEntry)
```
**NEVER** allow a journal entry to be persisted if debits ≠ credits.

### 1.2 Chart of Accounts (CoA) Standards
MyMoolah uses `LedgerAccount` with `code`, `name`, `type`, and `normalSide` fields.

**Required Account Types:**
| Type | Normal Side | Purpose |
|------|------------|---------|
| `ASSET` | Debit | Bank accounts, float holdings, receivables |
| `LIABILITY` | Credit | User wallet balances, payables, deposits held |
| `EQUITY` | Credit | Owner's equity, retained earnings |
| `REVENUE` | Credit | Commission income, fee income, ad revenue |
| `EXPENSE` | Debit | Transaction costs, supplier fees, operational costs |
| `CONTRA` | Varies | Contra-accounts (e.g., allowance for bad debts) |

**Account Code Convention (Mojaloop-aligned):**
```
1xxxx = Assets        (e.g., 10100 = Settlement Bank Account)
2xxxx = Liabilities   (e.g., 20100 = User Wallet Balances)
3xxxx = Equity        (e.g., 30100 = Retained Earnings)
4xxxx = Revenue       (e.g., 40100 = Commission Income)
5xxxx = Expenses      (e.g., 50100 = Transaction Processing Fees)
```

### 1.3 MyMoolah Core Accounts (Minimum Required)
```
10100 - Settlement Bank Account (Standard Bank)     [ASSET/Debit]
10200 - Float Holding Account                       [ASSET/Debit]
10300 - Receivables - Suppliers                     [ASSET/Debit]
10400 - Receivables - Merchants                     [ASSET/Debit]
10500 - USDC Custody Account                        [ASSET/Debit]
10600 - Prefunding Account                          [ASSET/Debit]
10700 - EasyPay Clearing Account                    [ASSET/Debit]
20100 - User Wallet Balances (aggregate liability)  [LIABILITY/Credit]
20200 - Merchant Float Balances                     [LIABILITY/Credit]
20300 - Payables - Suppliers                        [LIABILITY/Credit]
20400 - Payables - Settlement                       [LIABILITY/Credit]
20500 - Suspense Account                            [LIABILITY/Credit]
20600 - Unallocated Funds                           [LIABILITY/Credit]
30100 - Retained Earnings                           [EQUITY/Credit]
30200 - Owner's Equity                              [EQUITY/Credit]
40100 - Commission Income - Airtime/Data            [REVENUE/Credit]
40200 - Commission Income - Electricity             [REVENUE/Credit]
40300 - Commission Income - Other VAS               [REVENUE/Credit]
40400 - Ad Revenue - Watch-to-Earn                  [REVENUE/Credit]
40500 - Transaction Fee Income                      [REVENUE/Credit]
40600 - Interchange Income                          [REVENUE/Credit]
50100 - Transaction Processing Fees                 [EXPENSE/Debit]
50200 - Supplier Settlement Costs                   [EXPENSE/Debit]
50300 - Banking & Payment Gateway Fees              [EXPENSE/Debit]
50400 - Ad Campaign Costs                           [EXPENSE/Debit]
50500 - Reward Payouts                              [EXPENSE/Debit]
```

### 1.4 Journal Entry Rules
When creating journal entries:

1. **Immutability**: Journal entries MUST NEVER be updated or deleted. To correct an
   error, create a reversing entry. Use `reference` field for idempotency.
2. **Atomic Transactions**: All journal lines for an entry MUST be created within a
   single database transaction. Use `sequelize.transaction()`.
3. **Balance Validation**: Before persisting, compute `Σ debits - Σ credits` and
   reject if ≠ 0.
4. **Monetary Precision**: Store all amounts as `DECIMAL(18,2)` for ZAR,
   `DECIMAL(18,6)` for USDC. NEVER use floating-point arithmetic for money.
5. **Reference Uniqueness**: The `reference` field on `JournalEntry` ensures
   idempotency — the same business event cannot be double-posted.

**Example: User Wallet Deposit via EasyPay**
```javascript
// Debit: Settlement Bank Account (asset increases)
// Credit: User Wallet Balance (liability increases)
await sequelize.transaction(async (t) => {
  const entry = await JournalEntry.create({
    reference: `DEP-${transactionId}`,
    description: `EasyPay deposit for user ${userId}`,
    postedAt: new Date()
  }, { transaction: t });

  await JournalLine.bulkCreate([
    { entryId: entry.id, accountId: settlementBankAccId, dc: 'debit',  amount: depositAmount, memo: 'EasyPay deposit received' },
    { entryId: entry.id, accountId: userWalletAccId,     dc: 'credit', amount: depositAmount, memo: `Wallet credit for user ${userId}` }
  ], { transaction: t });

  // VALIDATION: Assert balance
  const lines = await JournalLine.findAll({ where: { entryId: entry.id }, transaction: t });
  const totalDebit  = lines.filter(l => l.dc === 'debit').reduce((s, l) => s + parseFloat(l.amount), 0);
  const totalCredit = lines.filter(l => l.dc === 'credit').reduce((s, l) => s + parseFloat(l.amount), 0);
  if (Math.abs(totalDebit - totalCredit) > 0.001) {
    throw new Error(`LEDGER IMBALANCE: debit=${totalDebit}, credit=${totalCredit}`);
  }
});
```

---

## 2. Reconciliation Engine Standards

### 2.1 Mojaloop Reconciliation Principles
- **Deterministic Outcomes**: Every transfer MUST have a deterministic final state
  (committed or aborted). No transfers may remain in an indeterminate state.
- **Position-Based Settlement**: Track net positions per DFSP/supplier for deferred
  net settlement.
- **N-Way Matching**: Reconcile across multiple data sources (MyMoolah internal
  records, supplier statements, bank statements, payment gateway reports).

### 2.2 Reconciliation Run Workflow
The existing `ReconRun` model tracks: `total_transactions`, `matched_exact`,
`matched_fuzzy`, `unmatched_mmtp`, `unmatched_supplier`, `amount_variance`.

**Mandatory Steps for Every Recon Run:**
1. **File Ingestion**: Hash the supplier file (`file_hash` field) to ensure integrity
   and prevent duplicate processing.
2. **Transaction Matching**:
   - Phase 1: Exact match on reference/transaction ID
   - Phase 2: Fuzzy match on amount + date ± tolerance window
   - Phase 3: ML-assisted anomaly detection (`ml_anomalies` JSONB field)
3. **Variance Calculation**:
   ```
   amount_variance = total_amount_mmtp - total_amount_supplier
   commission_variance = total_commission_mmtp - total_commission_supplier
   ```
4. **Pass/Fail Determination**: `matchRate >= 99.0% AND |variance| <= threshold`
5. **Discrepancy Classification**: Categorize each unmatched item:
   - `MISSING_IN_MMTP` — supplier has record, MyMoolah doesn't
   - `MISSING_IN_SUPPLIER` — MyMoolah has record, supplier doesn't
   - `AMOUNT_MISMATCH` — both have record, amounts differ
   - `STATUS_MISMATCH` — transaction status disagreement
   - `TIMING_DIFFERENCE` — settlement date disagreement
6. **Audit Trail**: Every recon action MUST be logged to `ReconAuditTrail`.

### 2.3 Reconciliation Frequencies
| Data Source | Frequency | SLA |
|-------------|-----------|-----|
| Flash/Ringo (airtime) | Daily | T+1 |
| EasyPay deposits | Real-time + daily batch | T+0 |
| Standard Bank settlement | Daily | T+1 |
| USDC on-chain | Per-block confirmation | T+0 |
| Merchant float top-ups | Daily | T+1 |
| Ad revenue/Watch-to-Earn | Weekly | T+7 |

---

## 3. Immutable Audit Trail (Forensic Logging)

### 3.1 Mojaloop Auditing BC Alignment
Following the Mojaloop Auditing Bounded Context pattern:
- **Append-Only Storage**: `ReconAuditTrail` has NO `updatedAt` — records are
  immutable once written.
- **Hash Chaining**: Each event includes `event_hash` (SHA-256) and
  `previous_event_hash`, creating a blockchain-style tamper-evident chain.
- **Actor Tracking**: Every mutation records `actor_type` (system/user/admin),
  `actor_id`, `ip_address`, and `user_agent`.

### 3.2 Events That MUST Be Audited
```
LEDGER_ACCOUNT_CREATED       — New account added to Chart of Accounts
LEDGER_ACCOUNT_DEACTIVATED   — Account soft-deleted
JOURNAL_ENTRY_POSTED         — Double-entry journal posted
JOURNAL_ENTRY_REVERSED       — Correcting reversal posted
RECON_RUN_STARTED            — Reconciliation initiated
RECON_RUN_COMPLETED          — Reconciliation finished with results
RECON_MATCH_CONFIRMED        — Transaction pair matched
RECON_DISCREPANCY_FLAGGED    — Unresolved discrepancy identified
RECON_DISCREPANCY_RESOLVED   — Manual resolution applied
FLOAT_ADJUSTMENT             — Float balance adjusted
SETTLEMENT_INITIATED         — Settlement batch started
SETTLEMENT_COMPLETED         — Settlement batch finalized
BALANCE_SNAPSHOT             — Periodic balance state capture
SUSPICIOUS_ACTIVITY_DETECTED — ML anomaly or threshold breach
USER_WALLET_CREDITED         — Money credited to user wallet
USER_WALLET_DEBITED          — Money debited from user wallet
KYC_STATUS_CHANGED           — Know Your Customer status update
```

### 3.3 Audit Trail Integrity Verification
```javascript
/**
 * Verify the entire audit chain for a reconciliation run.
 * Returns { valid: boolean, brokenAt: number|null, totalEvents: number }
 */
async function verifyAuditChain(runId) {
  const events = await ReconAuditTrail.findAll({
    where: { run_id: runId },
    order: [['event_timestamp', 'ASC']]
  });

  for (let i = 0; i < events.length; i++) {
    // Verify self-hash
    if (!events[i].verifyIntegrity()) {
      return { valid: false, brokenAt: i, totalEvents: events.length };
    }
    // Verify chain link
    if (i > 0 && events[i].previous_event_hash !== events[i - 1].event_hash) {
      return { valid: false, brokenAt: i, totalEvents: events.length };
    }
  }
  return { valid: true, brokenAt: null, totalEvents: events.length };
}
```

---

## 4. Balance Integrity Checks

### 4.1 Trial Balance Verification
Run periodically (at minimum daily) to verify the fundamental accounting equation:
```
Σ(Asset debits) + Σ(Expense debits) = Σ(Liability credits) + Σ(Equity credits) + Σ(Revenue credits)
```

```javascript
async function verifyTrialBalance() {
  const accounts = await LedgerAccount.findAll({ where: { isActive: true } });
  let totalDebits = 0;
  let totalCredits = 0;

  for (const account of accounts) {
    const lines = await JournalLine.findAll({ where: { accountId: account.id } });
    const debits  = lines.filter(l => l.dc === 'debit').reduce((s, l) => s + parseFloat(l.amount), 0);
    const credits = lines.filter(l => l.dc === 'credit').reduce((s, l) => s + parseFloat(l.amount), 0);

    if (account.normalSide === 'debit') {
      totalDebits += (debits - credits);  // Net debit balance
    } else {
      totalCredits += (credits - debits); // Net credit balance
    }
  }

  const balanced = Math.abs(totalDebits - totalCredits) < 0.01;
  return {
    balanced,
    totalDebits,
    totalCredits,
    variance: totalDebits - totalCredits
  };
}
```

### 4.2 Float Balance Verification
For every supplier/merchant, the float balance in the wallet system MUST equal the
corresponding ledger account balance:
```
Σ(Float credits) - Σ(Float debits) = Float balance in MerchantFloat/ClientFloat model
```

### 4.3 User Wallet Aggregate Verification
The total of all individual user wallet balances MUST equal the `20100 - User Wallet
Balances` ledger account:
```
Σ(individual user balances from Wallet table) = Net balance of account 20100
```

### 4.4 Bank Statement Reconciliation
Settlement Bank Account ledger balance MUST reconcile against the actual bank
statement:
```
10100 net balance = Bank statement closing balance + outstanding deposits - outstanding withdrawals
```

---

## 5. Settlement & Position Management

### 5.1 Mojaloop Net Position Tracking
For each DFSP/supplier, maintain a running net position:
```
Net Position = Σ(outgoing transfers) - Σ(incoming transfers) - liquidity cover
```

### 5.2 Settlement Windows
- Settlement windows must have clear open/close timestamps
- All transfers within a window must be either committed or aborted before close
- Settlement reports must reconcile net positions to actual fund movements

### 5.3 Liquidity Checks
Before processing any transaction, verify:
```
Available liquidity = NDC (Net Debit Cap) - current_position
if (transfer_amount > available_liquidity) → REJECT
```

---

## 6. Compliance & Regulatory Standards

### 6.1 Standards Referenced
- **IFRS / IAS**: International Financial Reporting Standards for ledger presentation
- **Mojaloop FSPIOP**: Financial Services Provider Interoperability Protocol
- **PCI-DSS**: Payment Card Industry Data Security Standard
- **SARB/FSCA**: South African Reserve Bank / Financial Sector Conduct Authority
- **POPIA**: Protection of Personal Information Act (South Africa)
- **SOX**: Sarbanes-Oxley — audit trail completeness and integrity
- **RICA**: Regulation of Interception of Communications and Provision of
  Communication-Related Information Act

### 6.2 Data Retention Requirements
| Data Type | Minimum Retention | Storage |
|-----------|------------------|---------|
| Journal entries | 7 years | Primary DB + cold storage |
| Audit trail events | 7 years | Append-only, encrypted |
| Recon run results | 5 years | Primary DB |
| Transaction records | 5 years | Primary DB + archive |
| KYC documents | 5 years post-relationship | Encrypted storage |

### 6.3 Segregation of Duties
- Transaction creation and approval must be separate roles
- Reconciliation execution and discrepancy resolution must be separate roles
- Ledger account creation requires admin approval
- Manual journal entries require dual authorization

---

## 7. Automated Health Checks

### 7.1 Critical Checks (Run Every Hour)
```
[ ] Trial balance is balanced (debits = credits)
[ ] No journal entries with imbalanced lines
[ ] No orphaned journal lines (missing parent entry)
[ ] User wallet aggregate = Ledger account 20100
[ ] No transactions in indeterminate state > 15 minutes
```

### 7.2 Daily Checks
```
[ ] Float balances match ledger accounts
[ ] All scheduled recon runs completed
[ ] Recon match rate ≥ 99% for all suppliers
[ ] Amount variance within threshold
[ ] Audit trail chain integrity verified
[ ] No unresolved discrepancies > 24 hours old
```

### 7.3 Weekly Checks
```
[ ] Bank statement reconciliation complete
[ ] Commission/fee income reconciled
[ ] Aging analysis of unmatched transactions
[ ] ML anomaly review
[ ] Audit trail hash chain full verification
```

---

## 8. Error Handling & Recovery

### 8.1 Compensating Transactions
When a transaction fails mid-way, create a compensating (reversal) journal entry:
```javascript
async function createReversalEntry(originalRef, reason) {
  const original = await JournalEntry.findOne({
    where: { reference: originalRef },
    include: [{ model: JournalLine, as: 'lines' }]
  });
  if (!original) throw new Error(`Original entry ${originalRef} not found`);

  return sequelize.transaction(async (t) => {
    const reversal = await JournalEntry.create({
      reference: `REV-${originalRef}`,
      description: `Reversal: ${reason}`,
      postedAt: new Date()
    }, { transaction: t });

    const reversedLines = original.lines.map(line => ({
      entryId: reversal.id,
      accountId: line.accountId,
      dc: line.dc === 'debit' ? 'credit' : 'debit',  // Flip debit/credit
      amount: line.amount,
      memo: `Reversal of ${originalRef}: ${reason}`
    }));

    await JournalLine.bulkCreate(reversedLines, { transaction: t });
    return reversal;
  });
}
```

### 8.2 Suspense Account Usage
When a transaction cannot be immediately classified:
1. Post to `20500 - Suspense Account`
2. Create an audit trail event `SUSPENSE_ENTRY_CREATED`
3. Set an alarm for manual review within 24 hours
4. Upon resolution, post a correcting entry to move from suspense to correct account

---

## 9. Code Review Checklist

When reviewing any PR that touches financial code, verify:

- [ ] All monetary values use `DECIMAL`, never `FLOAT` or `DOUBLE`
- [ ] All journal entries are created within `sequelize.transaction()`
- [ ] Every journal entry passes balance validation (Σ debits = Σ credits)
- [ ] `reference` field is set for idempotency on journal entries
- [ ] No UPDATE or DELETE operations on journal_entries or journal_lines tables
- [ ] Audit trail event created for every financial state change
- [ ] Error paths include compensating transactions or suspense entries
- [ ] Monetary arithmetic uses integer cents or `Decimal` library, not JS floats
- [ ] Currency is explicitly tracked (ZAR vs USDC)
- [ ] Float/wallet balance changes are reconcilable to journal entries
- [ ] Recon discrepancies are classified and logged
- [ ] Settlement amounts are validated against position calculations
- [ ] Rate limiting / idempotency keys prevent duplicate transactions
- [ ] All financial endpoints require authentication and authorization
- [ ] Sensitive data (account numbers, balances) is not logged in plaintext

---

## 10. MyMoolah-Specific Architecture Reference

### 10.1 Key Models
| Model | File | Purpose |
|-------|------|---------|
| `LedgerAccount` | `models/LedgerAccount.js` | Chart of Accounts |
| `JournalEntry` | `models/JournalEntry.js` | Double-entry journal headers |
| `JournalLine` | `models/JournalLine.js` | Debit/credit lines per entry |
| `ReconRun` | `models/ReconRun.js` | Reconciliation run metadata |
| `ReconTransactionMatch` | `models/ReconTransactionMatch.js` | Individual transaction matches |
| `ReconAuditTrail` | `models/ReconAuditTrail.js` | Immutable audit log with hash chaining |
| `ReconSupplierConfig` | `models/ReconSupplierConfig.js` | Supplier reconciliation settings |
| `MerchantFloat` | `models/MerchantFloat.js` | Merchant float balances |
| `ClientFloat` | `models/ClientFloat.js` | Client float balances |
| `MyMoolahTransaction` | `models/MyMoolahTransaction.js` | Transaction records |
| `FlashTransaction` | `models/FlashTransaction.js` | VAS provider transactions |
| `Settlement` | `models/Settlement*.js` | Settlement processing |

### 10.2 Financial Flow Architecture
```
                 ┌──────────────────────┐
                 │  External Providers  │
                 │  (EasyPay, Flash,    │
                 │   Standard Bank)     │
                 └─────────┬────────────┘
                           │
                   ┌───────▼───────┐
                   │  Integration  │──── Reconciliation Engine
                   │    Layer      │     (ReconRun + Matching)
                   └───────┬───────┘
                           │
              ┌────────────▼────────────┐
              │   Double-Entry Ledger   │
              │  ┌──────────────────┐   │
              │  │  JournalEntry    │   │
              │  │  └─ JournalLine  │   │
              │  │     └─ Account   │   │
              │  └──────────────────┘   │
              └────────────┬────────────┘
                           │
              ┌────────────▼────────────┐
              │    Audit Trail Layer    │
              │  (ReconAuditTrail with  │
              │   hash chain integrity) │
              └─────────────────────────┘
```

---

## Quick Reference Commands

### Verify Ledger Balance
```sql
SELECT
  SUM(CASE WHEN jl.dc = 'debit'  THEN jl.amount ELSE 0 END) as total_debits,
  SUM(CASE WHEN jl.dc = 'credit' THEN jl.amount ELSE 0 END) as total_credits,
  SUM(CASE WHEN jl.dc = 'debit'  THEN jl.amount ELSE 0 END) -
  SUM(CASE WHEN jl.dc = 'credit' THEN jl.amount ELSE 0 END) as net_balance
FROM journal_lines jl;
-- Expected: net_balance = 0.00
```

### Account Balance Report
```sql
SELECT
  la.code, la.name, la.type, la."normalSide",
  SUM(CASE WHEN jl.dc = 'debit'  THEN jl.amount ELSE 0 END) as debits,
  SUM(CASE WHEN jl.dc = 'credit' THEN jl.amount ELSE 0 END) as credits,
  CASE WHEN la."normalSide" = 'debit'
    THEN SUM(CASE WHEN jl.dc = 'debit' THEN jl.amount ELSE -jl.amount END)
    ELSE SUM(CASE WHEN jl.dc = 'credit' THEN jl.amount ELSE -jl.amount END)
  END as balance
FROM ledger_accounts la
LEFT JOIN journal_lines jl ON la.id = jl."accountId"
WHERE la."isActive" = true
GROUP BY la.id, la.code, la.name, la.type, la."normalSide"
ORDER BY la.code;
```

### Audit Chain Verification
```sql
SELECT
  a1.event_id,
  a1.event_hash,
  a1.previous_event_hash,
  a2.event_hash as expected_previous,
  CASE WHEN a1.previous_event_hash = a2.event_hash THEN 'VALID' ELSE 'BROKEN' END as chain_status
FROM recon_audit_trail a1
LEFT JOIN recon_audit_trail a2 ON a2.event_timestamp = (
  SELECT MAX(event_timestamp) FROM recon_audit_trail
  WHERE event_timestamp < a1.event_timestamp AND run_id = a1.run_id
)
WHERE a1.run_id = :runId
ORDER BY a1.event_timestamp;
```
