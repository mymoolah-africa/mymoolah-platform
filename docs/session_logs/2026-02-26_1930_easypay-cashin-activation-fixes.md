# Session Log - 2026-02-26 - EasyPay Cash-In Activation Fixes

**Session Date**: 2026-02-26 17:00–19:30  
**Agent**: Cursor AI Agent  
**User**: André  
**Session Duration**: ~2.5 hours

---

## Session Summary

This session implemented EasyPay Cash-In activation fixes following Razeen's email response: mounted EasyPay routes at `/billpayment/v1` (per EasypayReceiverV5.yaml spec), updated auth middleware for `Authorization: SessionToken`, disabled Cash-Out and Standalone Voucher routes (Cash-In only), rewrote the seed script with 5 test scenarios for Theodore Smith, and fixed expired bill handling (ResponseCode 3) in `infoRequest` and `authorisationRequest`. Seeded Staging successfully; `infoRequest` passes for all 5 scenarios. `authorisationRequest` returns 500 for Scenario 4 (open amount) — staging-only debug added to surface the exact error on next deploy.

---

## Tasks Completed

- [x] Mount EasyPay routes at `/billpayment/v1` in `server.js` (per EasypayReceiverV5.yaml basePath)
- [x] Update `middleware/easypayAuth.js` to accept `Authorization: SessionToken {token}` (EasyPay V5 spec)
- [x] Disable EasyPay Cash-Out and Standalone Voucher routes in `routes/vouchers.js` (Cash-In only in scope)
- [x] Rewrite `scripts/seed-easypay-data.js` — Receiver ID 5063, 5 test scenarios (valid unpaid, already paid, expired, open amount, fixed amount)
- [x] Fix expired bill handling — return ResponseCode 3 in `infoRequest` and `authorisationRequest` when bill status is expired/cancelled or dueDate is in the past
- [x] Add staging-only debug in `authorisationRequest` catch block — returns `debug: error.message` when STAGING=true to surface exact Postgres/Sequelize error
- [x] Confirm all migrations up on Staging (`npx sequelize-cli db:migrate:status`)
- [x] Seed EasyPay test data into Staging (`node scripts/seed-easypay-data.js --staging`)
- [x] Verify `/billpayment/v1/ping` returns `{"Ping":"OK"}` on Staging
- [x] Verify `infoRequest` returns correct ResponseCodes for Scenarios 1, 2, 4, 5 (Scenario 3 needs redeploy for expired fix)

---

## Key Decisions

- **Cash-In only**: Cash-Out and Standalone Voucher routes commented out (not deleted) — preserved for audit and future activation.
- **Expired check**: Both `status === 'expired'|'cancelled'` and `dueDate < today` trigger ResponseCode 3.
- **Staging debug**: Only when `STAGING=true` or `STAGING=1` — Production never exposes error details.
- **Seed script**: Uses `db-connection-helper.js` for Staging DB; requires proxy running (`./scripts/ensure-proxies-running.sh`).

---

## Files Modified

| File | Change |
|------|--------|
| `server.js` | Added `app.use('/billpayment/v1', easyPayRoutes)` — EasyPay expects this basePath |
| `middleware/easypayAuth.js` | Prioritize `Authorization: SessionToken {token}`; keep X-API-Key and Bearer for UAT |
| `routes/vouchers.js` | Commented out EasyPay Cash-Out and Standalone Voucher routes |
| `scripts/seed-easypay-data.js` | Rewritten — Receiver ID 5063, 5 scenarios, test data sheet for Theodore Smith |
| `controllers/easyPayController.js` | Expired bill check (ResponseCode 3) in infoRequest and authorisationRequest; staging debug in catch |

---

## Issues Encountered

- **authorisationRequest 500 for Scenario 4 (open amount)**: `Payment.create()` fails on Staging. Migrations confirmed up; `payments` table exists. Staging-only debug added to return `error.message` in response — deploy and retry to get exact Postgres/Sequelize error.
- **Staging proxy not running**: Seed script requires Cloud SQL proxy. Run `./scripts/ensure-proxies-running.sh` before `node scripts/seed-easypay-data.js --staging`.
- **NODE_ENV=staging rejected by server**: Local `node server.js` with NODE_ENV=staging fails — security config only allows development/production/test. Use NODE_ENV=development for local testing.

---

## Testing Performed

- [x] `curl https://staging.mymoolah.africa/billpayment/v1/ping` — PASS (`{"Ping":"OK"}`)
- [x] `infoRequest` Scenario 1 (valid unpaid) — PASS (RC:0)
- [x] `infoRequest` Scenario 2 (already paid) — PASS (RC:5)
- [x] `infoRequest` Scenario 3 (expired) — Pending redeploy (fix committed)
- [x] `infoRequest` Scenario 4 (open amount) — PASS (RC:0)
- [x] `infoRequest` Scenario 5 (fixed R300) — PASS (RC:0)
- [x] `authorisationRequest` Scenario 2 (already paid) — PASS (RC:5)
- [x] `authorisationRequest` Scenario 5 (wrong amount) — PASS (RC:2)
- [ ] `authorisationRequest` Scenario 4 (valid open amount) — 500 (debug deploy pending)

---

## Next Steps

1. **Deploy to Staging** — `bash scripts/build-push-deploy-staging.sh` (includes expired fix + debug)
2. **Retry authorisationRequest Scenario 4** — Response will include `debug: "<exact error>"` to fix root cause
3. **Send test data to Theodore Smith** — SessionToken + 5 EasyPay numbers from seed output (encrypted email)
4. **Remove staging debug** — After root cause fixed, remove `debug` from 500 response for production safety

---

## Important Context for Next Agent

- EasyPay test numbers use Receiver ID `5063` (MyMoolah's assigned ID). Format: `9` + `5063` + `{8-digit account}` + `{Luhn check digit}` = 14 digits.
- Amounts in API are in **cents** (R100.00 = 10000).
- `EchoData` must be returned exactly as received in all responses.
- Cloud Armor policy `easypay-staging-policy` already allows EasyPay IP `20.164.206.68` on Staging backend.

---

## Related Documentation

- `integrations/easypay/` (if exists), `EasypayReceiverV5.yaml`
- `docs/agent_handover.md` — EasyPay Cash-In activation priorities
- Session log: `docs/session_logs/2026-02-21_1700_payshap-easypay-zapper-drive-docs.md` (activation email draft)
