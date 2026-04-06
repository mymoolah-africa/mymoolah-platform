---
name: banking-grade-auditing
version: 2.1.0
description: >
  Banking-grade ledger auditing, reconciliation, double-entry accounting,
  and South African regulatory compliance skill for the MyMoolah Treasury
  Platform (MMTP). Enforces FICA Act 38/2001, POPIA, SARB/FSCA prudential
  standards, Mojaloop FSPIOP, SOX-grade internal controls, SHA-256
  hash-chained immutable audit trails, automated N-way reconciliation,
  and structured PASS/WARN/FAIL audit workflows. Use this skill whenever
  working on ledger accounts, journal entries, reconciliation, settlement,
  float management, compliance reporting, or any financial data integrity task.
sources:
  - name: Agent Audit Trail (openclaw/skills)
    url: https://github.com/openclaw/skills
    license: MIT-0
    adopted: SHA-256 hash-chain schema, monotonic ordering, structured event kinds
  - name: SOX Compliance (odinlayer-skills)
    url: https://lobehub.com/skills/peixotorms-odinlayer-skills-sox-compliance
    adopted: WORM storage, segregation of duties, material-weakness detection, COSO mapping
  - name: CFO Stack /cfo-audit
    url: https://github.com/MikeChongCan/cfo-stack
    adopted: 6-step audit workflow, PASS/WARN/FAIL scoring, anomaly detection patterns
tags:
  - audit
  - compliance
  - ledger
  - double-entry
  - reconciliation
  - fica
  - popia
  - sarb
  - mojaloop
  - sox
  - banking
  - south-africa
---

# Banking-Grade Auditing, Compliance & Reconciliation Skill

## Purpose

You are an expert financial systems auditor specializing in South African
digital payment platforms, mobile money, and Mojaloop-compliant interoperable
payment schemes. When this skill is active, you MUST enforce banking-grade
standards for every financial operation, ledger modification, reconciliation
process, compliance check, and audit trail in the MyMoolah Treasury Platform.

**This skill activates when the context involves:**
- Ledger accounts, journal entries, or journal lines
- Reconciliation runs, transaction matching, or supplier configs
- Float management (merchant float, client float, settlement)
- Financial transactions (deposits, withdrawals, transfers, purchases)
- Audit trails, compliance checks, or forensic logging
- Settlement processing or net-position calculations
- FICA CDD/EDD, suspicious transaction reporting, or KYC status changes
- POPIA personal information processing, breach notification, or data retention
- SARB/FSCA prudential reporting or NPS Act compliance
- Any model or service touching monetary values

> **MyMoolah Account Code Convention**: The codebase uses hierarchical codes like
> `2100-01-01` (User Wallet ZAR), `1200-10-04` (Flash Float), `4100-10-01`
> (Commission Revenue). The 5-digit Mojaloop-aligned codes below (10100, 20100)
> are reference standards -- the actual codes in `ledger_accounts` may differ.
> Always query the `LedgerAccount` model for real codes before hardcoding.

**Mojaloop Reference → MMTP Actual Code Mapping:**
| Mojaloop Ref | MMTP Code | Name |
|-------------|-----------|------|
| 10100 | `1100-01-01` | Standard Bank Current Account |
| 10200 | `1200-10-04` / `1200-10-05` | Supplier Float (Flash / MobileMart) |
| 20100 | `2100-01-01` | User Wallet ZAR |
| 20500 | `2600-01-01` | Unallocated Suspense |
| 40100 | `4100-10-01` | Commission Revenue — Airtime/Data |
| 40200 | `4100-10-02` | Commission Revenue — Electricity |
| 50100 | `5100-01-01` | Supplier COGS |

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

> **Canonical Reference**: See `docs/CHART_OF_ACCOUNTS.md` for the complete,
> authoritative Chart of Accounts with all 28+ accounts, journal templates,
> solvency rules, reserved ranges, and product registration checklist.
> That document supersedes any account listings in this skill.

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
   idempotency -- the same business event cannot be double-posted.

