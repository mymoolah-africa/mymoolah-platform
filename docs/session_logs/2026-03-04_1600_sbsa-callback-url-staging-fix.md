# Session Log - SBSA PayShap Callback URL Staging Fix

**Session Date**: 2026-03-04 ~16:00 (Updated 2026-03-11 - reverted staging callback to staging URL)  
**Agent**: Cursor AI Agent (Claude)  
**User**: André  
**Session Duration**: ~30 min

---

## Session Summary

Initial fix attempted to use `api-mm.mymoolah.africa` for staging callbacks per SBS email. **Reverted 2026-03-11**: Staging-initiated RTP creates records in staging DB. If callbacks go to api-mm (production backend), production DB has no RTP → callback finds nothing → wallet not credited. Staging must use `staging.mymoolah.africa` so callbacks hit the same backend/DB that created the RTP. Production continues to use `api-mm.mymoolah.africa`. SBS may need to whitelist both URLs.

---

## Tasks Completed

- [x] Initial fix: staging set to api-mm (Mar 4)
- [x] **Revert (Mar 11)**: staging back to `SBSA_CALLBACK_BASE_URL="https://staging.mymoolah.africa"` — callbacks must hit same backend/DB as RTP initiator
- [x] Added inline comment: "Callbacks must hit same backend that created the RTP (staging DB ≠ production DB)"

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

- **Callback URL = same backend as RTP initiator**: RTP records live in the DB of the backend that created them. processRtpCallback looks up by originalMessageId. If callbacks hit a different backend (e.g. api-mm when RTP was created on staging), the lookup fails → no wallet credit. Therefore: staging uses staging.mymoolah.africa, production uses api-mm.mymoolah.africa.
- **SBS whitelist**: SBS may need to whitelist both staging.mymoolah.africa and api-mm.mymoolah.africa for production API (we test from staging).
- **401 Invalid hash**: If callbacks fail with 401, confirm production callback secret in GCS matches SBS's expected secret for x-GroupHeader-Hash. We have soft-fail when no HMAC strategy matches.

---

## Related Documentation

- `docs/session_logs/2026-03-04_1400_sbsa-payshap-production-credentials-setup.md` — Production credentials setup
- `docs/session_logs/2026-03-10_1830_rtp-callback-routing-hash-debugging.md` — "Staging uses PRODUCTION credentials"
- `docs/session_logs/2026-02-01_FINAL_electricity-mobilemart-production-ready.md` — Environment model (Staging = Production APIs + Test Users)
