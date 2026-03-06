---
name: postgresql-optimization
description: PostgreSQL-specific optimization for MyMoolah's financial database. Covers ledger queries, reconciliation aggregates, JSONB operations, Sequelize ORM patterns, indexing strategy, and connection pooling for Cloud SQL.
---

# MyMoolah PostgreSQL Optimization

PostgreSQL-specific optimization for MyMoolah's financial database including ledger
queries, reconciliation aggregates, transaction search, JSONB event data, and
Sequelize ORM integration. All MyMoolah tables use PostgreSQL with Sequelize.

> **Database Infrastructure**:
> - **Cloud SQL** (PostgreSQL 15) on Google Cloud
> - **Access**: Cloud SQL Auth Proxy (UAT: 6543, Staging: 6544, Production: 6545)
> - **ORM**: Sequelize v6 with camelCase model attributes
> - **Key Tables**: `mymoolah_transactions`, `journal_entries`, `journal_lines`,
>   `ledger_accounts`, `wallets`, `flash_transactions`, `vas_transactions`,
>   `recon_runs`, `recon_transaction_matches`, `recon_audit_trail`
> - **JSONB Usage**: `vas_transactions.metadata` (Flash API responses),
>   `recon_runs.discrepancies`, `recon_audit_trail.event_data`

## When This Skill Activates

