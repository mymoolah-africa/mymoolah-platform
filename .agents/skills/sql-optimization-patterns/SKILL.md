---
name: sql-optimization-patterns
description: Master SQL query optimization, indexing strategies, and EXPLAIN analysis to dramatically improve database performance and eliminate slow queries. Use when debugging slow queries, designing database schemas, or optimizing application performance.
---

# MyMoolah SQL Optimization Patterns

Practical SQL optimization patterns for MyMoolah's PostgreSQL database with Sequelize
ORM. Focus on financial transaction queries, ledger aggregations, reconciliation
reports, and high-throughput wallet operations.

## When This Skill Activates

- Debugging slow Sequelize or raw SQL queries
- Designing migrations for new financial tables
- Building transaction history, reconciliation, or settlement reports
- Optimizing N+1 patterns in Express controllers
- Analyzing EXPLAIN output for production queries

---

## 1. EXPLAIN Analysis

### How to Read PostgreSQL EXPLAIN Output
```sql
EXPLAIN (ANALYZE, BUFFERS, FORMAT TEXT)
SELECT t.id, t.amount, t.type, t."createdAt"
FROM mymoolah_transactions t
WHERE t."walletId" = 42
  AND t.status = 'completed'
  AND t."createdAt" >= '2026-01-01'
ORDER BY t."createdAt" DESC
LIMIT 20;
```

**Key Metrics:**
| Metric | Good | Bad |
|--------|------|-----|
| Scan Type | Index Scan, Index Only Scan | Seq Scan on large table |
| Rows | Estimated ≈ Actual | Estimate off by 10x+ |
| Buffers | Shared hit >> shared read | Many shared reads (cache miss) |
| Sort | Index-provided sort | Sort using disk (external merge) |
| Loops | 1 | Many loops (nested loop join on unindexed) |

---

## 2. MyMoolah Query Optimization Patterns

### Pattern 1: Wallet Transaction History (Cursor Pagination)
```sql
-- ❌ SLOW: OFFSET on large table
SELECT * FROM mymoolah_transactions
WHERE "walletId" = 42
ORDER BY "createdAt" DESC
OFFSET 10000 LIMIT 20;

-- ✅ FAST: Cursor-based (use last item's composite key)
SELECT * FROM mymoolah_transactions
WHERE "walletId" = 42
  AND ("createdAt", id) < ('2026-02-15 10:30:00', 54321)
ORDER BY "createdAt" DESC, id DESC
LIMIT 20;

-- Required supporting index:
CREATE INDEX idx_tx_wallet_cursor
  ON mymoolah_transactions("walletId", "createdAt" DESC, id DESC);
```

### Pattern 2: Wallet Balance Calculation
```sql
-- ❌ SLOW: Calculate from all transactions every time
SELECT SUM(CASE WHEN type IN ('deposit','receive','reward') THEN amount ELSE -amount END)
FROM mymoolah_transactions
WHERE "walletId" = 42 AND status = 'completed';

-- ✅ FAST: Use materialized balance + recent transactions
-- Keep a balance snapshot in the Wallet model (updated on each transaction)
-- Only query recent adjustments if needed for verification:
SELECT w.balance AS snapshot_balance,
  COALESCE(SUM(CASE
    WHEN t.type IN ('deposit','receive','reward') THEN t.amount
    ELSE -t.amount
  END), 0) AS adjustments_since_snapshot
FROM wallets w
LEFT JOIN mymoolah_transactions t
  ON t."walletId" = w.id
  AND t.status = 'completed'
  AND t."createdAt" > w."balanceSnapshotAt"
WHERE w.id = 42
GROUP BY w.id, w.balance;
```

### Pattern 3: Reconciliation Summary Report
```sql
-- Efficient reconciliation summary using conditional aggregation
SELECT
  rsc.name AS supplier,
  COUNT(rr.id) AS total_runs,
  COUNT(CASE WHEN rr.status = 'completed' THEN 1 END) AS completed,
  COUNT(CASE WHEN rr.status = 'failed' THEN 1 END) AS failed,
  AVG(rr.matched_exact + rr.matched_fuzzy)::NUMERIC(10,1) AS avg_matched,
  AVG(rr.unmatched_mmtp + rr.unmatched_supplier)::NUMERIC(10,1) AS avg_unmatched,
  SUM(rr.amount_variance) AS total_variance,
  AVG(rr.processing_time_ms) AS avg_processing_ms
FROM recon_runs rr
JOIN recon_supplier_configs rsc ON rr.supplier_id = rsc.id
WHERE rr.completed_at >= NOW() - INTERVAL '30 days'
GROUP BY rsc.id, rsc.name
ORDER BY total_runs DESC;
```

