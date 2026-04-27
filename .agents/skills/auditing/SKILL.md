---
name: banking-grade-auditing
version: 2.2.0
description: >
  Banking-grade ledger, reconciliation, VAT, settlement, float, audit-trail,
  and South African compliance guidance for MyMoolah. Use for journal entries,
  ledger accounts, wallet-vs-ledger reconciliation, production audit analysis,
  VAT/pass-through decisions, settlement, FICA/POPIA/SARB controls, or financial
  data integrity work. Prefer narrower DB/migration/testing skills first when the
  task is only query tuning, DDL, or test writing.
tags:
  - audit
  - compliance
  - ledger
  - reconciliation
  - vat
  - mojaloop
  - banking
  - south-africa
---

# Banking-Grade Auditing

## Use This Skill When

Use this skill for any task involving:
- Ledger accounts, journal entries, journal lines, trial balance, or Chart of Accounts.
- Wallet aggregate vs ledger reconciliation, supplier float, client float, settlement, or suspense.
- VAT treatment, pass-through fees, commissions, markups, or TaxTransaction logic.
- Production audit output from `scripts/production-full-audit.js`.
- FICA, POPIA, SARB/FSCA, Mojaloop, IFRS, or internal financial controls.
- Financial data correction recommendations.

Use a narrower skill instead when appropriate:
- Query performance only: `sql-optimization-patterns` or `postgresql-optimization`.
- Schema changes: `safe-database-migrations` plus this skill if money movement is affected.
- Test writing: `fintech-test-driven-development` plus this skill for ledger invariants.

## Non-Negotiable Invariants

1. Every persisted financial event must balance: `SUM(debits) = SUM(credits)` per `JournalEntry`.
2. Wallet balance changes must reconcile to journal lines, never exist as wallet-only mutations.
3. Use immutable correction journals for historical production fixes. Do not update/delete old ledger rows unless André explicitly approves a destructive action.
4. MMTP VAT control applies only to MMTP-owned revenue, markup, or commission. Supplier, bank, client, and merchant pass-through charges are VAT-inclusive clearing/payable amounts unless MMTP is principal.
5. Parameterized SQL only. For direct DB scripts/queries use `scripts/db-connection-helper.js`.
6. Logs and reports must redact PII; do not print phone numbers, names, ID numbers, or addresses unless already masked and required for audit evidence.

## Canonical References

Read these before making financial assertions:
- `docs/CHART_OF_ACCOUNTS.md` — canonical account codes and journal templates.
- `docs/VAT_ACCOUNTING_STRATEGY.md` — VAT/pass-through policy.
- `docs/DATABASE_CONNECTION_GUIDE.md` — DB connection rules before querying.
- `scripts/production-full-audit.js` — current automated audit implementation.
- `config/supplier-commissions.json` and `v_best_offers` — VAS commission selection.
- `reference-full.md` — detailed legacy reference material for compliance depth.

## Core Account Anchors

Always verify real account rows before coding. Common anchors:
- `1100-01-01` — Standard Bank Current Account.
- `1200-10-04` / `1200-10-05` — Flash / MobileMart supplier float.
- `2100-01-01` — User Wallet ZAR client float liability.
- `2200-02-01` — SBSA / supplier clearing for pass-through fees.
- `2600-01-01` — Unallocated Suspense.
- `4100-10-01` / `4100-10-02` — VAS commission revenue.
- `2300-10-01` — VAT control for MMTP output VAT only.

## Audit Workflow

1. State the invariant being checked.
2. Read the relevant docs/code path before querying.
3. Use SELECT-only diagnostics first for production issues.
4. Separate false-positive audit-script logic from real data discrepancies.
5. Classify each finding as `PASS`, `WARN`, or `FAIL`:
   - `FAIL`: broken balance, orphaned wallet mutation, missing required journal, unreconciled money movement.
   - `WARN`: statistical anomaly, missing non-critical audit enrichment, expected legacy pattern.
   - `PASS`: invariant holds with documented evidence.
6. Recommend correction journals, not row mutation, for historical ledger gaps.
7. Ask André for explicit approval before any production write.

## VAT / Pass-Through Checklist

Before creating VAT control or `tax_transactions` rows, confirm:
- Is MMTP earning margin, markup, commission, or own service fee?
- Is MMTP principal for the taxable supply, or only agent/collector for a supplier/bank fee?
- Does the journal credit MMTP revenue? If not, VAT control is usually wrong.
- Is supplier VAT only informational? If yes, post the gross pass-through to clearing/payable.
- Does the audit script already model this flow? Update the script if the policy changed.

## Production Audit Commands

Run from repo root only:

```bash
node scripts/production-full-audit.js --uat
node scripts/production-full-audit.js --staging
node scripts/production-full-audit.js --production
```

For ad hoc queries, use `db-connection-helper.js` and parameterized SQL. Never write custom pools.

## Review Checklist

- [ ] Journal entries balance exactly to cents.
- [ ] Wallet aggregate reconciles to `2100-01-01` with correct sign handling.
- [ ] Supplier/client float movements reconcile to source transactions.
- [ ] VAT only exists for MMTP-owned revenue/markup/commission.
- [ ] Correction scripts are dry-run first, idempotent, and non-destructive.
- [ ] Production writes have explicit André approval.
- [ ] PII is masked in logs and reports.
- [ ] Session docs capture any audit decision or correction.
