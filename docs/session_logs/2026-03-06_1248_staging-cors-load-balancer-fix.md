# Session Log: Staging eeziAirtime CORS Fix — Load Balancer Override

**Session Date**: 2026-03-06 12:48  
**Agent**: Cursor AI Agent  
**User**: André  
**Duration**: ~30 min  
**Trigger**: eeziAirtime failed on staging after pull and redeploy — CORS preflight blocked `x-idempotency-key` header

---

## Session Summary

Diagnosed and fixed eeziAirtime failure on staging. Root cause: Google Cloud Load Balancer had hard-coded `customResponseHeaders` on the staging backend service that overrode Express CORS config. Those LB headers were stale and did not include `X-Idempotency-Key`. Fix: removed `customResponseHeaders` from the LB entirely; Express now handles CORS correctly. No code changes — pure GCP infrastructure fix. eeziAirtime confirmed working.

---

## Tasks Completed

- [x] Diagnosed eeziAirtime CORS failure on staging (401/blocked by preflight)
- [x] Traced error to LB `customResponseHeaders` overriding Express CORS
- [x] Removed `customResponseHeaders` from `be-staging-backend` via gcloud
- [x] Verified CORS preflight returns `X-Idempotency-Key` in `Access-Control-Allow-Headers`
- [x] Confirmed eeziAirtime purchase successful on staging (user screenshot)
- [x] Verified production CORS (already correct — no LB override)

---

## Key Decisions

- **Remove LB CORS headers entirely**: Instead of updating the LB headers to include `X-Idempotency-Key`, we removed them. Express `cors()` in `config/security.js` is the single source of truth. Production never had LB custom headers — staging now matches.
- **No code changes**: The Express CORS config in `config/security.js` has had `X-Idempotency-Key` in `allowedHeaders` since January 20 (commit `dabb7b4b`). The Docker image was correct; the LB was the bottleneck.
- **Document for future**: Staging LB backend service `be-staging-backend` should remain without `customResponseHeaders` for CORS. If CORS needs to change, update `config/security.js` only.

---

## Files Modified

- **None** — fix was purely GCP infrastructure via gcloud CLI:
  ```bash
  gcloud compute backend-services update be-staging-backend \
    --global --project mymoolah-db --no-custom-response-headers
  ```

---

## Code Changes Summary

No code changes. Infrastructure-only fix.

---

## Issues Encountered

### 1. eeziAirtime CORS Failure on Staging
- **Error**: `Request header field x-idempotency-key is not allowed by Access-Control-Allow-Headers in preflight response`
- **Context**: Occurred after user pulled from Codespaces and redeployed staging backend + frontend. eeziAirtime had worked before banking-grade hardening (Item 3: frontend idempotency keys).
- **Investigation**: Confirmed Express `config/security.js` had `X-Idempotency-Key` in `allowedHeaders`. Pulled staging Docker image and verified file content. CORS preflight from staging API returned only 6 of 8 headers — missing `X-Idempotency-Key` and `X-Request-Id`.
- **Root cause**: `be-staging-backend` had `customResponseHeaders` hard-coded at LB level:
  ```
  Access-Control-Allow-Headers:Content-Type, Authorization, X-Requested-With, X-API-Key, X-Client-Version, X-Device-ID
  ```
  These LB headers override the response from the origin (Cloud Run → Express). The LB config was never updated when we added idempotency headers.
- **Fix**: `gcloud compute backend-services update be-staging-backend --global --no-custom-response-headers`
- **Result**: Express CORS now controls all headers. Preflight returns all 8 headers including `X-Idempotency-Key`, `X-Request-Id`, and `PATCH` in methods.

### 2. manifest.json / accounts.google.com CORS Errors
- **Note**: User also reported `manifest.json` redirecting to `accounts.google.com` with CORS errors. Likely IAP or auth flow. Not related to eeziAirtime API CORS; eeziAirtime fix was sufficient for purchase flow.

---

## Testing Performed

- [x] curl CORS preflight to `staging.mymoolah.africa` — confirmed `X-Idempotency-Key` in response
- [x] curl CORS preflight to `api-mm.mymoolah.africa` — production already correct
- [x] User confirmed eeziAirtime purchase successful on staging (screenshot with PIN displayed)

---

## Next Steps

- None immediate. eeziAirtime working on staging.
- If adding new custom request headers in future, ensure `config/security.js` `allowedHeaders` is updated. Do **not** re-add `customResponseHeaders` to staging LB — let Express handle CORS.

---

## Important Context for Next Agent

- **Staging LB (`be-staging-backend`)**: Has NO `customResponseHeaders`. CORS is fully handled by Express `cors()` middleware. Do not add LB-level CORS headers — they would override Express and cause similar issues.
- **Production LB (`be-production-backend`)**: Never had custom CORS headers; always used Express. No change needed.
- **Browser preflight cache**: `access-control-max-age: 86400` means browsers cache preflight for 24h. If CORS changes again, users may need incognito or cache clear.
- **Command to inspect staging backend**:
  ```bash
  gcloud compute backend-services describe be-staging-backend --global --project mymoolah-db --format="value(customResponseHeaders)"
  ```
  Should return empty.

---

## Related Documentation

- `config/security.js` — CORS config (`allowedHeaders`, `getCorsOrigins`)
- `docs/session_logs/2026-03-04_2300_banking-grade-hardening-tests-redis-idempotency.md` — Item 3 (frontend idempotency keys) that introduced `X-Idempotency-Key` header
- GCP: `urlmap-staging` → `be-staging-backend` → Cloud Run `mymoolah-backend-staging`