### Pattern 4: Commission Revenue by Product (Time Series)
```sql
SELECT
  DATE_TRUNC('week', t."createdAt") AS week,
  p.category,
  COUNT(*) AS transactions,
  SUM(t.amount) AS volume,
  SUM(t.commission) AS commission,
  SUM(t.commission)::NUMERIC / NULLIF(SUM(t.amount), 0) * 100 AS margin_pct
FROM mymoolah_transactions t
JOIN products p ON t."productId" = p.id
WHERE t."createdAt" >= NOW() - INTERVAL '12 weeks'
  AND t.status = 'completed'
GROUP BY week, p.category
ORDER BY week DESC, commission DESC;
```

### Pattern 5: Ledger Account Balance at Date
```sql
-- Balance as of a specific date (for period-end reporting)
SELECT
  la.code, la.name,
  SUM(CASE WHEN jl.dc = 'debit' THEN jl.amount ELSE -jl.amount END) AS net_balance
FROM ledger_accounts la
JOIN journal_lines jl ON la.id = jl."accountId"
JOIN journal_entries je ON jl."entryId" = je.id
WHERE la."isActive" = true
  AND je."postedAt" <= '2026-02-28 23:59:59'
GROUP BY la.id, la.code, la.name
ORDER BY la.code;
```

---

## 3. Sequelize ORM Optimization

### Avoid N+1 with Include/Eager Loading
```javascript
// ❌ N+1: One query per journal entry to get lines
const entries = await JournalEntry.findAll();
for (const entry of entries) {
  entry.lines = await JournalLine.findAll({ where: { entryId: entry.id } });
}

// ✅ Single query with eager loading
const entries = await JournalEntry.findAll({
  include: [{ model: JournalLine, as: 'lines' }],
  order: [['postedAt', 'DESC']],
  limit: 50
});
```

### Select Only Needed Columns
```javascript
// ❌ BAD: Fetches all columns including heavy JSONB
const runs = await ReconRun.findAll();

// ✅ GOOD: Only select needed columns
const runs = await ReconRun.findAll({
  attributes: ['run_id', 'status', 'matched_exact', 'matched_fuzzy', 'amount_variance', 'completed_at'],
  where: { status: 'completed' },
  order: [['completed_at', 'DESC']],
  limit: 20
});
```

### Batch Operations
```javascript
// ❌ BAD: Individual creates in a loop
for (const line of journalLines) {
  await JournalLine.create(line, { transaction: t });
}

// ✅ GOOD: Bulk create
await JournalLine.bulkCreate(journalLines, {
  transaction: t,
  validate: true
});
```

### Efficient COUNT
```javascript
// ❌ BAD: Fetches all rows just to count
const transactions = await MyMoolahTransaction.findAll({ where: { walletId } });
const count = transactions.length;

// ✅ GOOD: Database-level count
const count = await MyMoolahTransaction.count({ where: { walletId } });
```

---

## 4. Indexing Strategy

### When to Add an Index
- Column appears in WHERE clause frequently
- Column used in JOIN conditions
- Column used in ORDER BY (avoids sort operations)
- Column has high cardinality (many distinct values)

### When NOT to Index
- Tables with < 1000 rows (sequential scan is fine)
- Columns updated very frequently (index overhead)
- Low cardinality columns (e.g., boolean status) — use partial index instead
- Already covered by a composite index

### Partial Indexes for Financial Tables
```sql
-- Only index pending/processing transactions (small subset, queried often)
CREATE INDEX idx_tx_pending ON mymoolah_transactions(status, "createdAt")
  WHERE status IN ('pending', 'processing');

-- Only index active ledger accounts
CREATE INDEX idx_active_accounts ON ledger_accounts(code)
  WHERE "isActive" = true;
```

---

## 5. Common Anti-Patterns

| Anti-Pattern | Problem | Fix |
|-------------|---------|-----|
| `SELECT *` | Fetches unnecessary columns | Select only needed columns |
| `OFFSET 10000` | Scans and discards 10K rows | Cursor-based pagination |
| Function in WHERE | Prevents index use | Functional index or compute ahead |
| `OR` conditions | Can't use single index | `UNION ALL` or separate queries |
| Correlated subquery | Runs once per row | JOIN with aggregation |
| Missing transaction | Partial writes on error | Wrap in `sequelize.transaction()` |

---

## 6. Optimization Checklist

- [ ] Run EXPLAIN ANALYZE on all queries touching > 10K rows
- [ ] No `SELECT *` in production code (specify columns)
- [ ] Cursor-based pagination for user-facing lists
- [ ] Complex reports use raw SQL with bind parameters
- [ ] Eager loading used to prevent N+1 patterns
- [ ] Bulk operations for batch inserts/updates
- [ ] Partial indexes on filtered query patterns
- [ ] Composite indexes match query column order
- [ ] Financial aggregations include proper NULL handling (COALESCE)
- [ ] All monetary arithmetic uses DECIMAL, never FLOAT
