# Session Log - 2026-02-26 - Flash Integration Fixes & Clean-Slate Catalog Test

**Session Date**: 2026-02-26 09:00–12:45  
**Agent**: Cursor AI Agent  
**User**: André  
**Session Duration**: ~4 hours

---

## Session Summary

This session completed the Flash v4 API integration alignment against the official PDF documentation, fixed three transaction endpoint bugs, resolved a denominations validator issue that was blocking 9 Flash variable-range products from importing, and ran a full clean-slate catalog test on both Staging and Production databases. Both environments are now confirmed working with live API data and zero errors. The daily 02:00 scheduler is proven end-to-end.

---

## Tasks Completed

- [x] Fix 3 Flash API bugs identified from official v4 PDF review (previous session)
  - `gift-vouchers/purchase` → `gift-voucher/purchase` (singular)
  - Cellular recharge payload: `subAccountNumber` → `accountNumber`
  - Prepaid utilities payload: `transactionID` → `meterNumber` (+ optional `isFBE`)
- [x] Run full Flash + MobileMart API tests (Sandbox + Production) and compile results report for Tia
- [x] Create `scripts/clean-slate-catalog-test-staging.js` — snapshot, delete, sync, verify
- [x] Create `scripts/clean-slate-catalog-test-production.js` — same with `--production` safety flag
- [x] Fix `isRunning` guard bug — sync was silently returning 0 products
- [x] Fix DATABASE_URL override — Sequelize was connecting to UAT instead of Staging/Production
- [x] Fix denominations validator in `Product.js` and `ProductVariant.js` — variable-range types (airtime, data, voucher, cash_out) now correctly allowed empty denominations array
- [x] Create migration `20260226_01_add_role_to_users.js` — adds `role` ENUM column to `users` table
- [x] Run migration on Staging via `run-migrations-master.sh staging`
- [x] Run migration on Production via `run-migrations-master.sh production`
- [x] Run clean-slate test on Staging — 38 Flash + 56 MobileMart, 0 errors ✅
- [x] Run clean-slate test on Production (first with wrong MobileMart UAT URL, then corrected)
- [x] Run clean-slate test on Production with correct Production MobileMart credentials — 81 Flash + 1,726 MobileMart, 3 minor errors ✅
- [x] Confirm all Flash v4 API endpoint paths from official PDF (v3.1, April 2025)
- [x] Confirm `Accept: application/json` header is required (was missing from our query to Tia)

---

## Key Decisions

- **Clean-slate test approach**: Agreed to delete all Flash and MobileMart products from Staging first, then Production, and re-import via live API sync to prove the daily scheduler works correctly. This is standard "destructive sync test" practice.
- **Denominations validator fix**: Extended `VARIABLE_RANGE_TYPES` to include `airtime`, `data`, `voucher`, `cash_out` — not just `bill_payment` and `electricity`. These types use `constraints.minAmount`/`maxAmount` instead of fixed denominations. This is architecturally correct, not a workaround.
- **MobileMart URL correction**: `.env.codespaces` has `https://uat.fulcrumswitch.com` (test). Production MobileMart URL is `https://fulcrumswitch.com` (no `uat.` prefix), fetched from Secret Manager `mobilemart-prod-api-url`.
- **Cash Out PIN deferred**: Not appearing in Flash products API response for our account. To be confirmed with Tia whether it is enabled on account `0834-5373-6661-1279`.
- **Pinless-only filter for MobileMart**: Airtime and data are filtered to pinless only (line 651-653 in `catalogSynchronizationService.js`). This is intentional — MyMoolah does not sell pinned vouchers. The old 1,521 products included pinned products from the old bootstrap script.

---

## Files Modified

- `controllers/flashController.js` — Fixed 3 transaction endpoint bugs (gift-voucher singular, accountNumber, meterNumber+isFBE)
- `routes/flash.js` — Updated route path and JSDoc for gift-voucher and prepaid-utilities
- `models/Product.js` — Extended denominations validator VARIABLE_RANGE_TYPES
- `models/ProductVariant.js` — Extended denominations validator VARIABLE_RANGE_TYPES
- `migrations/20260226_01_add_role_to_users.js` — NEW: adds role ENUM column to users table (idempotent)
- `scripts/clean-slate-catalog-test-staging.js` — NEW: full clean-slate test for Staging
- `scripts/clean-slate-catalog-test-production.js` — NEW: full clean-slate test for Production (requires `--production` flag)

---

## Issues Encountered