- Writing Sequelize queries for financial data
- Optimizing slow ledger or transaction queries
- Designing database migrations (migrations/*.js)
- Working with JSONB columns (metadata, discrepancies, event_data)
- Building reconciliation reports or settlement calculations
- Indexing strategy for financial tables

---

## 1. MyMoolah Critical Table Indexes

### Ledger & Journal Indexes
```sql
-- Journal entries: query by date range and reference
CREATE INDEX idx_journal_entries_posted ON journal_entries(postedAt DESC);
CREATE UNIQUE INDEX idx_journal_entries_ref ON journal_entries(reference) WHERE reference IS NOT NULL;

-- Journal lines: balance calculations per account
CREATE INDEX idx_journal_lines_account_dc ON journal_lines("accountId", dc);
CREATE INDEX idx_journal_lines_entry ON journal_lines("entryId");

-- Covering index for trial balance calculation (avoids table lookup)
CREATE INDEX idx_journal_lines_balance ON journal_lines("accountId", dc, amount)
  INCLUDE ("entryId");
```

### Transaction Indexes
```sql
-- MyMoolah transactions: user wallet queries with cursor pagination
CREATE INDEX idx_transactions_wallet_created ON mymoolah_transactions("walletId", "createdAt" DESC, id DESC);

-- Transaction status filtering
CREATE INDEX idx_transactions_status ON mymoolah_transactions(status)
  WHERE status IN ('pending', 'processing');

-- Flash transactions: supplier reconciliation
CREATE INDEX idx_flash_transactions_recon
  ON flash_transactions(supplier_reference, "createdAt" DESC);

-- EasyPay deposits: matching by reference
CREATE UNIQUE INDEX idx_easypay_reference ON easypay_deposits(payment_reference);
```

### Reconciliation Indexes
```sql
-- Recon runs: query by supplier and status
CREATE INDEX idx_recon_runs_supplier_status ON recon_runs(supplier_id, status, completed_at DESC);

-- Transaction matches: query by run
CREATE INDEX idx_recon_matches_run ON recon_transaction_matches(run_id, match_type);

-- Audit trail: event chain queries
CREATE INDEX idx_audit_trail_run_time ON recon_audit_trail(run_id, event_timestamp ASC);

-- Audit trail: actor queries for compliance
CREATE INDEX idx_audit_trail_actor ON recon_audit_trail(actor_id, event_timestamp DESC);
```

---

## 2. Financial Query Patterns

### Trial Balance (Ledger Balance Check)
```sql
-- Fast trial balance using covering index
SELECT
  la.code, la.name, la.type, la."normalSide",
  COALESCE(SUM(CASE WHEN jl.dc = 'debit' THEN jl.amount ELSE 0 END), 0) AS debits,
  COALESCE(SUM(CASE WHEN jl.dc = 'credit' THEN jl.amount ELSE 0 END), 0) AS credits,
  CASE WHEN la."normalSide" = 'debit'
    THEN COALESCE(SUM(CASE WHEN jl.dc = 'debit' THEN jl.amount ELSE -jl.amount END), 0)
    ELSE COALESCE(SUM(CASE WHEN jl.dc = 'credit' THEN jl.amount ELSE -jl.amount END), 0)
  END AS balance
FROM ledger_accounts la
LEFT JOIN journal_lines jl ON la.id = jl."accountId"
WHERE la."isActive" = true
GROUP BY la.id, la.code, la.name, la.type, la."normalSide"
ORDER BY la.code;
```

### User Wallet Balance History (with Window Functions)
```sql
SELECT
  t.id,
  t.type,
  t.amount,
  t."createdAt",
  SUM(
    CASE WHEN t.type IN ('deposit', 'receive', 'reward')
         THEN t.amount
         ELSE -t.amount
    END
  ) OVER (
    PARTITION BY t."walletId"
    ORDER BY t."createdAt", t.id
  ) AS running_balance
FROM mymoolah_transactions t
WHERE t."walletId" = :walletId
  AND t.status = 'completed'
ORDER BY t."createdAt" DESC, t.id DESC
LIMIT 50;
```

### Daily Transaction Volume & Revenue Report
```sql
SELECT
  DATE(t."createdAt") AS day,
  t.type,
  COUNT(*) AS transaction_count,
  SUM(t.amount) AS total_amount,
  SUM(t.commission) AS total_commission,
  AVG(t.amount) AS avg_amount,
  PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY t.amount) AS median_amount
FROM mymoolah_transactions t
WHERE t."createdAt" >= NOW() - INTERVAL '30 days'
  AND t.status = 'completed'
GROUP BY DATE(t."createdAt"), t.type
ORDER BY day DESC, t.type;
```

### Reconciliation Gap Analysis
```sql
-- Find unreconciled transactions older than 24 hours
WITH unreconciled AS (
  SELECT
    ft.id, ft.reference, ft.amount, ft."createdAt",
    ft.supplier_reference, ft.status,
    NOW() - ft."createdAt" AS age
  FROM flash_transactions ft
  LEFT JOIN recon_transaction_matches rtm ON ft.reference = rtm.mmtp_reference
  WHERE rtm.id IS NULL
    AND ft."createdAt" < NOW() - INTERVAL '24 hours'
    AND ft.status = 'completed'
)
SELECT
  COUNT(*) AS unreconciled_count,
  SUM(amount) AS unreconciled_amount,
  MIN(age) AS newest_gap,
  MAX(age) AS oldest_gap
FROM unreconciled;
```

---

## 3. JSONB Operations (MyMoolah Usage)

### ReconRun Discrepancy Queries
```sql
-- Query JSONB discrepancy data from recon runs
SELECT
  run_id, status,
  discrepancies->>'total_count' AS discrepancy_count,
  discrepancies->>'categories' AS categories,
  jsonb_array_length(discrepancies->'items') AS item_count
FROM recon_runs
WHERE discrepancies IS NOT NULL
  AND (discrepancies->>'total_count')::int > 0
ORDER BY completed_at DESC;

-- GIN index for JSONB queries
CREATE INDEX idx_recon_runs_discrepancies ON recon_runs USING gin(discrepancies);
```

### Audit Trail Event Data Queries
```sql
-- Query specific event types from audit trail
SELECT
  event_id, event_type, actor_id,
  event_data->>'amount' AS amount,
  event_data->>'currency' AS currency,
  event_data->>'walletId' AS wallet_id
FROM recon_audit_trail
WHERE event_type = 'USER_WALLET_CREDITED'
  AND event_data @> '{"currency": "ZAR"}'
  AND event_timestamp >= NOW() - INTERVAL '7 days'
ORDER BY event_timestamp DESC;
```

---

## 4. Sequelize ORM Optimization

### Avoid N+1 Queries with Eager Loading
```javascript
// ❌ BAD: N+1 queries
const entries = await JournalEntry.findAll();
for (const entry of entries) {
  const lines = await JournalLine.findAll({ where: { entryId: entry.id } });
}

// ✅ GOOD: Eager loading
const entries = await JournalEntry.findAll({
  include: [{
    model: JournalLine, as: 'lines',
    include: [{ model: LedgerAccount, as: 'account', attributes: ['code', 'name'] }]
  }],
  where: { postedAt: { [Op.gte]: startDate } },
  order: [['postedAt', 'DESC']],
  limit: 50
});
```

### Use Raw Queries for Complex Aggregations
```javascript
// Trial balance is too complex for Sequelize's query builder — use raw SQL
const [trialBalance] = await sequelize.query(`
  SELECT la.code, la.name, la.type, la."normalSide",
    COALESCE(SUM(CASE WHEN jl.dc = 'debit' THEN jl.amount ELSE 0 END), 0) AS debits,
    COALESCE(SUM(CASE WHEN jl.dc = 'credit' THEN jl.amount ELSE 0 END), 0) AS credits
  FROM ledger_accounts la
  LEFT JOIN journal_lines jl ON la.id = jl."accountId"
  WHERE la."isActive" = true
  GROUP BY la.id
  ORDER BY la.code
`, { type: QueryTypes.SELECT });
```

### Connection Pooling Configuration
```javascript
// config/database.js — MyMoolah production settings
const sequelize = new Sequelize(process.env.DATABASE_URL, {
  dialect: 'postgres',
  pool: {
    max: 20,        // Max connections (adjust per server)
    min: 5,         // Keep 5 warm connections
    acquire: 30000, // Wait 30s for connection before error
    idle: 10000     // Release idle connections after 10s
  },
  dialectOptions: {
    ssl: process.env.DATABASE_SSL === 'true' ? { rejectUnauthorized: false } : false,
    statement_timeout: 30000,  // Kill queries running > 30s
    idle_in_transaction_session_timeout: 60000 // Kill idle transactions > 60s
  },
  logging: process.env.NODE_ENV === 'production' ? false : console.log
});
```

---

## 5. Table Partitioning (Large Tables)

### Partition Transactions by Month
```sql
-- For tables exceeding 10M+ rows
CREATE TABLE mymoolah_transactions (
  id SERIAL,
  "walletId" INTEGER NOT NULL,
  amount DECIMAL(18,2) NOT NULL,
  type VARCHAR(50) NOT NULL,
  status VARCHAR(50) NOT NULL,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (id, "createdAt")
) PARTITION BY RANGE ("createdAt");

-- Create monthly partitions
CREATE TABLE transactions_2026_01 PARTITION OF mymoolah_transactions
  FOR VALUES FROM ('2026-01-01') TO ('2026-02-01');
CREATE TABLE transactions_2026_02 PARTITION OF mymoolah_transactions
  FOR VALUES FROM ('2026-02-01') TO ('2026-03-01');

-- Auto-create future partitions via pg_partman
CREATE EXTENSION pg_partman;
SELECT partman.create_parent('public.mymoolah_transactions', 'createdAt', 'native', 'monthly');
```

---

## 6. Monitoring & Maintenance

### Find Slow Queries
```sql
-- Install pg_stat_statements extension
CREATE EXTENSION IF NOT EXISTS pg_stat_statements;

-- Top 10 slowest queries
SELECT query, calls, total_exec_time / calls AS avg_time_ms, rows
FROM pg_stat_statements
ORDER BY total_exec_time DESC
LIMIT 10;
```

### Table Bloat & Maintenance
```sql
-- Check table sizes
SELECT tablename,
  pg_size_pretty(pg_total_relation_size('public.' || tablename)) AS total_size,
  pg_size_pretty(pg_table_size('public.' || tablename)) AS data_size,
  pg_size_pretty(pg_indexes_size('public.' || tablename)) AS index_size
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size('public.' || tablename) DESC
LIMIT 15;

-- Unused indexes (safe to drop)
SELECT indexname, idx_scan, pg_size_pretty(pg_relation_size(indexrelid))
FROM pg_stat_user_indexes
WHERE idx_scan = 0
ORDER BY pg_relation_size(indexrelid) DESC;
```

### Scheduled Maintenance
```sql
-- Daily: vacuum analyze high-write tables
VACUUM ANALYZE mymoolah_transactions;
VACUUM ANALYZE journal_lines;
VACUUM ANALYZE flash_transactions;
VACUUM ANALYZE recon_audit_trail;

-- Weekly: full analyze
ANALYZE VERBOSE;
```

---

## 7. Optimization Checklist

- [ ] All financial queries use EXPLAIN ANALYZE before deployment
- [ ] Ledger/transaction tables have composite indexes for common queries
- [ ] JSONB columns have GIN indexes if queried with @>, ?, or ?|
- [ ] Cursor-based pagination used for user-facing transaction lists
- [ ] Complex aggregations use raw SQL, not Sequelize builders
- [ ] Connection pool configured for production workload
- [ ] Statement timeout set to prevent runaway queries
- [ ] pg_stat_statements enabled for query monitoring
- [ ] Large tables (>10M rows) partitioned by date
- [ ] Unused indexes identified and removed quarterly
