---
name: safe-database-migrations
description: Master Zero-Downtime PostgreSQL and Sequelize migrations. Use this skill when altering database schemas for ledgers, creating indexes, adding columns, or handling data seeding in a large-scale financial system without causing production locks.
---

# MyMoolah Safe Database Migrations

MyMoolah is a financial application with large ledger tables (`JournalLine`, `MyMoolahTransaction`). 
Traditional ORM migrations can lock these multi-million row tables for minutes or hours 
during column additions or index creation, bringing the payment gateway down.

## When This Skill Activates

- Writing a new Sequelize migration script (`migrations/.*\.js`).
- Adding or removing columns from core financial tables.
- Adding database indexes to optimize queries.
- Seeding configuration or lookup data.

---

## 1. Zero-Downtime Migration Rules

1. **Never use `dropTable` or `removeColumn` in a single deployment**: If you must remove a field, deprecate it in the code first, stop reading/writing to it, deploy, and THEN remove the column in a subsequent migration days later.
2. **Never set a `defaultValue` when adding a new column**: Setting a default value causes PostgreSQL to re-write every row in the table, locking it entirely.
3. **Always create Indexes `CONCURRENTLY`**: Creating a standard index blocks table writes. Financial gateways cannot block writes.

---

## 2. Safe Column Addition Pattern

How to add a column safely to a large table (e.g., Millions of transactions).

```javascript
// ✅ CORRECT: Zero-downtime column addition
'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // 1. Add column ALLOWING nulls AND NO DEFAULT VALUE. This is instantaneous.
    await queryInterface.addColumn('mymoolah_transactions', 'fee_amount', {
      type: Sequelize.DECIMAL(18, 2),
      allowNull: true, 
    });

    // 2. (Optional, outside transaction chunks) Backfill data in small batches 
    // using a separate background script if necessary. Do not loop millions 
    // of rows inside the migration file.
  },

  down: async (queryInterface, Sequelize) => {
    // Reverting is fine for local dev, but in prod, dropping locks.
    await queryInterface.removeColumn('mymoolah_transactions', 'fee_amount');
  }
};
```

---

## 3. Safe Concurrent Index Creation

Sequelize's default `addIndex` locks the table. We must drop down to raw queries using `CREATE INDEX CONCURRENTLY` and disable Sequelize's migration transaction block.

```javascript
// ✅ CORRECT: Zero-Downtime Indexing
'use strict';

module.exports = {
  // CRITICAL: Disable transactions or CONCURRENTLY will fail
  // PostgreSQL cannot run CREATE INDEX CONCURRENTLY inside a transaction block
  up: async (queryInterface, Sequelize) => {
    const transaction = await queryInterface.sequelize.transaction();
    
    try {
      // Execute as a raw query, strictly ensuring CONCURRENTLY is used
      await queryInterface.sequelize.query(
        `CREATE INDEX CONCURRENTLY IF NOT EXISTS 
         idx_transactions_status_createdat 
         ON mymoolah_transactions (status, "createdAt" DESC);`,
        { transaction: null } // Explicitly bypass transaction
      );
    } catch (error) {
       console.error("Index creation failed", error);
       throw error;
    }
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.sequelize.query(
      `DROP INDEX CONCURRENTLY IF EXISTS idx_transactions_status_createdat;`,
      { transaction: null }
    );
  }
};
```

---

## 4. Renaming Columns Safely 

Renaming a column breaks code that expects the old name. You must do this across 3 deployments.

**Deployment 1:** Add the new column. Write to BOTH columns. Read from the old column.
**Deployment 2:** Run a script to copy old data to the new column. Read from the NEW column. Write to both.
**Deployment 3:** Stop writing to the old column. Drop the old column in a migration.

If Cursor asks to rename a column on `Wallet` or `Transaction`, it MUST suggest this 3-step strategy.

---

## 5. Idempotent Data Seeding Pattern

Seeder data must always be `upserted` (inserted or updated on conflict), never just inserted, so the `setup` scripts can run repeatedly without throwing duplicate key errors.

```javascript
// seeders/xxxx-seed-system-accounts.js
'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const timestamp = new Date();
    
    // Use raw query for true idempotent ON CONFLICT updates in PG
    await queryInterface.sequelize.query(`
      INSERT INTO ledger_accounts (code, name, type, "normalSide", "createdAt", "updatedAt")
      VALUES 
        ('LIAB-FLOAT-STD', 'Standard Bank Main Float', 'liability', 'credit', :time, :time),
        ('ASSET-SUSP-1', 'Suspense Resolution Account', 'asset', 'debit', :time, :time)
      ON CONFLICT (code) DO UPDATE SET 
        name = EXCLUDED.name,
        "updatedAt" = EXCLUDED."updatedAt";
    `, {
      replacements: { time: timestamp }
    });
  },

  down: async (queryInterface, Sequelize) => {
    // Only delete specific seeded data
    await queryInterface.bulkDelete('ledger_accounts', {
      code: { [Sequelize.Op.in]: ['LIAB-FLOAT-STD', 'ASSET-SUSP-1'] }
    });
  }
};
```

---

## 6. Migration Review Checklist for Cursor

- [ ] Does the migration add a `defaultValue` to an existing table? (BLOCK if yes)
- [ ] Does the migration `removeColumn` from a financial table without a deprecation cycle? (BLOCK if yes)
- [ ] Are indexes created natively with `CREATE INDEX CONCURRENTLY`?
- [ ] Is the migration transaction disabled `{ transaction: null }` for concurrent index builds?
- [ ] Are seeders fully idempotent using `ON CONFLICT DO UPDATE`?