**Example: User Wallet Deposit via EasyPay**
```javascript
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
   - `MISSING_IN_MMTP` -- supplier has record, MyMoolah doesn't
   - `MISSING_IN_SUPPLIER` -- MyMoolah has record, supplier doesn't
   - `AMOUNT_MISMATCH` -- both have record, amounts differ
   - `STATUS_MISMATCH` -- transaction status disagreement
   - `TIMING_DIFFERENCE` -- settlement date disagreement
6. **Audit Trail**: Every recon action MUST be logged to `ReconAuditTrail`.

### 2.3 Reconciliation Frequencies
| Data Source | Frequency | SLA |
|-------------|-----------|-----|
| Flash/Ringo (airtime) | Daily | T+1 |
| MobileMart (data/airtime/electricity/billers) | Daily | T+1 |
| EasyPay deposits | Real-time + daily batch | T+0 |
| Standard Bank settlement (MT940/MT942) | Daily | T+1 |
| USDC on-chain | Per-block confirmation | T+0 |
| Merchant float top-ups | Daily | T+1 |
| Ad revenue/Watch-to-Earn | Weekly | T+7 |
| Commission/VAT | Monthly | T+30 |

---

## 3. Immutable Audit Trail (Forensic Logging)

### 3.1 Hash-Chained Append-Only Architecture
> Adopted from openclaw/skills Agent Audit Trail (MIT-0) and enhanced for
> banking-grade requirements. Every significant financial event is recorded
> with a SHA-256 chain linking entries -- making tampering detectable and
> providing an authoritative compliance record for FICA, POPIA, and SARB.

**Core Invariants:**
- **Append-Only**: `ReconAuditTrail` has NO `updatedAt` -- records are
  immutable once written. DELETE is prohibited at the application layer.
- **Hash Chaining**: Each event includes `event_hash` (SHA-256) and
  `previous_event_hash`, creating a tamper-evident chain.
- **Monotonic Ordering**: Events carry a sequence number (`ord`) ensuring
  strict chronological ordering within each audit domain.
- **Actor Tracking**: Every mutation records `actor_type` (system/user/admin),
  `actor_id`, `ip_address`, and `user_agent`.
- **WORM Semantics**: Write Once Read Many -- once an audit entry is written,
  no process may modify or delete it. Database triggers MUST enforce this.

### 3.2 Audit Event Schema
Each audit trail entry conforms to this schema:
```json
{
  "event_id":           "uuid-v4",
  "event_timestamp":    "2026-04-03T21:00:00.000+02:00",
  "kind":               "JOURNAL_ENTRY_POSTED",
  "actor_type":         "system",
  "actor_id":           "productPurchaseService",
  "domain":             "ledger",
  "plane":              "action",
  "ord":                42,
  "target":             "journal_entries:DEP-txn-abc123",
  "summary":            "Double-entry journal posted: R50.00 EasyPay deposit",
  "metadata":           { "transactionId": "abc123", "amount": "50.00", "currency": "ZAR" },
  "ip_address":         "10.0.0.1",
  "user_agent":         "MMTP/2.72.0",
  "previous_event_hash":"sha256:abc123def456...",
  "event_hash":         "sha256:789ghi012jkl..."
}
```

**Field Reference:**
| Field | Type | Description |
|-------|------|-------------|
| `event_id` | UUID v4 | Globally unique event identifier |
| `event_timestamp` | ISO-8601 | Timestamp with SAST offset (+02:00) |
| `kind` | string | Event type (see 3.3) |
| `actor_type` | enum | `system`, `user`, `admin`, `scheduler`, `migration` |
| `actor_id` | string | Service name, user ID, or admin ID |
| `domain` | string | Audit domain: `ledger`, `recon`, `wallet`, `kyc`, `fica`, `settlement` |
| `plane` | string | `ingress`, `decision`, `action`, `compliance` |
| `ord` | integer | Monotonically increasing sequence per domain |
| `target` | string | Resource affected (table:reference or endpoint) |
| `summary` | string | Human-readable description |
| `metadata` | JSONB | Structured event-specific data (amounts, IDs, before/after) |
| `ip_address` | string | Source IP (redacted for PII compliance where needed) |
| `user_agent` | string | Client or service identifier |
| `previous_event_hash` | string | SHA-256 of the preceding entry in this domain |
| `event_hash` | string | SHA-256 of this entry (excluding the hash field itself) |

### 3.3 Events That MUST Be Audited
```
LEDGER_ACCOUNT_CREATED         — New account added to Chart of Accounts
LEDGER_ACCOUNT_DEACTIVATED     — Account soft-deleted
JOURNAL_ENTRY_POSTED           — Double-entry journal posted
JOURNAL_ENTRY_REVERSED         — Correcting reversal posted
RECON_RUN_STARTED              — Reconciliation initiated
RECON_RUN_COMPLETED            — Reconciliation finished with results
RECON_MATCH_CONFIRMED          — Transaction pair matched
RECON_DISCREPANCY_FLAGGED      — Unresolved discrepancy identified
RECON_DISCREPANCY_RESOLVED     — Manual resolution applied
FLOAT_ADJUSTMENT               — Float balance adjusted
SETTLEMENT_INITIATED           — Settlement batch started
SETTLEMENT_COMPLETED           — Settlement batch finalized
BALANCE_SNAPSHOT               — Periodic balance state capture
SUSPICIOUS_ACTIVITY_DETECTED   — ML anomaly or threshold breach
USER_WALLET_CREDITED           — Money credited to user wallet
USER_WALLET_DEBITED            — Money debited from user wallet
KYC_STATUS_CHANGED             — Know Your Customer status update
FICA_CDD_COMPLETED             — Customer Due Diligence performed
FICA_EDD_TRIGGERED             — Enhanced Due Diligence required
FICA_SAR_FILED                 — Suspicious Activity Report submitted to FIC
FICA_CTR_FILED                 — Cash Threshold Report submitted
POPIA_DATA_ACCESS_REQUEST      — Data subject access request received
POPIA_DATA_DELETION_REQUEST    — Data subject deletion request received
POPIA_BREACH_DETECTED          — Security compromise identified
POPIA_BREACH_NOTIFIED          — Information Regulator and subjects notified
CREDENTIAL_ACCESSED            — Secret or API key accessed by service
PERMISSION_CHANGED             — User role or access level modified
COMMISSION_CALCULATED          — Commission/VAT computed for transaction
SUPPLIER_FAILOVER              — Circuit breaker triggered supplier switch
```

### 3.4 Hash Chain Computation
```javascript
const crypto = require('crypto');

