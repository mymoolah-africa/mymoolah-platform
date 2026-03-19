# Session Log: SBSA H2H MT940/MT942 Statement Processing

**Date**: 2026-03-19  
**Time**: 12:00 SAST  
**Agent**: Claude (Sonnet 4.5 Thinking)  
**Session Type**: Feature Implementation + Migration Deployment

---

## Session Summary

Implemented the complete SBSA H2H MT940/MT942 bank statement processing pipeline, based on decisions confirmed with Colette (SBSA) on 2026-03-17. All migrations deployed to UAT, Staging, and Production successfully.

---

## Key Decisions Made

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Statement format | MT940 + MT942 | SWIFT ISO standard — banking/Mojaloop grade, well-documented, no vendor lock-in |
| Folder structure | Sub-folders: `inbox/statements/` + `inbox/payments/` | Type-separated routing — prevents Pain.002 and MT940 files from mixing |
| Delivery schedule | Both intraday (MT942) + end-of-day (MT940) | Both confirmed available by Colette |
| Poll interval | Every 5 minutes (configurable via `SBSA_STATEMENT_POLL_SCHEDULE`) | Catches intraday MT942 files throughout the day |

---

## Tasks Completed

1. ✅ Updated `docs/SBSA_H2H_SETUP_GUIDE.md` — Colette's answers recorded, decisions confirmed, new Section 10 (Statement Processing Architecture) added
2. ✅ Built `services/standardbank/mt940Parser.js` — Full SWIFT MT940/MT942 parser (balance fields, :61: statement lines, :86: narratives, double-entry validation, cents arithmetic)
3. ✅ Built `services/standardbank/sbsaStatementService.js` — GCS poll → parse → reconcile → delegate unmatched credits to depositNotificationService → archive
4. ✅ Created `models/SBSAStatementRun.js` — Sequelize model for idempotency tracking
5. ✅ Migration: `20260319_create_sbsa_statement_runs.js` — Creates sbsa_statement_runs table
6. ✅ Migration: `20260319_add_bank_confirmed_to_disbursement_payments.js` — Adds bank_confirmed_at + bank_confirmed_amount_cents columns
7. ✅ Wired SBSA statement poller to `server.js` cron (node-cron, every 5 min)
8. ✅ Fixed `scripts/run-migrations-master.sh` — Now uses admin (`postgres`) user for DDL migrations on all environments (as documented in db-connection-helper.js)
9. ✅ All migrations deployed: UAT ✅ Staging ✅ Production ✅

---

## Files Modified

| File | Change |
|------|--------|
| `docs/SBSA_H2H_SETUP_GUIDE.md` | Confirmed decisions, added Section 10 architecture reference |
| `services/standardbank/mt940Parser.js` | NEW — Full MT940/MT942 SWIFT parser |
| `services/standardbank/sbsaStatementService.js` | NEW — Statement orchestration service |
| `models/SBSAStatementRun.js` | NEW — Sequelize model |
| `models/DisbursementPayment.js` | Added bank_confirmed_at and bank_confirmed_amount_cents fields |
| `migrations/20260319_create_sbsa_statement_runs.js` | NEW — Migration |
| `migrations/20260319_add_bank_confirmed_to_disbursement_payments.js` | NEW — Migration |
| `server.js` | Added SBSA statement poller cron (every 5 min) |
| `scripts/run-migrations-master.sh` | Fixed to use admin DB URL for DDL migrations |

---

## Migration Deployment Log

| Environment | Status | Notes |
|-------------|--------|-------|
| UAT | ✅ Completed | Required proxy restart (duplicate PID 5429+5484 on port 6543) |
| Staging | ✅ Completed | Required proxy restart (stale PID 5789 on port 6544) |
| Production | ✅ Completed | Required proxy restart (stale PID 5840 on port 6545) + caught up 4 pending migrations from 20260307-20260317 |

**Root cause of ECONNRESET errors**: Stale Cloud SQL Auth Proxy PIDs from previous CS session. Fix: `kill $(lsof -ti:<port>)` → `./scripts/ensure-proxies-running.sh`

---

## Issues Encountered & Resolved

1. **ECONNRESET on all three environments** — Stale proxy PIDs from previous CS session. Killed and restarted each proxy before running migration. Added to migration runbook: always run `ensure-proxies-running.sh` first if proxies are stale.
2. **`run-migrations-master.sh` using app user for DDL** — Script was calling `getStagingDatabaseURL()` (mymoolah_app) instead of `getStagingAdminDatabaseURL()` (postgres). Migrations worked because app user had DDL grants in all environments, but this is incorrect per db-connection-helper.js documentation. Fixed to use admin URLs for all environments.
3. **`check-proxies-cs.sh` missing** — `ensure-proxies-running.sh` calls `./scripts/check-proxies-cs.sh` at the end which doesn't exist. Harmless (bash error only, proxies work fine). Flagged for future cleanup.

---

## Architecture: How MT940 Processing Works

```
SBSA SFTP → GCS gs://mymoolah-sftp-inbound/standardbank/inbox/statements/
                ↓ (every 5 min, node-cron)
        sbsaStatementService.pollAndProcess()
                ↓
        Check MD5 hash → idempotency (skip if already processed)
                ↓
        mt940Parser.parseMT940File()
                ↓
        For each CREDIT transaction:
          → tryMatchKnownReference() → if matched, done
          → else: depositNotificationService.processDepositNotification()
              → MSISDN lookup → credit wallet
              → if unresolved → park in suspense ledger (ops review)
        For each DEBIT transaction:
          → tryConfirmDisbursementDebit() → mark bank_confirmed on DisbursementPayment
        → postClosingBalanceAudit() → ledger audit trail
        → Archive to processed/ or failed/
```

---

## Next Steps

- [ ] **SBSA to confirm**: Exact SFTP username for our account
- [ ] **SBSA to confirm**: MT940/MT942 filename pattern they will use
- [ ] **SBSA to confirm**: Intraday statement frequency (every 2h, 4h, or on-demand)
- [ ] **Reply to Colette**: Confirm sub-folder preference, statement format, delivery schedule, request exact statement folder name at SBSA
- [ ] **VALR onboarding**: Start business account creation, KYC, API key generation
- [ ] **Yellowcard**: Awaiting KYB approval + sandbox credentials
- [ ] **PayShap UAT end-to-end**: Awaiting OneHub credentials from SBSA
- [ ] **Fix `check-proxies-cs.sh` missing** — Either create the script or remove the call from `ensure-proxies-running.sh`
- [ ] **SMTP deploy script** — Add SMTP_USER/SMTP_PASS to `scripts/deploy-backend.sh` Cloud Run env vars

---

## Context for Next Agent

- All SBSA H2H statement processing infrastructure is in place and migrated across all 3 environments
- The statement poller will start automatically with the server but will silently degrade if GCS bucket is not accessible (safe)
- MT940 credits flow through the existing `depositNotificationService` — same MSISDN→wallet or suspense logic as live webhook
- Production caught up 4 pending migrations from earlier work (20260307 E.164 constraints, 20260317 disbursement tables) — production is now fully in sync with UAT and staging
- Migration runbook: Always kill stale proxies before running migrations in a new CS session
