# Session Log - 2026-04-01 - Rate Limiter Tuning, KYC Polling Fix & Self-Healing

**Session Date**: 2026-04-01 ~19:00-20:25  
**Agent**: Cursor AI Agent  
**User**: Andre  
**Session Duration**: ~1.5 hours

---

## Session Summary
Continued from previous session (rate limiter fixes). Andre was blocked from uploading POA documents on production due to persistent 429 errors. Root cause was a 2-second KYC status polling loop creating a death spiral that exhausted rate limits. Fixed frontend polling (2s -> 10s with exponential backoff on 429), increased general rate limiter to 1500/15min, deployed both backend and wallet frontend to production. Also discovered kycStatus was stuck at `documents_uploaded` in the DB despite backend having already verified both ID and POA (Tier 2) -- caused by a race condition from 429-induced retry uploads. Fixed DB status via API call and added backend self-healing to auto-correct stale kycStatus when wallet is already verified.

---

## Tasks Completed
- [x] Increased general rate limiter from 600 to 1500 requests/15min in production
- [x] Extended walletReadLimiter to cover /notifications, /users, /settings, /vouchers, /kyc routes
- [x] Fixed KYC status page polling: 2s setInterval -> 10s setTimeout with exponential backoff on 429
- [x] Fixed both copies: pages/KYCStatusPage.tsx and components/KYCStatusPage.tsx
- [x] Deployed backend to production (revision 00074-ntz)
- [x] Deployed wallet frontend to production (revision 00017-dt7) -- separate deploy from backend
- [x] Fixed stuck kycStatus=documents_uploaded via /api/v1/kyc/update-status API call
- [x] Added self-healing logic to kycController.js getKYCStatus endpoint

---

## Key Decisions
- **KYC polling interval**: Changed from 2s to 10s base with exponential backoff (doubles on 429, max 60s, resets to 10s on success). 2s was far too aggressive for a rate-limited production environment.
- **General rate limit 1500/15min**: 600 was still too low for React SPA with multiple polling endpoints. 1500 gives ~100 req/min which accommodates dashboard + notifications + KYC status + other endpoints.
- **Self-healing kycStatus**: If wallet.kycVerified=true AND user.kyc_tier>=1 but kycStatus is not 'verified' or 'rejected', auto-correct to 'verified'. Prevents race conditions from leaving users stuck.
- **Frontend and backend are separate deploys**: deploy-backend.sh only deploys backend Cloud Run service. deploy-wallet.sh deploys the wallet frontend. Must deploy both when changes span both.

---

## Files Modified
- `config/security.js` - general rate limit 600 -> 1500 for production
- `server.js` - extended walletReadLimiter to /notifications, /users, /settings, /vouchers, /kyc
- `mymoolah-wallet-frontend/pages/KYCStatusPage.tsx` - polling 2s->10s, 429 backoff, useRef import
- `mymoolah-wallet-frontend/components/KYCStatusPage.tsx` - same fixes (duplicate file)
- `controllers/kycController.js` - self-healing: auto-correct stale kycStatus when wallet verified

---

## Issues Encountered
- **Wrong deploy instructions**: Told Andre to deploy backend when the KYC polling fix was a frontend change. Wallet frontend requires `deploy-wallet.sh --production`, not `deploy-backend.sh`. Cost Andre an unnecessary backend deploy cycle (~7 min).
- **KYC status stuck at documents_uploaded**: Backend logs showed ID verified (Tier 1) at 17:14 and POA verified (Tier 2) at 17:31, but the user.kycStatus remained documents_uploaded. The 429 storm caused frontend retries that triggered new upload requests, which reset the status. Fixed via direct API call and added self-healing to prevent recurrence.
- **Frontend polling death spiral**: KYC status page polled every 2s. When 429 hit, status stayed at documents_uploaded, keeping the polling active. This consumed ~30 req/min just for KYC status, on top of dashboard/notification polling, exhausting the rate limit for everything.

---

## Testing Performed
- [x] Manual testing: Andre verified Tier 2 Fully Verified showing correctly on production
- [x] KYC status page shows Verification Complete 100%
- [x] All features active: VAS, Send Money, Receive Deposits, Withdraw Cash, International
- [x] Transaction limits correct: R25k/tx, R50k/day, R100k/month, R100k max balance

---

## Next Steps
- [ ] Deploy backend with self-healing fix to production: `./scripts/deploy-backend.sh --production` (commit pushed, not yet deployed)
- [ ] Product/supplier catalog work (Andre mentioned working on this tomorrow)
- [ ] Consider reducing frontend polling frequency further or implementing WebSocket/SSE for status updates
- [ ] Address npm audit vulnerabilities (9 in backend, 20 in frontend)

---

## Important Context for Next Agent
- **Two separate deploys**: Backend = `deploy-backend.sh`, Wallet frontend = `deploy-wallet.sh`. Always check which services your changes affect.
- **Rate limits in production**: General 1500/15min, auth 15/15min, financial writes 10/min, wallet reads 120/min. Staging skips all rate limiting.
- **KYC polling**: Now 10s with exponential backoff. Both pages/KYCStatusPage.tsx and components/KYCStatusPage.tsx must be kept in sync (duplicate files).
- **Self-healing committed but NOT deployed**: The kycController.js self-healing fix is pushed to main but the backend hasn't been redeployed yet. Next backend deploy will include it.
- **Andre's user**: User ID 1, mobile 0825571055, Tier 2 Fully Verified on production.

---

## Related Documentation
- Previous session: `docs/session_logs/2026-04-01_1850_production-user-cleanup-rate-limiter-fix.md`
- Rate limit config: `config/security.js`
- KYC controller: `controllers/kycController.js`
- KYC frontend: `mymoolah-wallet-frontend/pages/KYCStatusPage.tsx`