function computeEventHash(entry) {
  const payload = {
    event_id: entry.event_id,
    event_timestamp: entry.event_timestamp,
    kind: entry.kind,
    actor_type: entry.actor_type,
    actor_id: entry.actor_id,
    domain: entry.domain,
    ord: entry.ord,
    target: entry.target,
    summary: entry.summary,
    metadata: entry.metadata,
    previous_event_hash: entry.previous_event_hash
  };
  const raw = JSON.stringify(payload, Object.keys(payload).sort());
  return 'sha256:' + crypto.createHash('sha256').update(raw).digest('hex');
}
```

### 3.5 Chain Integrity Verification
```javascript
async function verifyAuditChain(domain, startDate, endDate) {
  const events = await ReconAuditTrail.findAll({
    where: {
      domain,
      event_timestamp: { [Op.between]: [startDate, endDate] }
    },
    order: [['ord', 'ASC']]
  });

  const results = { valid: true, brokenAt: null, totalEvents: events.length, verified: 0 };

  for (let i = 0; i < events.length; i++) {
    const computed = computeEventHash(events[i]);
    if (computed !== events[i].event_hash) {
      return { ...results, valid: false, brokenAt: i, error: 'SELF_HASH_MISMATCH' };
    }
    if (i > 0 && events[i].previous_event_hash !== events[i - 1].event_hash) {
      return { ...results, valid: false, brokenAt: i, error: 'CHAIN_LINK_BROKEN' };
    }
    results.verified++;
  }
  return results;
}
```

### 3.6 WORM Enforcement (Database Trigger)
```sql
-- Prevent any UPDATE or DELETE on the audit trail
CREATE OR REPLACE FUNCTION prevent_audit_mutation()
RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION 'AUDIT TRAIL VIOLATION: % operations are prohibited on recon_audit_trail',
    TG_OP;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER enforce_worm_audit_trail
  BEFORE UPDATE OR DELETE ON recon_audit_trail
  FOR EACH ROW EXECUTE FUNCTION prevent_audit_mutation();
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
      totalDebits += (debits - credits);
    } else {
      totalCredits += (credits - debits);
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
statement (MT940/MT942):
```
10100 net balance = Bank statement closing balance + outstanding deposits - outstanding withdrawals
```

### 4.5 Commission & VAT Reconciliation
```
Σ(commission journal lines for period) = Σ(commission_amount in MyMoolahTransaction for period)
Σ(VAT journal lines for period) = Σ(commission * 0.15) for VAT-applicable transactions
```

**Commission Configuration Reference:**
- Commission rates are externalized in `config/supplier-commissions.json`
  (no longer hardcoded in if/else chains)
- Commission tiers are stored in `supplier_commission_tiers` table
- Product selection rules are in `product_selection_rules` table
- The `v_best_offers` materialized view resolves the winning supplier/product
  for each VAS category, auto-refreshed after every catalog sync

**Known Issue — `tax_transactions` FK Constraint:**
The `tax_transactions.originalTransactionId` FK can fail when the parent
`transactions` row is not yet committed at the time the tax record is inserted.
Commission journal entries are still posted correctly; only the
`tax_transactions` audit record fails to persist. This is tracked in the
tech debt register.

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

## 6. South African Regulatory Compliance

> This section codifies the legal obligations that MMTP must satisfy as an
> accountable institution / payment service provider operating in South Africa.
> Every agent working on MyMoolah financial code MUST understand and enforce
> these requirements. Non-compliance carries criminal penalties, licence
> revocation, and fines up to R10 million per infringement.

### 6.1 FICA — Financial Intelligence Centre Act 38 of 2001

The FIC Act is South Africa's primary anti-money-laundering (AML) and
counter-terrorism financing (CTF) legislation. MyMoolah is an accountable
institution under Schedule 1.

#### 6.1.1 Customer Due Diligence (CDD) — Section 21
Before establishing a business relationship or processing a single transaction:
- Verify client identity against official databases (SA ID, passport)
- Collect prescribed identification documents
- Determine the nature and intended purpose of the business relationship
- Assess the client's risk profile (low / medium / high)
- Record the name of the person who performed verification

**Audit requirement**: Every CDD event MUST produce a `FICA_CDD_COMPLETED` audit
trail entry with metadata containing: verification method, risk rating, document
types collected, verifier identity.

#### 6.1.2 Enhanced Due Diligence (EDD) — Section 21B
For higher-risk clients (PEPs, high-value, unusual patterns):
- Ongoing monitoring of transactions
- Deeper investigation of source of funds and source of wealth
- Senior management approval for establishing/continuing the relationship
- More frequent review of the business relationship

**Audit requirement**: `FICA_EDD_TRIGGERED` audit event with rationale and
approver identity.

#### 6.1.3 Record Keeping — Section 22
All CDD documentation and transaction records MUST be retained for:
- **5 years** after the business relationship ends, OR
- **5 years** after a single transaction is concluded (if no ongoing relationship)

Records include:
- Identity verification documents and methods used
- All transaction records (amounts, parties, dates, references)
- Correspondence with clients related to CDD
- Risk assessments conducted
- Training records for compliance staff

#### 6.1.4 Cash Threshold Reporting (CTR) — Section 28
Cash transactions above R24,999.99 MUST be reported to the FIC within
the prescribed period. For digital wallets:
- Monitor aggregate cash-in (EasyPay/NFC) per client per day
- If cumulative cash deposits exceed the threshold, file a CTR
- Structuring detection: flag clients splitting transactions to avoid threshold

**Audit requirement**: `FICA_CTR_FILED` audit event with transaction references,
aggregate amount, and submission confirmation.

#### 6.1.5 Suspicious Activity Reporting (SAR) — Section 29
Any person who knows or ought reasonably to have known that funds may be
proceeds of unlawful activity MUST report to the FIC:
- Unusual transaction patterns (velocity, amount, geography)
- Transactions inconsistent with client's known profile
- Attempts to avoid record-keeping or identification requirements
- Tip-offs or external intelligence

**Audit requirement**: `FICA_SAR_FILED` audit event. The SAR itself is
confidential -- NEVER expose SAR filing status to the client (tipping off
is a criminal offence under Section 29(4)).

#### 6.1.6 Risk Management and Compliance Programme (RMCP) — Section 42
MMTP MUST maintain an RMCP that includes:
- Board-approved AML/CTF policies and procedures
- Designated compliance officer
- Employee training programme
- Independent audit of AML controls (annually at minimum)
- Risk-based approach to client relationships and transactions

### 6.2 POPIA — Protection of Personal Information Act 4 of 2013

POPIA is South Africa's comprehensive data protection legislation, comparable
to GDPR. MyMoolah is a "responsible party" processing personal information
of data subjects (wallet users).

#### 6.2.1 Lawful Processing — Section 9-12
Personal information may only be processed if:
- The data subject consents, OR
- Processing is necessary for contract performance, OR
- Processing is required by law (e.g., FICA obligations), OR
- Processing protects a legitimate interest of the data subject

For financial data, FICA record-keeping requirements provide the lawful basis
for retaining transaction data. Consent is required for marketing or optional
data collection.

#### 6.2.2 Purpose Limitation — Section 13
Personal information must be collected for a specific, explicitly defined, and
lawful purpose. MMTP collects personal information for:
- Wallet account management and transaction processing
- FICA/AML compliance (CDD, risk assessment, reporting)
- KYC identity verification
- Customer support
- Fraud prevention and security

Data collected for one purpose MUST NOT be repurposed without fresh consent
or a new lawful basis.

#### 6.2.3 Data Minimisation — Section 10
Collect only the personal information that is adequate, relevant, and not
excessive for the stated purpose. For MMTP:
- KYC: only collect documents required by FICA (ID, proof of address)
- Transaction data: only store what is needed for ledger/audit/compliance
- NEVER cache personal information in logs, Redis, or temporary storage
  beyond the immediate processing need

#### 6.2.4 Retention — Section 14
Personal information must not be retained longer than necessary:
| Data Type | Retention Period | Legal Basis |
|-----------|-----------------|-------------|
| Transaction records | 5 years post-relationship | FICA s.22 |
| KYC documents | 5 years post-relationship | FICA s.22 |
| Journal entries | 7 years | Companies Act / SOX-grade |
| Audit trail events | 7 years | Immutable, encrypted |
| User profile data | Duration of relationship + 5 years | FICA s.22 |
| Marketing consent | Until withdrawal | POPIA s.11(3) |
| Support chat logs | 2 years | Legitimate interest |

After the retention period, personal information MUST be de-identified or
securely destroyed. Automated retention policies should be implemented.

#### 6.2.5 Security Safeguards — Section 19
The responsible party MUST:
1. Identify all reasonably foreseeable internal and external risks to
   personal information
2. Establish and maintain appropriate safeguards against identified risks
3. Regularly verify that safeguards are effectively implemented
4. Continually update safeguards in response to new risks or deficiencies

For MMTP, this translates to:
- AES-256-GCM encryption for data at rest
- TLS 1.3 for data in transit
- Parameterized queries (SQL injection prevention)
- PII redaction in all logs (no phone numbers, names, or IDs in plaintext)
- RBAC access control on all API endpoints
- Regular penetration testing and vulnerability scanning

#### 6.2.6 Breach Notification — Section 22
When there are reasonable grounds to believe personal information has been
accessed or acquired by an unauthorised person:
1. Notify the Information Regulator **as soon as reasonably possible**
2. Notify affected data subjects with:
   - Description of possible consequences
   - Measures taken or intended to address the breach
   - Recommendations for data subjects to mitigate adverse effects
   - Identity of the unauthorised person (if known)

**Audit requirement**: `POPIA_BREACH_DETECTED` followed by `POPIA_BREACH_NOTIFIED`
audit events with full incident metadata.

#### 6.2.7 Data Subject Rights
MMTP must support the following data subject requests:
- **Access (Section 23)**: Provide confirmation and copy of personal information
- **Correction (Section 24)**: Correct or delete inaccurate information
- **Deletion (Section 24)**: Delete personal information (subject to FICA retention)
- **Objection (Section 11(3))**: Stop processing for direct marketing

**Audit requirement**: `POPIA_DATA_ACCESS_REQUEST` and `POPIA_DATA_DELETION_REQUEST`
audit events for every data subject request.

#### 6.2.8 Penalties
- Administrative fines up to **R10 million** per infringement notice
- Criminal penalties up to **10 years imprisonment** for serious offences
- Civil claims from affected data subjects

### 6.3 SARB / FSCA — Prudential and Conduct Standards

#### 6.3.1 South African Reserve Bank (SARB)
The SARB oversees payment system stability and monetary policy. Relevant
frameworks for MMTP:

- **National Payment System Act 78 of 1998 (NPS Act)**: Governs all payment,
  clearing, and settlement systems. MMTP must comply with SARB directives for
  payment service providers.
- **Payments Ecosystem Modernisation (PEM)**: SARB's programme to modernise
  the national payment system, enabling non-bank PSPs with appropriate
  licensing and safeguards.
- **Payment Service Directive (draft)**: Operational standards for non-bank
  payment providers covering consumer fund protection, capital reserves,
  governance, and AML safeguards.
- **SARB Directive 1 of 2022 (FATF EFT)**: Compliance with FATF Recommendations
  for electronic funds transfers (originator/beneficiary information).

#### 6.3.2 Financial Sector Conduct Authority (FSCA)
The FSCA regulates market conduct and financial service providers:

- **FAIS Act (Financial Advisory and Intermediary Services Act 37 of 2002)**:
  If MMTP provides financial advice or intermediary services, an FSP licence
  is required.
- **Conduct Standards**: Consumer protection, fair treatment of clients,
  transparent pricing, complaints handling.
- **Fit and Proper Requirements**: Key individuals must meet fit and proper
  standards for competence, honesty, and financial soundness.

#### 6.3.3 Prudential Reporting Requirements
| Report | Frequency | Regulator |
|--------|-----------|-----------|
| Client fund safeguarding | Monthly | SARB/PA |
| AML/CTF compliance report | Quarterly | FIC |
| Transaction volumes and values | Monthly | SARB |
| Capital adequacy (if required) | Quarterly | PA |
| Complaints register | Quarterly | FSCA |
| Annual financial statements | Annually | FSCA/CIPC |
| External audit report | Annually | FSCA |
| RMCP effectiveness review | Annually | FIC |

### 6.4 RICA — Regulation of Interception of Communications Act
Mobile number verification requirements for SIM-based wallet services.
All user phone numbers must be RICA-verified before wallet activation.

### 6.5 Companies Act 71 of 2008
- Financial record retention: 7 years minimum
- Annual financial statements prepared in accordance with IFRS
- External audit requirement for public interest companies

#### IFRS / IAS Presentation Requirements
MMTP financial records should be prepared in accordance with IFRS for SMEs
(or full IFRS if required by turnover/asset thresholds):

- **IAS 1 (Presentation)**: Trial balance reports must classify accounts into
  current/non-current where applicable
- **IAS 7 (Cash Flows)**: Bank reconciliation (MT940/MT942) must support
  cash flow statement preparation
- **IFRS 9 (Financial Instruments)**: User wallet balances are financial
  liabilities; supplier floats are financial assets measured at amortised cost
- **IAS 18/IFRS 15 (Revenue)**: Commission revenue recognised at point of
  VAS transaction completion (not at order placement)
- **IAS 12 (Income Taxes)**: VAT at 15% on commission income; VAT control
  account `2300-10-01` must reconcile to SARS VAT201 returns

### 6.6 Regulatory Standards Cross-Reference
| Standard | Scope | MyMoolah Applicability |
|----------|-------|----------------------|
| FICA Act 38/2001 | AML/CTF | CDD, EDD, SAR, CTR, RMCP |
| POPIA Act 4/2013 | Data protection | All personal information processing |
| NPS Act 78/1998 | Payment systems | Wallet, transfers, settlement |
| SARB Directives | Payment regulation | PSP licensing, fund safeguarding |
| FSCA Conduct Standards | Market conduct | Consumer protection, complaints |
| FAIS Act 37/2002 | Financial services | If advisory services offered |
| Companies Act 71/2008 | Corporate governance | Financial reporting, retention |
| RICA | Communications | SIM/phone verification |
| IFRS / IAS | Financial reporting | Ledger presentation standards |
| Mojaloop FSPIOP | Interoperability | Payment scheme compliance |
| PCI-DSS | Card data | If card data is handled |
| ISO 20022 | Messaging | RTP and payment messaging |
| SOX (voluntary) | Internal controls | Audit trail, segregation of duties |

---

## 7. SOX-Grade Internal Controls

> While SOX (Sarbanes-Oxley) is US legislation, MMTP voluntarily adopts
> SOX-grade internal controls as a banking-grade best practice. These patterns
> align with SARB prudential expectations and COSO framework requirements.

### 7.1 Control Objectives (COSO Framework)
| Component | MMTP Implementation |
|-----------|-------------------|
| Control Environment | Board-approved policies, compliance officer, code of conduct |
| Risk Assessment | RMCP, transaction monitoring, ML anomaly detection |
| Control Activities | Segregation of duties, approval workflows, access controls |
| Information & Communication | Audit trail, structured logging, incident reporting |
| Monitoring | Automated health checks, periodic audits, hash chain verification |

### 7.2 Segregation of Duties (SoD) Matrix
| Function | Cannot Also Perform |
|----------|-------------------|
| Transaction creation | Transaction approval |
| Journal entry posting | Journal entry reversal approval |
| Reconciliation execution | Discrepancy resolution |
| User onboarding (KYC) | KYC status approval |
| Ledger account creation | Account deactivation |
| Migration authoring | Migration deployment to production |
| Float top-up initiation | Float top-up confirmation |
| SAR preparation | SAR filing decision |
| Code deployment | Production database access |

### 7.3 Material Weakness Detection
A material weakness exists when there is a reasonable possibility that a
material misstatement will not be prevented or detected on a timely basis.

**Auto-detected material weaknesses:**
| Condition | Severity | Response |
|-----------|----------|----------|
| Trial balance variance > R1.00 | CRITICAL | Halt all transactions, page on-call |
| Wallet aggregate ≠ ledger account 20100 | CRITICAL | Halt deposits/withdrawals |
| Audit chain broken (hash mismatch) | CRITICAL | Forensic investigation required |
| Recon match rate < 95% for any supplier | HIGH | Escalate to finance team |
| Journal entry without reference (idempotency gap) | HIGH | Block and review |
| Unresolved discrepancy > 48 hours | MEDIUM | Auto-escalate to management |
| Float balance < supplier minimum threshold | MEDIUM | Alert for top-up |
| SAR not filed within 24 hours of detection | CRITICAL | Compliance violation |
| CDD records missing for active client | HIGH | Suspend account pending CDD |

### 7.4 WORM Storage & Retention
All audit trail entries, journal entries, and reconciliation results MUST be
stored in Write Once Read Many (WORM) mode:

- **Application layer**: No UPDATE/DELETE endpoints for audit data
- **Database layer**: PostgreSQL triggers prevent mutation (see 3.6)
- **Storage layer**: GCS Object Retention Policy on cold-storage exports
- **Retention periods**: See Section 6.2.4 retention table
- **Destruction**: Automated, audited destruction after retention period expires;
  destruction event itself is logged to audit trail

### 7.5 Change Management Controls
| Change Type | Required Controls |
|-------------|------------------|
| Schema migration | Peer review + admin approval + rollback script |
| Production deployment | CI/CD pipeline + Cloud Build (no manual deploys) |
| Environment variable change | Documented in deployment script + audit trail |
| Access permission change | Dual authorization + audit trail event |
| Financial configuration change | Board/management approval + versioned config |

---

## 8. Structured Audit Workflow (PASS / WARN / FAIL)

> Adopted from CFO Stack /cfo-audit pattern and enhanced for banking-grade
> requirements. This workflow is the standard for all periodic audits.

### 8.1 Audit Principles
- **NEVER modify the ledger during an audit** -- report only
- **ALWAYS report every finding**, even minor ones
- **Distinguish PASS / WARN / FAIL** clearly with specific references
- **Every finding must include** the exact transaction/entry reference
- **Audit results are themselves audited** -- logged to the audit trail

### 8.2 Six-Step Audit Workflow

#### Step 1: Structural Validation
```
[ ] Trial balance is balanced (Σ debits = Σ credits, variance < R0.01)
[ ] All ledger accounts have correct type and normalSide
[ ] No orphaned journal lines (missing parent JournalEntry)
[ ] No journal entries with unbalanced lines
[ ] All balance assertions hold
[ ] Database schema matches expected migration state
```

#### Step 2: Completeness Check
```
[ ] Every day in the audit period has transactions (no unexplained gaps)
[ ] All bank accounts have daily balance snapshots
[ ] All expected revenue sources have transactions
[ ] All VAS suppliers have reconciliation runs for every business day
[ ] Commission and VAT journal entries exist for every purchase transaction
[ ] Referral earnings have matching REFERRAL-% journal entries
[ ] Float top-ups have matching journal entries
```

#### Step 3: Accuracy Check
```
[ ] No duplicate transactions (same date + amount + reference + payee)
[ ] No transactions with missing or null amounts
[ ] All wallet balances >= 0 (no negative wallet balances)
[ ] User wallet aggregate matches ledger account 20100
[ ] Float balances match corresponding ledger accounts
[ ] Commission amounts match supplier commission configuration
[ ] VAT calculated at exactly 15% on VAT-applicable commissions
[ ] EasyPay deposit amounts match bank statement credits
[ ] RTP (Request to Pay) amounts match Standard Bank credits
```

#### Step 4: Anomaly Detection
```
[ ] No unusually large transactions (> 3x typical for category)
[ ] No transactions outside business hours that seem unlikely
[ ] No round-number transactions that might be estimates (> R10,000)
[ ] No duplicate references across different journal entries
[ ] No wallet balance changes without corresponding journal entries
[ ] Supplier failover events reviewed (circuit breaker activations)
[ ] Velocity checks: no user exceeding transaction limits
```

#### Step 5: Compliance Check
```
[ ] FICA: All active users have completed CDD (no CDD gaps)
[ ] FICA: Cash threshold reports filed for aggregate deposits > R24,999.99
[ ] FICA: Suspicious activity detected and reported within 24 hours
[ ] POPIA: No personal information in application logs
[ ] POPIA: Data subject requests processed within 30-day SLA
[ ] POPIA: Retention policies enforced (no data held beyond period)
[ ] SARB: Transaction volumes reported as required
[ ] Audit trail: Hash chain integrity verified for all domains
[ ] Audit trail: No gaps in monotonic ordering
[ ] Segregation of duties: No SoD violations in the period
```

#### Step 6: Audit Report Generation
```
AUDIT REPORT — MyMoolah Treasury Platform
Period: [start_date] to [end_date]
Generated: [timestamp] by [auditor]
═══════════════════════════════════════════════════════
STRUCTURAL:     [PASS|WARN|FAIL]  ([n] accounts, [m] journal entries)
COMPLETENESS:   [PASS|WARN|FAIL]  ([x]/[y] days covered, [z]% coverage)
ACCURACY:       [PASS|WARN|FAIL]  ([n] checks passed, [m] warnings)
ANOMALIES:      [PASS|WARN|FAIL]  ([n] flagged for review)
COMPLIANCE:     [PASS|WARN|FAIL]  ([n] FICA/POPIA checks passed)
AUDIT TRAIL:    [PASS|WARN|FAIL]  ([n] events verified, chain intact)

OVERALL: [PASS|WARN|FAIL] with [n] warning(s) and [m] action(s) needed

CRITICAL FINDINGS:
1. [Finding with specific transaction/entry reference]

WARNINGS:
1. [Warning with specific reference]

ACTIONS NEEDED:
1. [Action with deadline and responsible party]
```

### 8.3 Audit Scoring Rules
| Score | Criteria |
|-------|---------|
| **PASS** | All checks pass, no findings |
| **WARN** | Minor findings that don't affect financial integrity (cosmetic, timing) |
| **FAIL** | Any finding that affects financial integrity, compliance, or data accuracy |

**Automatic FAIL conditions (non-negotiable):**
- Trial balance variance > R0.01
- Wallet aggregate ≠ ledger account
- Broken audit chain (hash mismatch)
- Journal entry with unbalanced lines
- Missing FICA CDD for active transacting user
- SAR not filed within required timeframe
- Negative wallet balance

---

## 9. Automated Health Checks

### 9.1 Critical Checks (Run Every Hour)
```
[ ] Trial balance is balanced (debits = credits)
[ ] No journal entries with imbalanced lines
[ ] No orphaned journal lines (missing parent entry)
[ ] User wallet aggregate = Ledger account 20100
[ ] No transactions in indeterminate state > 15 minutes
[ ] No negative wallet balances
[ ] Audit trail hash chain valid for last 100 events per domain
```

### 9.2 Daily Checks
```
[ ] Float balances match ledger accounts
[ ] All scheduled recon runs completed
[ ] Recon match rate >= 99% for all suppliers
[ ] Amount variance within threshold for all suppliers
[ ] Audit trail chain integrity verified (full day)
[ ] No unresolved discrepancies > 24 hours old
[ ] Commission/VAT journal entries match transaction records
[ ] FICA CTR threshold monitoring (aggregate daily cash deposits)
[ ] No PII detected in application log files
```

### 9.3 Weekly Checks
```
[ ] Bank statement reconciliation complete (MT940/MT942)
[ ] Commission/fee income reconciled across all suppliers
[ ] Aging analysis of unmatched transactions
[ ] ML anomaly review and false-positive tuning
[ ] Audit trail hash chain full verification (all domains)
[ ] Supplier float balance adequacy check
[ ] POPIA data subject request SLA compliance
```

### 9.4 Monthly Checks
```
[ ] Full trial balance report generated and archived
[ ] SARB transaction volume reporting prepared
[ ] FICA RMCP effectiveness review
[ ] Segregation of duties compliance verification
[ ] Data retention policy enforcement (purge expired data)
[ ] Penetration test / vulnerability scan results reviewed
[ ] Backup and disaster recovery test
```

### 9.5 Annual Checks
```
[ ] Full external audit support package prepared
[ ] FICA RMCP annual review and update
[ ] POPIA impact assessment review
[ ] Insurance adequacy review
[ ] Business continuity plan test
[ ] Complete audit trail archive to cold storage (GCS WORM)
```

### 9.6 Cloud Scheduler Integration

MMTP uses Google Cloud Scheduler (not node-cron) for automated tasks on Cloud
Run, because Cloud Run kills idle instances mid-sweep. Scheduled endpoints
use OIDC authentication.

**Scheduled Audit-Related Jobs:**
| Job | Schedule | Endpoint | Timeout |
|-----|----------|----------|---------|
| VAS catalog sync + view refresh | Daily 02:00 SAST | `POST /api/v1/catalog/scheduled-sync` | 1800s |
| Referral payout processing | Daily 02:15 SAST | `POST /api/v1/referrals/scheduled-payout` | 300s |
| Reconciliation runs | Per-supplier schedule | Supplier-specific endpoints | 600s |

**Pattern for New Scheduled Audits:**
```javascript
// 1. Create authenticated endpoint
router.post('/api/v1/audit/scheduled-health-check',
  requireCloudSchedulerAuth,  // OIDC token validation
  async (req, res) => {
    const results = await runHealthChecks();
    // Log results to audit trail
    await logAuditEvent('SCHEDULED_HEALTH_CHECK', results);
    res.json({ success: true, results });
  }
);

// 2. Create Cloud Scheduler job via gcloud
// gcloud scheduler jobs create http mmtp-daily-health-check \
//   --schedule="0 3 * * *" \
//   --uri="https://api-mm.mymoolah.africa/api/v1/audit/scheduled-health-check" \
//   --http-method=POST \
//   --oidc-service-account-email=cloud-scheduler@mmtp-*.iam.gserviceaccount.com \
//   --oidc-audience="https://api-mm.mymoolah.africa" \
//   --time-zone="Africa/Johannesburg" \
//   --attempt-deadline=1800s
```

---

## 10. Error Handling & Recovery

### 10.1 Compensating Transactions
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
      dc: line.dc === 'debit' ? 'credit' : 'debit',
      amount: line.amount,
      memo: `Reversal of ${originalRef}: ${reason}`
    }));

    await JournalLine.bulkCreate(reversedLines, { transaction: t });
    return reversal;
  });
}
```

### 10.2 Suspense Account Usage
When a transaction cannot be immediately classified:
1. Post to `20500 - Suspense Account`
2. Create an audit trail event `SUSPENSE_ENTRY_CREATED`
3. Set an alarm for manual review within 24 hours
4. Upon resolution, post a correcting entry to move from suspense to correct account

### 10.3 Incident Response Escalation Matrix
| Severity | Response Time | Notification | Examples |
|----------|--------------|-------------|---------|
| **P1 - CRITICAL** | Immediate (< 15 min) | CTO + Compliance Officer | Ledger imbalance, data breach, SAR deadline |
| **P2 - HIGH** | < 1 hour | Engineering Lead | Recon failure, float depletion, SoD violation |
| **P3 - MEDIUM** | < 4 hours | On-call engineer | Supplier failover, anomaly detected |
| **P4 - LOW** | Next business day | Team channel | Cosmetic discrepancy, timing difference |

---

## 11. Code Review Checklist

When reviewing any PR that touches financial code, verify:

### Financial Integrity
- [ ] All monetary values use `DECIMAL`, never `FLOAT` or `DOUBLE`
- [ ] All journal entries are created within `sequelize.transaction()`
- [ ] Every journal entry passes balance validation (Σ debits = Σ credits)
- [ ] `reference` field is set for idempotency on journal entries
- [ ] No UPDATE or DELETE operations on journal_entries or journal_lines tables
- [ ] Monetary arithmetic uses integer cents or `Decimal` library, not JS floats
- [ ] Currency is explicitly tracked (ZAR vs USDC)

### Audit Trail
- [ ] Audit trail event created for every financial state change
- [ ] Event hash and previous_event_hash are computed correctly
- [ ] Monotonic ordering maintained within audit domain
- [ ] No UPDATE or DELETE operations on recon_audit_trail table

### Compliance
- [ ] Error paths include compensating transactions or suspense entries
- [ ] Float/wallet balance changes are reconcilable to journal entries
- [ ] Recon discrepancies are classified and logged
- [ ] Settlement amounts are validated against position calculations
- [ ] Rate limiting / idempotency keys prevent duplicate transactions
- [ ] All financial endpoints require authentication and authorization
- [ ] Sensitive data (account numbers, balances) is not logged in plaintext
- [ ] PII is redacted from all log output (POPIA Section 19)
- [ ] FICA reporting thresholds are checked where applicable
- [ ] Data retention periods are respected (no indefinite storage)

### Security
- [ ] Parameterized queries only (no string interpolation in SQL)
- [ ] Input validation at API boundary
- [ ] JWT authentication with HS512
- [ ] RBAC authorization checked before financial operations
- [ ] No secrets or credentials in code or logs

---

## 12. MyMoolah-Specific Architecture Reference

### 12.1 Key Models
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
| `Wallet` | `models/Wallet.js` | User wallet balances (SELECT FOR UPDATE) |
| `v_best_offers` | Materialized view (SQL) | Commission-based supplier selection for VAS products; auto-refreshed after catalog sync |
| `ProductVariant` | `models/ProductVariant.js` | Normalized VAS product variants with supplier pricing |
| `ProductSelectionRule` | `product_selection_rules` table | Rules for selecting winning supplier per VAS category |

### 12.2 Financial Flow Architecture
```
                           ┌─────────────────────────────┐
                           │    South African Regulators  │
                           │  (FIC, SARB, FSCA, InfoReg)  │
                           └──────────┬──────────────────┘
                                      │ Reporting
                                      │ (SAR, CTR, Volumes)
                 ┌────────────────────┐│
                 │  External Providers ││
                 │  (EasyPay, Flash,  ││
                 │   MobileMart, SBSA)││
                 └─────────┬──────────┘│
                           │           │
                   ┌───────▼───────┐   │
                   │  Integration  │───┤── Reconciliation Engine
                   │    Layer      │   │   (ReconRun + N-Way Matching)
                   └───────┬───────┘   │
                           │           │
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
              │  Immutable Audit Trail  │
              │  (SHA-256 Hash Chain)   │
              │  ┌───────────────────┐  │
              │  │ WORM Storage      │  │
              │  │ Monotonic Order   │  │
              │  │ Actor Tracking    │  │
              │  │ FICA/POPIA Events │  │
              │  └───────────────────┘  │
              └────────────┬────────────┘
                           │
              ┌────────────▼────────────┐
              │  Compliance & Controls  │
              │  ┌───────────────────┐  │
              │  │ FICA CDD/EDD/SAR │  │
              │  │ POPIA Safeguards  │  │
              │  │ SoD Enforcement   │  │
              │  │ Material Weakness │  │
              │  │ Health Checks     │  │
              │  └───────────────────┘  │
              └─────────────────────────┘