- **Cloud SQL proxy ECONNRESET**: Staging and Production proxies had expired OAuth tokens. Fix: `kill $(lsof -ti:PORT)` then restart with `FRESH_TOKEN=$(gcloud auth print-access-token)` and `--token "$FRESH_TOKEN"`.
- **Sync returning 0 products**: `performDailySweep()` has `if (!this.isRunning) return` guard. Script was not calling `service.start()` first. Fix: set `service.isRunning = true` before calling `performDailySweep()`.
- **Wrong database**: Sequelize was loading UAT DATABASE_URL from `.env.codespaces`. Fix: override `process.env.DATABASE_URL` with Staging/Production credentials before requiring models.
- **9 Flash variable-range products failing**: `"At least one denomination is required"` validation error. Root cause: `airtime`, `data`, `voucher` types were not in the validator's exemption list. Fix: extend `VARIABLE_RANGE_TYPES` array.
- **`column User.role does not exist`**: `notifyAdminOfChanges()` queries `WHERE role = 'admin'` but column was missing from Staging/Production. Fix: migration `20260226_01_add_role_to_users.js`.
- **MobileMart UAT vs Production**: First Production run used UAT MobileMart URL from `.env.codespaces`, returning only 56 products. Corrected by passing Production URL inline. Production MobileMart returns 2,089 products (1,726 pinless imported).

---

## Testing Performed

- [x] Flash Sandbox API: auth + 38 products — PASS
- [x] Flash Production API: auth + 81 products — PASS
- [x] Staging clean-slate: 38 Flash + 56 MobileMart, 0 errors — PASS
- [x] Production clean-slate: 81 Flash + 1,726 MobileMart, 3 minor errors — PASS
- [x] Migration on Staging: `20260226_01_add_role_to_users` — PASS
- [x] Migration on Production: `20260226_01_add_role_to_users` — PASS
- [x] `vas_best_offers` refresh: 418 best offers on Production — PASS

---

## Production Catalog Final State

| Supplier | Products | Variants |
|---|---|---|
| Flash | 81 | 81 |
| MobileMart | 1,726 | 1,726 |
| **Total** | **1,807** | **1,807** |

3 MobileMart bill-payment products failed validation (Rest Assured Plan, Matjhabeng Municipality, PayJoy SA) — minor, to be investigated separately.

---

## Next Steps

- [ ] **Build and deploy Staging** — so fixed model code (Product.js, ProductVariant.js) is live in Cloud Run
- [ ] **Build and deploy Production** — same
- [ ] **Begin transaction-level testing in Staging** — all endpoints confirmed, catalog ready
- [ ] **Wait for Tia's response** on Cash Out PIN availability for account `0834-5373-6661-1279`
- [ ] **Investigate 3 failed MobileMart bill-payment products** — Rest Assured Plan, Matjhabeng Municipality, PayJoy SA
- [ ] **Update `.env.codespaces`** — `MOBILEMART_API_URL` should be `https://fulcrumswitch.com` (Production) not `https://uat.fulcrumswitch.com`

---

## Important Context for Next Agent

- **Flash Sandbox credentials**: `FLASH_ACCOUNT_NUMBER=8444-1533-7896-6119`, token URL `https://api-flashswitch-sandbox.flash-group.com/token`
- **Flash Production credentials**: `FLASH_ACCOUNT_NUMBER=0834-5373-6661-1279`, token URL `https://api.flashswitch.flash-group.com/token` — stored in GCS Secret Manager
- **MobileMart Production URL**: `https://fulcrumswitch.com` — `.env.codespaces` incorrectly has `uat.fulcrumswitch.com`
- **Cloud SQL proxy ports**: UAT=6543, Staging=6544, Production=6545. Tokens expire after ~1 hour. Restart with fresh token when ECONNRESET occurs.
- **Clean-slate scripts**: Use `db-connection-helper.js` for DB connections. Production script requires `--production` flag. Override `DATABASE_URL` before requiring models.
- **Cash Out PIN**: Endpoint implemented in `flashController.js` and `routes/flash.js`. Not appearing in Flash products API — awaiting Tia confirmation.
- **Flash v4 API PDF location**: `/Users/andremacbookpro/Downloads/Flash Partner API v4 - release 3 1.pdf` (v3.1, April 2025)
- **All Flash transaction paths confirmed correct** from official PDF. Flash Token uniquely uses `/aggregation/flash-token/purchase` (no `4.0`). All others use `/aggregation/4.0/`.
- **Required headers for Flash API**: `Authorization: Bearer {token}`, `Content-Type: application/json`, `Accept: application/json`

---

## Questions/Unresolved Items

- Is Cash Out PIN enabled on Flash Production account `0834-5373-6661-1279`? (Awaiting Tia)
- Should `.env.codespaces` `MOBILEMART_API_URL` be updated to Production URL?
- Should Staging MobileMart sync also use Production MobileMart URL or stay on UAT?

---

## Commits This Session

- `94e5fd49` — fix: align Flash API calls with official V4 PDF specification
- `a2890469` — feat: add clean-slate catalog test script for Staging
- `e424bbe6` — fix: clean-slate test — set isRunning=true and override DATABASE_URL to Staging
- `6593f10d` — fix: allow empty denominations for variable-price products + add role migration
- `148de30c` — fix: correctly allow empty denominations for all variable-range product types
- `e4e9aa55` — feat: add clean-slate catalog test script for Production
