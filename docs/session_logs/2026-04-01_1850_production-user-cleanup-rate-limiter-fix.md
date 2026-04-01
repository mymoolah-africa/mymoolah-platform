# Session Log - 2026-04-01 - Production User Cleanup & Rate Limiter Fix

**Session Date**: 2026-04-01 18:30  
**Agent**: Cursor AI Agent  
**User**: André  
**Session Duration**: ~30 minutes

---

## Session Summary
Fixed production 429 "too many requests" rate limiting issue caused by the `financialLimiter` (10 req/min) being applied to wallet dashboard GET endpoints. Split into separate read and write rate limiters. Fully purged User ID 1 (Andre Botes, +27825571055) from production database — all 7 rows deleted (user, KYC, wallet, settings, 3 notifications). Sequence reset so next registration gets ID 1. Product/supplier catalog data (1,974 products, 2 suppliers, 93 commission tiers) untouched.

---

## Tasks Completed
- [x] Analyzed production Cloud Run logs (`gcloud logging read`) — identified `financialLimiter` (10/min) as root cause of 429s on dashboard polling
- [x] Split rate limiting: `walletReadLimiter` (120/min) for GET requests, `financialLimiter` (10/min) skips GETs
- [x] Increased auth limiter from 5 to 15 failed attempts per 15 minutes
- [x] Created `scripts/delete-production-user.js` — production user purge with dry-run, SAVEPOINT-safe, sequence reset
- [x] Purged User ID 1 from production (7 rows: users, kyc, wallets, UserSettings, notifications x3)
- [x] Reset `users_id_seq` so next registration gets ID 1
- [x] Verified product/supplier data untouched (1,974 products, 2 suppliers, 93 commission tiers)

---

## Key Decisions
- **Split read/write rate limiting**: Dashboard GET endpoints (balance, transactions) were sharing the 10/min `financialLimiter` with money-moving POST operations. Fixed by adding `walletReadLimiter` (120/min) for GETs and making `financialLimiter` skip GET requests. This matches the March 12 session's `walletReadLimiter` concept that was lost.
- **Auth limiter increase to 15**: 5 failed logins per 15 minutes was too strict for active development/testing. Increased to 15 (`skipSuccessfulRequests: true` means only failures count).
- **Full user purge, not selective cleanup**: André wants to re-register fresh with ID 1. Deleted everything including KYC (he'll redo it) rather than keeping partial state.
- **setval() instead of ALTER SEQUENCE**: The postgres admin user didn't own the sequence. Used `SELECT setval('users_id_seq', 1, false)` which works with the app user.

---

## Files Modified
- `server.js` — Added `walletReadLimiter` (120/min for GET), modified `financialLimiter` to skip GET requests, applied `walletReadLimiter` to `/api/v1/wallets` and `/api/v1/transactions`
- `config/security.js` — Auth rate limit max changed from 5 to 15 for production
- `scripts/delete-production-user.js` — New script: production user purge by user ID, SAVEPOINT-based error isolation, dry-run by default, `--confirm` for live deletion, sequence reset

---

## Issues Encountered
- **GCP credential refresh**: Cloud SQL Auth Proxy on local Mac failed with `invalid_grant` / `invalid_rapt`. André ran `gcloud auth application-default login` to refresh.
- **PostgreSQL transaction abort**: First version of delete script didn't use SAVEPOINTs. When `flash_transactions` had no `userId` column, the error aborted the entire transaction. Fixed with SAVEPOINT per table.
- **Sequence reset permissions**: `ALTER SEQUENCE users_id_seq RESTART WITH 1` failed with "must be owner of sequence" (even for postgres admin). Used `SELECT setval('users_id_seq', 1, false)` via app user instead.
- **Cloud Run service names**: Initial log searches used old names (`be-production-backend`). Correct names are `mymoolah-backend-production` and `mymoolah-wallet-production`.

---

## Testing Performed
- [x] Dry-run of delete script (showed 7 rows to delete)
- [x] Live deletion confirmed (7 rows deleted, committed)
- [x] Sequence reset verified (`last_value=1, is_called=false`)
- [x] Product data verified untouched (1,974 products, 1,974 variants, 2 suppliers, 93 tiers)
- [x] Users table empty (`COUNT(*) = 0`)

---

## Next Steps
- [ ] **Deploy to production** to activate rate limiter fix: `./scripts/deploy-backend.sh --production`
- [ ] André re-registers with 0825571055 on production — should get User ID 1
- [ ] Re-do KYC (ID document + POA) on production
- [ ] Tomorrow: work on database products and supplier sweeping
- [ ] Fix `flash_transactions`/`supplier_transactions`/`journal_entries`/`tax_transactions` column names in delete script (they use different FK column names — not urgent since no data existed)

---

## Important Context for Next Agent
- **Production is clean**: 0 users, 0 wallets, 0 KYC records. Product catalog intact. André will re-register immediately.
- **Rate limiter fix not yet deployed**: The code changes (walletReadLimiter, auth limit increase) are committed locally but need deployment to take effect in production.
- **Cloud Run service names**: `mymoolah-backend-production`, `mymoolah-wallet-production`, `mymoolah-backend-staging`, `mymoolah-wallet-staging`. Previous docs referenced `be-production-backend` which is outdated.
- **Local Mac Cloud SQL proxy**: Works via `cloud-sql-proxy` from Homebrew. Requires fresh `gcloud auth application-default login` if ADC expires. Production port 6545.
- **Sequence ownership**: The `users_id_seq` is not owned by the postgres admin user. Use `setval()` (app user can call it) instead of `ALTER SEQUENCE`.

---

## Related Documentation
- Previous session: `docs/session_logs/2026-04-01_1700_production-api-testing-fixes.md`
- Rate limiting architecture: `middleware/rateLimiter.js`, `config/security.js`, `server.js` lines 297-420
- Security layer session: `docs/session_logs/2026-03-12_2300_security-layer-debug-all-envs-resolved.md`