```

---

## 13. Quick Reference Commands

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

### FICA Threshold Monitoring (Daily Cash Deposits per User)
```sql
SELECT
  t."userId",
  u."phoneNumber",
  DATE(t."createdAt") as txn_date,
  COUNT(*) as deposit_count,
  SUM(t.amount) as total_deposits
FROM "MyMoolahTransactions" t
JOIN users u ON u.id = t."userId"
WHERE t.type = 'deposit'
  AND t."createdAt" >= CURRENT_DATE
  AND t.status = 'completed'
GROUP BY t."userId", u."phoneNumber", DATE(t."createdAt")
HAVING SUM(t.amount) > 24999.99
ORDER BY total_deposits DESC;
-- Clients exceeding R24,999.99 aggregate daily deposits require CTR filing
```

### POPIA PII Scan (Log Files)
```bash
# Detect potential PII leaks in application logs
# Run weekly as part of POPIA Section 19 safeguard verification
rg -i '(0[6-8][0-9]{8}|27[6-8][0-9]{8}|\b[A-Z]{2}[0-9]{6,13}\b)' logs/ \
  --glob '*.log' --count
# Expected: 0 matches (all PII should be redacted)
```

### Wallet Aggregate vs Ledger
```sql
SELECT
  (SELECT SUM(balance) FROM wallets WHERE balance > 0) as wallet_sum,
  (SELECT
    SUM(CASE WHEN jl.dc = 'credit' THEN jl.amount ELSE 0 END) -
    SUM(CASE WHEN jl.dc = 'debit' THEN jl.amount ELSE 0 END)
   FROM journal_lines jl
   JOIN ledger_accounts la ON la.id = jl."accountId"
   WHERE la.code LIKE '2100%'
  ) as ledger_balance,
  (SELECT SUM(balance) FROM wallets WHERE balance > 0) -
  (SELECT
    SUM(CASE WHEN jl.dc = 'credit' THEN jl.amount ELSE 0 END) -
    SUM(CASE WHEN jl.dc = 'debit' THEN jl.amount ELSE 0 END)
   FROM journal_lines jl
   JOIN ledger_accounts la ON la.id = jl."accountId"
   WHERE la.code LIKE '2100%'
  ) as variance;
