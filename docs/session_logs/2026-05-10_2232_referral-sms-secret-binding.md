# Session Log - 2026-05-10 - Referral SMS Secret Binding

**Session Date**: 2026-05-10 22:32 SAST  
**Agent**: Cursor AI Agent  
**User**: André  
**Session Duration**: Continuation from voucher/gift-card split and referral SMS investigation

---

## Session Summary
Fixed the durable deployment root cause behind referral invites showing `SMS Temporarily Unavailable`. The referral engine logic was still intact; the backend deploy script was missing the MyMobileAPI Secret Manager bindings required for `smsService.isConfigured()` to return true on Cloud Run, and André approved applying the binding update to both Staging and Production.

---

## Tasks Completed
- [x] Traced the referral invite failure to `SMS_SERVICE_NOT_CONFIGURED`.
- [x] Added `MYMOBILEAPI_USERNAME` and `MYMOBILEAPI_PASSWORD` bindings to `scripts/deploy-backend.sh`.
- [x] Documented MyMobileAPI SMS env variables in `env.template` without real credentials.
- [x] Validated deploy script syntax and referral/SMS code paths.
- [x] Updated Staging and Production Cloud Run services with the SMS secret bindings.
- [x] Verified both services bind the expected Secret Manager entries.
- [x] Updated `docs/CHANGELOG.md` and `docs/AGENT_HANDOVER.md`.

---

## Key Decisions
- **Durable fix in deploy script**: Binding SMS secrets in `scripts/deploy-backend.sh` prevents future backend deploys from creating Cloud Run revisions without SMS credentials.
- **No referral logic rewrite**: The failure was operational configuration drift, not referral business logic, phone validation, or the frontend modal.
- **Minimal live update**: André approved both environments, so Cloud Run was updated with `--update-secrets` only instead of rebuilding the backend image.

---

## Files Modified
- `scripts/deploy-backend.sh` - Added MyMobileAPI Secret Manager bindings for backend Cloud Run revisions.
- `env.template` - Documented local/staging/production SMS env variable names without secrets.
- `docs/CHANGELOG.md` - Added the referral SMS secret binding fix.
- `docs/AGENT_HANDOVER.md` - Updated latest status and next production action.
- `docs/session_logs/2026-05-10_2232_referral-sms-secret-binding.md` - Created this session log.

---

## Code Changes Summary
- `build_secrets_args()` now appends `MYMOBILEAPI_USERNAME=mymobileapi-client-id:latest` and `MYMOBILEAPI_PASSWORD=mymobileapi-api-secret:latest`.
- The env template now lists `MYMOBILEAPI_URL`, `MYMOBILEAPI_PATH`, `MYMOBILEAPI_USERNAME`, `MYMOBILEAPI_PASSWORD`, and `MYMOBILEAPI_SENDER_ID`.
- No database, ledger, SMS copy, referral API contract, or wallet frontend behaviour changed.

---

## Issues Encountered
- **Referral SMS outage**: Cloud Run could start without the MyMobileAPI credential env vars because the deploy script omitted them from `--set-secrets`.
- **Resolution**: Added the required secret bindings so future deploys keep SMS configured.

---

## Testing Performed
- [x] Script syntax validation: `bash -n scripts/deploy-backend.sh`.
- [x] Backend syntax validation: `node --check services/smsService.js services/referralService.js controllers/referralController.js`.
- [x] Cursor lints on touched files and referral/SMS code paths.
- [x] Read-only subagent review confirmed the fix matches the `SMS_SERVICE_NOT_CONFIGURED` code path.
- [x] Staging Cloud Run revision `mymoolah-backend-staging-00545-rfp` is serving 100% traffic.
- [x] Production Cloud Run revision `mymoolah-backend-production-00206-mxh` is serving 100% traffic.
- [x] Cloud Run describe confirmed `MYMOBILEAPI_USERNAME -> mymobileapi-client-id` and `MYMOBILEAPI_PASSWORD -> mymobileapi-api-secret` in both environments.
- [ ] Live referral SMS invite retest after Cloud Run redeploy/update.

---

## Next Steps
- [ ] After deploy/update, send one controlled referral invite from the wallet and confirm the success modal plus SMS delivery.
- [ ] If the next error changes from `SMS_SERVICE_NOT_CONFIGURED` to `SMS_SEND_FAILED`, verify Secret Manager values, service-account secret accessor permissions, and MyMobileAPI account status.

---

## Important Context for Next Agent
- The relevant service config check is `smsService.isConfigured()`, which requires both `MYMOBILEAPI_USERNAME` and `MYMOBILEAPI_PASSWORD`.
- The existing Secret Manager names used here are `mymobileapi-client-id` and `mymobileapi-api-secret`.
- The deploy script currently uses the same SMS secret names for staging and production.
- Do not run production Cloud Run updates without André approval.

---

## Questions/Unresolved Items
- Confirm whether André wants staging, production, or both Cloud Run backend services updated immediately.
- Confirm live SMS delivery with one controlled referral invite after deployment.

---

## Related Documentation
- `docs/CHANGELOG.md`
- `docs/AGENT_HANDOVER.md`
- `docs/session_logs/2026-05-02_1442_referral-sms-outcome-modal.md`
