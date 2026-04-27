---
name: background-jobs-and-cron
description: Implement robust scheduled jobs for reconciliation and reporting. Use this skill for Cloud Scheduler endpoints, node-cron local fallbacks, idempotent background jobs, large backfills, and horizontally safe automation.
---

# MyMoolah Background Jobs & Cron

Many financial tasks require automated, scheduled execution (e.g., Midnight trial balance 
checks, end-of-day EasyPay reconciliations, weekly commission calculations). If these 
scripts run multiple times, crash halfway, or consume the entire Node.js event loop, 
the main MyMoolah API will fail.

> **Current State**: Cloud Run scheduled production work should prefer Google Cloud Scheduler hitting authenticated HTTP endpoints. `node-cron` remains acceptable for local/dev fallback or explicitly mode-gated jobs. Avoid brittle `server.js` line references; verify the current scheduler inventory before changing jobs.

## When This Skill Activates

- Adding a new scheduled task, preferably as a Cloud Scheduler HTTP endpoint with node-cron only as a local fallback.
- Building reconciliation engines (`ReconRun`, `JournalEntry` verification).
- Generating massive CSV/Excel reports via `exceljs` or `csv-parse`.
- Backfilling database data across millions of rows.
- Refactoring existing cron jobs out of `server.js`.

---

## 1. Golden Rules of Financial Cron Jobs

1. **Strict Idempotency**: A cron job must be designed so that if it runs twice in the same day (due to a restart or horizontal scaling), it detects the prior run and gracefully exits.
2. **Dedicated Audit Logging**: Every major cron job must log its start, success, failure, and row counts to a dedicated database table (e.g., `CronJobLog` or `ReconRun`), never just `console.log`.
3. **Cursor Paginating over Large Datasets**: Never `findAll()` on an entire ledger table for reporting. Always query in chunks using a `lastId` cursor to preserve RAM.

---

## 2. Idempotent Scheduled Job Pattern

When defining a Cloud Scheduler endpoint or node-cron fallback, always check a persistent store (PostgreSQL or Redis) to ensure this specific schedule has not already been processed by another instance.

```javascript
// scripts/jobs/dailyReconciliation.js
const cron = require('node-cron');
const { ReconRun } = require('../../models');
const { Op } = require('sequelize');
const logger = require('../../utils/logger');
const { acquireLock, releaseLock } = require('../../utils/redisLock');

// Run every night at 01:00 AM Africa/Johannesburg
cron.schedule('0 1 * * *', async () => {
  const jobIdentifier = 'midnight-recon';
  const lockKey = `cronlock:${jobIdentifier}:${new Date().toISOString().split('T')[0]}`;
  
  // 1. Distributed Lock: Prevent duplicate runs if running 3 Node API servers
  const lock = await acquireLock(lockKey, 3600000); // 1-hour lock
  if (!lock) {
    logger.info(`Cron ${jobIdentifier} already acquired by another instance. Skipping.`);
    return;
  }

  // 2. Database Idempotency Check
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const existingRun = await ReconRun.findOne({ 
    where: { 
      type: 'EOD_RECON', 
      createdAt: { [Op.gte]: todayStart } 
    } 
  });

  if (existingRun && existingRun.status === 'COMPLETED') {
    logger.info(`EOD Recon already completed for today. Exiting early.`);
    await releaseLock(lockKey, lock);
    return;
  }

  // 3. Create Audit Record (Processing State)
  const auditRun = await ReconRun.create({ type: 'EOD_RECON', status: 'PROCESSING' });

  try {
    // 4. Do Heavy Work (Chunked DB reads, API requests)
    await runDoubleEntryValidationInChunks(auditRun.id);

    // 5. Mark Success
    await auditRun.update({ status: 'COMPLETED', finishedAt: new Date() });
    logger.info(`Cron ${jobIdentifier} completed successfully.`);

  } catch (error) {
    // 6. Mark Failure & Alert
    await auditRun.update({ status: 'FAILED', errorDetails: error.message });
    logger.error(`Cron ${jobIdentifier} FAILED`, error);
    // Trigger standard Ops alert (PagerDuty, Email, Slack)
    throw error;
  } finally {
    await releaseLock(lockKey, lock);
  }
}, {
  scheduled: true,
  timezone: "Africa/Johannesburg"
});
```

---

## 3. Cursor Pagination for Massive Data Scripts

When building reports or reconciliation logic, always iterate over `JournalLines` dynamically.

```javascript
// ✅ CORRECT: Chunking 5-million row table
async function runDoubleEntryValidationInChunks(runId) {
  let lastProcessedId = 0;
  const chunkSize = 5000;
  let hasMore = true;

  while (hasMore) {
    // Fetch specifically ordered by Primary Key (Indexed)
    const lines = await JournalLine.findAll({
      where: { id: { [Op.gt]: lastProcessedId } },
      order: [['id', 'ASC']],
      limit: chunkSize,
      raw: true, 
      attributes: ['id', 'journalEntryId', 'accountId', 'dc', 'amount']
    });

    if (lines.length === 0) {
      hasMore = false;
      break;
    }

    // Process chunk...
    for (const line of lines) {
       await validateLineIntegrity(line);
    }

    // Update cursor pointer
    lastProcessedId = lines[lines.length - 1].id;
    
    // Optional: Log progress to Redis or Job Table
    await updateJobProgress(runId, lastProcessedId);
  }
}
```

---

## 4. Cursor Compatibility Checklist

- [ ] Does the job use Cloud Scheduler for Cloud Run production, or a clearly mode-gated node-cron fallback with `Africa/Johannesburg` timezone?
- [ ] Is the cron job in a **separate file** under `scripts/jobs/`, NOT inside `server.js`?
- [ ] Are distributed locks implemented if the app is scaled horizontally?
- [ ] Does the script query the database first to ensure the job hasn't run today (Idempotency)?
- [ ] Is an Audit record explicitly `created` in `ReconRun` or `JobLog` before work begins?
- [ ] Does the script use cursor pagination (`id > lastId`) instead of `OFFSET` for huge datasets?
- [ ] Are errors caught, logged to the DB record, and bubbled up to external monitoring?

## 5. Migration Path for Existing Crons

The two existing crons in `server.js` should be migrated as follows when scaling:

1. **Monthly Tier Review** (`cron.schedule('0 2 1 * *')` in `server.js`):
   Move to `scripts/jobs/monthlyTierReview.js`, add Redis lock with key
   `cronlock:tier-review:YYYY-MM`, and create a `CronJobLog` audit record.

2. **Daily Referral Payout** (`cron.schedule('0 2 * * *')` in `server.js`):
   Move to `scripts/jobs/dailyReferralPayout.js`, add Redis lock with key
   `cronlock:referral-payout:YYYY-MM-DD`, and create a `CronJobLog` audit record.

**Trigger**: This migration becomes mandatory when deploying > 1 Cloud Run instance.
