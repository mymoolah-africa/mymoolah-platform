# Session Log - 2026-04-04 - Staging/Production Parity Fixes

**Session Date**: 2026-04-04 11:30  
**Agent**: Cursor AI Agent  
**User**: Andre  

---

## Session Summary
Investigated and fixed 4 issues causing behavioral differences between staging and production environments. Root causes were: (1) rate limiters being entirely skipped in staging via `STAGING=true` flag, (2) referral payout cron using node-cron which can't fire when Cloud Run scales to zero, (3) ProductVariant findOrCreate not matching unique index causing Hollywood Bets sync failure, (4) KYC pages not rendering TopBanner so notification bell was hidden.

---

## Tasks Completed
- [x] Rate limiters: Removed all `STAGING === 'true'` skip clauses; set identical banking-grade thresholds for staging and production (ISO 27001 / Mojaloop compliant)
- [x] Referral payout: Migrated from node-cron to Cloud Scheduler (same pattern as catalog sync); added `/api/v1/referrals/scheduled-payout` endpoint with OIDC auth
- [x] Hollywood Bets: Fixed ProductVariant `findOrCreate` to match on unique index fields `(productId, supplierId)` instead of including `supplierProductId`
- [x] KYC notification: Added KYC pages to `pagesWithTopBanner` in App.tsx; adjusted KYC page heights for TopBanner

---

## Key Decisions
- **Same rate limits for staging and production**: No `STAGING` bypass. Both environments now enforce identical limits. This ensures staging is a true mirror of production behavior (banking best practice).
- **Rate limit thresholds set at high end of banking practice**: General 3000/15min, Auth 20/15min, API 500/15min, Financial 30/min, Wallet reads 300/min. Maximizes performance while maintaining brute-force and abuse protection.
- **Referral payout at 02:15 SAST**: Staggered 15 minutes after catalog sweep (02:00) to avoid resource contention.
- **node-cron kept as fallback**: For local dev / Codespaces where Cloud Scheduler is not available. Same pattern as catalog sync.

---

## Files Modified
- `config/security.js` - Removed `NODE_ENV` ternary in rate limit config; single banking-grade values
- `server.js` - Removed all `STAGING === 'true'` skip clauses from 4 rate limiters; updated walletReadLimiter to 300/min; migrated referral payout to Cloud Scheduler mode
- `middleware/rateLimiter.js` - Removed `STAGING` skip clauses; increased thresholds to match server.js
- `routes/ads.js` - Removed `STAGING` skip from ad view/engagement rate limiters
- `routes/referrals.js` - Added Cloud Scheduler-triggered `/scheduled-payout` endpoint with OIDC auth
- `services/catalogSynchronizationService.js` - Fixed ProductVariant `findOrCreate` to use unique index fields `(productId, supplierId)`
- `scripts/setup-cloud-scheduler.sh` - Refactored to support multiple jobs; added `referral-payout-{env}` job
- `mymoolah-wallet-frontend/App.tsx` - Added KYC pages to `pagesWithTopBanner`
- `mymoolah-wallet-frontend/pages/KYCStatusPage.tsx` - Changed `min-h-screen` to `calc(100vh - 64px)` for TopBanner
- `mymoolah-wallet-frontend/pages/KYCDocumentsPage.tsx` - Same height fix
- `mymoolah-wallet-frontend/components/KYCStatusPage.tsx` - Same height fix
- `mymoolah-wallet-frontend/components/KYCDocumentsPage.tsx` - Same height fix
- `.cursor/rules/tech-debt.mdc` - Updated tech debt register with resolved items and new architectural decisions

---

## Code Changes Summary
- **Rate limiter parity**: All `process.env.STAGING === 'true'` skip clauses removed from `server.js`, `middleware/rateLimiter.js`, `routes/ads.js`. Config in `config/security.js` uses fixed values instead of `NODE_ENV` ternary.
- **Referral payout Cloud Scheduler**: New endpoint `POST /api/v1/referrals/scheduled-payout` with OIDC authentication, handler calls `referralPayoutService.processDailyPayouts()` synchronously within the HTTP request.
- **Catalog sync fix**: `ProductVariant.findOrCreate` now matches on `(productId, supplierId)` (the unique constraint) instead of `(productId, supplierId, supplierProductId)`. Prevents validation errors when supplier changes product IDs.
- **KYC TopBanner**: KYC paths added to `pagesWithTopBanner` array; KYC page containers use `calc(100vh - 64px)` instead of `min-h-screen`.

---

## Issues Encountered
- **Rate limiter discovery**: The `STAGING === 'true'` skip pattern was spread across 4 files (server.js, middleware/rateLimiter.js, routes/ads.js). All had to be updated consistently.
- **ProductVariant unique constraint**: The `findOrCreate` was not matching on the database unique index. When MobileMart changed a product's merchantProductId, the old variant blocked creation of a new one.

---

## Testing Performed
- [x] Linter checks on all modified files (zero errors)
- [ ] Manual testing in Codespaces (Andre to test after deploy)
- [ ] Cloud Scheduler job creation (requires `./scripts/setup-cloud-scheduler.sh --both`)

---

## Next Steps
- [ ] Andre: Pull and rebuild frontend, restart backend in Codespaces
- [ ] Andre: Run `./scripts/setup-cloud-scheduler.sh --both` to create the referral payout Cloud Scheduler jobs for staging and production
- [ ] Andre: Deploy backend to staging: `./scripts/deploy-backend.sh --staging`
- [ ] Andre: Deploy wallet to staging: `./scripts/deploy-wallet.sh --staging`
- [ ] Andre: Test in staging: verify notifications work, check voucher list includes Hollywood Bets after next catalog sweep, confirm rate limiting behaves correctly
- [ ] Andre: Deploy to production after staging verification
- [ ] Andre: After production deploy, manually trigger referral payout to process any backlog: `gcloud scheduler jobs run referral-payout-production --location=europe-west1 --project=mymoolah-db`

---

## Important Context for Next Agent
- The `STAGING` environment variable still exists and is still used for non-rate-limiting purposes (USSD IP whitelist, EasyPay auth). Those are legitimate security controls that should differ between staging and production.
- The Cloud Scheduler jobs need to be created via `./scripts/setup-cloud-scheduler.sh --both` after deploying the new backend code. The script is idempotent (deletes existing jobs first).
- The Hollywood Bets fix will take effect on the next catalog sweep. The stale ProductVariant in staging DB will be updated instead of creating a new one.
- KYC pages now show TopBanner with notification bell. The gradient background starts below the white TopBanner header.

---

## Related Documentation
- Tech debt register: `.cursor/rules/tech-debt.mdc`
- Cloud Scheduler setup: `scripts/setup-cloud-scheduler.sh`
- Rate limit config: `config/security.js`, `server.js` (lines 310-420)