-- Expected: variance = 0.00
```

---

## 14. Production Audit Script Reference

MyMoolah has a comprehensive production audit script at `scripts/production-full-audit.js`
that implements many of the checks described in this skill. Run it with:

```bash
node scripts/production-full-audit.js --uat        # UAT environment
node scripts/production-full-audit.js --staging     # Staging environment
node scripts/production-full-audit.js --production  # Production environment
```

The script performs:
- Double-entry balance verification (Σ debits = Σ credits)
- Trial balance computation across all account types
- Wallet aggregate vs ledger reconciliation (with correct sign handling)
- Supplier float balance verification
- Commission and VAT reconciliation
- Tax pass-through analysis (including RTP fee handling)
- Referral earnings vs journal entry reconciliation
- Internal voucher leg validation (MyMoolah-issued vs outbound)
- VAS transaction completeness via walletTransactionId linkage
- Treasury narrative with operator facts

All agents should be familiar with this script and its output format.

---

## 15. Agent Optimization (Claude Opus 4.6 / Cursor)

This skill is optimized for Claude Opus 4.6 with extended thinking in Cursor IDE.

### 15.1 Structured Audit Prompting
When running audits, use this pattern for maximum accuracy:

1. **Anchor assertions first**: State the invariant being checked before querying
2. **Use explicit checklists**: Reference Section 8.2 step numbers (e.g., "Step 3, Check 4")
3. **Show your work**: For balance checks, show the SQL, the result, and the PASS/WARN/FAIL determination
4. **One domain at a time**: Don't mix ledger checks with compliance checks in a single reasoning chain

### 15.2 Subagent Delegation for Large Audits
For full platform audits, delegate to parallel subagents:

| Subagent | Scope | Files to Read |
|----------|-------|--------------|
| Structural | Trial balance, orphaned entries | `scripts/production-full-audit.js` |
| Compliance | FICA/POPIA checks | `services/kycService.js`, `controllers/kycController.js` |
| Reconciliation | Supplier match rates | `services/reconService.js`, `models/ReconRun.js` |
| Commission | VAT/commission accuracy | `services/commissionVatService.js`, `config/supplier-commissions.json` |

### 15.3 Common Audit Commands
```bash
# Full audit (all checks)
node scripts/production-full-audit.js --production

# Quick ledger balance check
node scripts/production-full-audit.js --uat 2>&1 | head -30

# Verify specific account balance
node -e "const {getUATClient}=require('./scripts/db-connection-helper'); (async()=>{const c=await getUATClient(); const r=await c.query(\"SELECT code, name FROM ledger_accounts WHERE code LIKE '2100%'\"); console.table(r.rows); c.release();})()"
```

### 15.4 Skill Activation Triggers
This skill should be read by the agent when the task involves ANY of:
- Ledger accounts, journal entries, or journal lines
- Reconciliation runs or transaction matching
- Float management or settlement processing
- Financial transactions (deposits, withdrawals, transfers, purchases)
- Audit trails, compliance checks, or forensic logging
- FICA CDD/EDD, SAR, or KYC status changes
- POPIA data requests or breach handling
- Commission/VAT calculations or reporting
- Chart of Accounts changes or new product registration
- Running `production-full-audit.js`
