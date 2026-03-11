# Session Log - SBSA PayShap Callback URL Staging Fix

**Session Date**: 2026-03-04 ~16:00  
**Agent**: Cursor AI Agent (Claude)  
**User**: André  
**Session Duration**: ~30 min

---

## Session Summary

Fixed SBSA PayShap callback URL misconfiguration per SBS email. Staging deployment was incorrectly using `staging.mymoolah.africa` for SBSA callbacks. Per project documentation, staging and production use identical SBSA config (production credentials and callback details); only users (test vs real) and database differ. Updated `deploy-backend.sh` so both environments use `api-mm.mymoolah.africa` for SBSA callbacks.

---

## Tasks Completed

- [x] Fixed `scripts/deploy-backend.sh` — staging now sets `SBSA_CALLBACK_BASE_URL="https://api-mm.mymoolah.africa"` (was `staging.mymoolah.africa`)
- [x] Added inline comment documenting why both envs use production callback domain
- [x] Session log and agent handover updated

---

## Key Decisions

- **Single file change only**: Only `deploy-backend.sh` was modified. No changes to `client.js`, `env.template`, or UAT docs — those remain correct for their contexts (UAT uses staging/ngrok; GCS staging/production use production config).
- **Minimal diff**: Changed one line + added one comment. No structural changes to deploy script.

---

## Files Modified

- `scripts/deploy-backend.sh` — Line 44: `SBSA_CALLBACK_BASE_URL` for staging changed from `https://staging.mymoolah.africa` to `https://api-mm.mymoolah.africa`; added comment explaining SBSA staging/production parity

---

## Code Changes Summary

```diff
 if [ "$ENVIRONMENT" == "staging" ]; then
   CORS_ORIGINS="https://stagingwallet.mymoolah.africa"
   STAGING_FLAG="true"
-  SBSA_CALLBACK_BASE_URL="https://staging.mymoolah.africa"
+  # SBSA: Staging uses production callback domain (same credentials; only users/DB differ per env)
+  SBSA_CALLBACK_BASE_URL="https://api-mm.mymoolah.africa"
 else
```

---

## Issues Encountered

- None. Change was straightforward and aligned with existing documentation.

---

## Testing Performed

- [ ] **Redeploy required**: User must run `./scripts/deploy-backend.sh --staging` to apply the fix
- [ ] After redeploy, SBSA RTP callbacks will target `api-mm.mymoolah.africa` regardless of which environment initiated the request

---

## Next Steps

1. **Redeploy staging backend**: `./scripts/deploy-backend.sh --staging` (run locally)
2. **Test SBSA RTP**: Initiate RTP from staging; verify SBSA callbacks succeed (no more 401 Invalid hash from wrong domain)
3. **SBS hash secret**: If 401 persists after callback URL fix, confirm with SBS that production callback secret in GCS matches their production HMAC secret

---

## Important Context for Next Agent

- **SBSA staging/production parity**: Staging and production use identical SBSA config — production credentials, production API URLs, production callback domain (`api-mm.mymoolah.africa`). Only difference: test users vs real users, staging DB vs production DB.
- **env.template / CODESPACES_TESTING_REQUIREMENT**: Those files show `SBSA_CALLBACK_BASE_URL=https://staging.mymoolah.africa` for **UAT** (Codespaces). That is correct — UAT uses UAT credentials and staging/ngrok for callbacks. Do not change those.
- **Callback target**: When staging backend initiates RTP, SBSA callbacks go to `api-mm` (production backend). For SBSA testing with test users, use production deployment (api-mm) with test users in production DB, not staging deployment.

---

## Related Documentation

- `docs/session_logs/2026-03-04_1400_sbsa-payshap-production-credentials-setup.md` — Production credentials setup
- `docs/session_logs/2026-03-10_1830_rtp-callback-routing-hash-debugging.md` — "Staging uses PRODUCTION credentials"
- `docs/session_logs/2026-02-01_FINAL_electricity-mobilemart-production-ready.md` — Environment model (Staging = Production APIs + Test Users)
