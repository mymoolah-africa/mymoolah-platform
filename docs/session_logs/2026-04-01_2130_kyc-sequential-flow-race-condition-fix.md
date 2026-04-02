# Session Log - 2026-04-01 - Sequential KYC Flow & Race Condition Fix

**Session Date**: 2026-04-01 ~19:00-21:30  
**Agent**: Cursor AI Agent  
**User**: Andre  
**Session Duration**: ~2.5 hours

---

## Session Summary
Continuation of rate limiter session. Implemented sequential KYC document upload flow (ID first, then POA) to replace simultaneous dual-upload. Discovered and fixed a critical race condition where the frontend was writing `documents_uploaded` to the DB via POST after the backend had already set `verified` asynchronously. The stale Sequelize instance in the backend then skipped the final status update, leaving users permanently stuck. Fixed both frontend (stop writing intermediate status to DB) and backend (use direct SQL for final status update). Also fixed KYC status page 2-second polling death spiral and added self-healing logic. Deployed both wallet frontend and backend to production multiple times. Tested with two real production users (Andre - User ID 1, Leonie - User ID 2).

---

## Tasks Completed
- [x] Fixed KYC status page polling: 2s setInterval -> 10s setTimeout with exponential backoff on 429
- [x] Increased general rate limiter from 600 to 1500 requests/15min
- [x] Extended walletReadLimiter to cover /notifications, /users, /settings, /vouchers, /kyc
- [x] Fixed stuck kycStatus for User 1 (Andre) via API call
- [x] Added self-healing to kycController.js getKYCStatus endpoint
- [x] Implemented sequential KYC document upload: Step 1 (ID only) -> Step 2 (POA only)
- [x] Fixed critical race condition: frontend writing `documents_uploaded` to DB + backend using stale Sequelize instance
- [x] Backend final kycStatus update now uses direct SQL (bypasses stale cache)
- [x] Frontend only calls updateKYCStatus on immediate 'approved' response
- [x] Fixed stuck kycStatus for User 2 (Leonie) via console API call
- [x] Deployed wallet frontend to production 4 times (revisions 00017 through 00020)
- [x] Deployed backend to production 3 times (revisions 00072 through 00078)

---

## Key Decisions
- **Sequential KYC flow**: Changed from uploading both ID and POA simultaneously to step-by-step. Reduces failure rate, faster to Tier 1 functionality, clearer errors, less wasted mobile data. Matches SA bank UX (FNB, Capitec, TymeBank).
- **Direct SQL for final status**: The async KYC processing block now uses `sequelize.query('UPDATE users SET "kycStatus" = ...')` instead of `user.update()` because the Sequelize instance is loaded before the frontend's POST overwrites the DB value.
- **Frontend stops writing intermediate status**: `updateKYCStatus('documents_uploaded')` was removed. The frontend only writes to DB on immediate `approved` response. For async processing (202), it just navigates to the status page and lets polling handle it.
- **Self-healing kycStatus**: If `wallet.kycVerified=true` AND `kyc_tier>=1` but kycStatus is stale, the `/kyc/status` endpoint auto-corrects to `verified`.

---

## Files Modified
- `config/security.js` - general rate limit 600 -> 1500 for production
- `server.js` - extended walletReadLimiter to additional polling routes
- `mymoolah-wallet-frontend/pages/KYCStatusPage.tsx` - polling 2s->10s with 429 backoff
- `mymoolah-wallet-frontend/components/KYCStatusPage.tsx` - same polling fixes
- `mymoolah-wallet-frontend/pages/KYCDocumentsPage.tsx` - sequential upload flow + removed DB write for intermediate status
- `mymoolah-wallet-frontend/components/KYCDocumentsPage.tsx` - synced with pages/ copy
- `controllers/kycController.js` - direct SQL for final kycStatus, self-healing logic
- `docs/AGENT_HANDOVER.md` - updated to v2.64.0
- `docs/session_logs/2026-04-01_2025_rate-limiter-kyc-polling-fix.md` - earlier session log

---

## Issues Encountered
- **Wrong deploy instructions**: Initially told Andre to deploy backend when the KYC polling fix was a frontend-only change. Wallet frontend requires `deploy-wallet.sh`, not `deploy-backend.sh`. Cost an unnecessary deploy cycle.
- **KYC status stuck at documents_uploaded (Race condition)**: The most critical bug. Frontend's `updateKYCStatus('documents_uploaded')` POST overwrote the backend's async `verified` status. Then the backend's stale Sequelize instance skipped the final update because it thought kycStatus was still `verified` (from when it was loaded). Required fixing both sides.
- **Self-healing not deployed**: The self-healing fix was committed but not deployed for several cycles, causing repeated stuck status issues.
- **Codespaces session timeout**: Codespaces stopped mid-session, requiring restart.

---

## Testing Performed
- [x] User ID 1 (Andre, 0825571055): Tier 2 Fully Verified on production
- [x] User ID 2 (Leonie, 0784560585): Tier 1 -> Tier 2 via sequential flow on production
- [x] Sequential KYC page shows "Step 1: Verify Your ID" for Tier 0 users
- [x] KYC page shows "Step 2: Proof of Address" for Tier 1 users with ID verified checkmark
- [x] TypeScript build passes with zero errors
- [x] Zero linter errors on all modified files
- [x] KYC notification shows "KYC Verification Successful (Tier 1 (ID verified))"

---

## Next Steps
- [ ] Monitor next real user KYC flow end-to-end without manual intervention
- [ ] Product/supplier catalog work (Andre mentioned working on this tomorrow)
- [ ] Consider WebSocket/SSE for KYC status updates instead of polling
- [ ] Address npm audit vulnerabilities (9 backend, 20 frontend)
- [ ] Remove duplicate KYCDocumentsPage.tsx / KYCStatusPage.tsx in components/ vs pages/

---

## Important Context for Next Agent
- **Two separate deploys**: `deploy-backend.sh` for backend, `deploy-wallet.sh` for wallet frontend. Always check which services your changes affect.
- **Rate limits in production**: General 1500/15min, auth 15/15min, financial writes 10/min, wallet reads 120/min. Staging skips all rate limiting.
- **KYC flow is sequential**: Step 1 = ID only (Tier 1), Step 2 = POA only (Tier 2). Backend `upload-documents` endpoint handles single-document uploads.
- **Frontend must NOT write intermediate kycStatus to DB**: The 202 response means async processing. Let the backend set the final status via direct SQL. Frontend only writes on immediate `approved`.
- **Duplicate frontend files**: `pages/KYCDocumentsPage.tsx` and `components/KYCDocumentsPage.tsx` are identical copies. Same for `KYCStatusPage.tsx`. Always update both.
- **Production users**: User 1 (Andre, 0825571055) Tier 2, User 2 (Leonie, 0784560585) Tier 2.
- **Self-healing active**: `/api/v1/kyc/status` auto-corrects stale kycStatus when wallet is verified and tier >= 1.

---

## Related Documentation
- Previous session: `docs/session_logs/2026-04-01_1850_production-user-cleanup-rate-limiter-fix.md`
- Earlier this session: `docs/session_logs/2026-04-01_2025_rate-limiter-kyc-polling-fix.md`
- KYC controller: `controllers/kycController.js`
- KYC frontend: `mymoolah-wallet-frontend/pages/KYCDocumentsPage.tsx`
- Rate limit config: `config/security.js`
