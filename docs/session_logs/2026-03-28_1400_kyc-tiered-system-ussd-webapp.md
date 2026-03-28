# Session Log - 2026-03-28 - KYC Tiered System: USSD + Web App Integration

**Session Date**: 2026-03-28 14:00  
**Agent**: Cursor AI Agent (Claude 4.6 Opus)  
**User**: Andre  

---

## Session Summary

Implemented a comprehensive 3-tier KYC verification system for MyMoolah: Tier 0 (USSD basic — ID/passport format validation), Tier 1 (web app — ID document OCR-verified), and Tier 2 (web app — ID + proof of address both OCR-verified). This session continued previous USSD KYC work by adding the `kyc_tier` database column, updating backend controllers and services, enabling proof-of-address upload, and rewriting the frontend KYC page to support tier-aware document uploads with consistent styling.

---

## Tasks Completed
- [x] USSD registration: Tier 0 automatic KYC on validated ID/passport (carried from previous session)
- [x] Enhanced SA ID validation (DOB, citizenship digit, Luhn checksum)
- [x] Tightened international passport validation (6-15 chars, must contain letter, reject all-same-char)
- [x] USSD registration flow: collect first name + last name (FICA compliance)
- [x] Staging database cleanup: removed 5 test users, preserved Andre's data
- [x] Added `kyc_tier` INTEGER column to users table via migration
- [x] Backend: set `kyc_tier = 0` for USSD registrations (new + existing users)
- [x] Backend: set `kyc_tier = 1` after web app ID document OCR validation
- [x] Backend: set `kyc_tier = 2` after web app ID + POA both validated
- [x] Backend: enabled proof-of-address upload in multer and controller
- [x] Backend: allow address-only uploads for Tier 1+ users upgrading to Tier 2
- [x] Frontend: added `kycTier` to AuthContext User interface
- [x] Frontend: rewrote KYCDocumentsPage with tier-aware rendering (3 scenarios)
- [x] Frontend: consistent styling using globals.css design system (Montserrat, CSS variables)
- [x] All 56 USSD tests pass, TypeScript compiles with zero errors

---

## Key Decisions
- **Separate `kyc_tier` column instead of extending kycStatus enum**: Tiers are numeric and ordered (0, 1, 2), which maps naturally to INTEGER. Keeps `kycStatus` as workflow state (not_started/pending/verified/rejected/ussd_basic) while `kyc_tier` tracks verification level independently. Avoids enum proliferation and enables simple comparisons (`WHERE kyc_tier >= 1`).
- **FICA compliance requires full names for USSD**: Research confirmed that even Tier 0 mobile wallets require first name and surname under South African FICA regulations. Replaced placeholder `firstName: 'USSD', lastName: 'User'` with actual user input.
- **Proof of address is optional for Tier 1**: Users can submit ID only (Tier 1) or ID + POA (Tier 2). The frontend shows an "Optional" label on the POA card for new users.
- **Tier 1 users can upgrade to Tier 2 later**: Backend allows address-only uploads when `kyc_tier >= 1`. Frontend shows a "Verified" badge for identity and only the POA upload card.
- **Migration backfills existing users**: USSD users (`kycStatus='ussd_basic'`) → `kyc_tier = 0`; web app users (`kycStatus='verified'`) → `kyc_tier = 1`.

---

## Files Modified

### Backend
- `migrations/20260328_01_add_kyc_tier_column.js` — **NEW**: adds `kyc_tier` INTEGER column with index, backfills existing users
- `models/User.js` — Added `kyc_tier` field (INTEGER, nullable, validated 0-2)
- `services/ussdAuthService.js` — Sets `kyc_tier = 0` in INSERT for new USSD users; includes `kyc_tier` in `findUserByMsisdn` SELECT
- `services/ussdMenuService.js` — Sets `kyc_tier = 0` in UPDATE for existing users going through ID collection
- `controllers/kycController.js` — Tiered KYC logic: Tier 1 on ID validation, Tier 2 on POA validation; allows address-only uploads for Tier 1+ users; exposes `kycTier` in status endpoint
- `routes/kyc.js` — Re-enabled `addressDocument` in multer upload fields
- `tests/ussd.test.js` — 17 new test cases for names, enhanced ID/passport validation, state transitions

### Frontend
- `mymoolah-wallet-frontend/contexts/AuthContext.tsx` — Added `kycTier` to User interface; mapped from backend `kyc_tier`; all user constructions updated
- `mymoolah-wallet-frontend/pages/KYCDocumentsPage.tsx` — Full rewrite: tier badges, address document upload, conditional rendering (3 scenarios), consistent styling
- `mymoolah-wallet-frontend/components/KYCDocumentsPage.tsx` — Synced with pages version

---

## Code Changes Summary

### Database
- New migration `20260328_01_add_kyc_tier_column.js` adds `kyc_tier` INTEGER column to `users` table

### Backend Tier Logic
- **USSD Tier 0**: `ussdAuthService.registerUssdUser()` and `ussdMenuService.handleRegisterId()` set `kyc_tier = 0`
- **Web Tier 1**: `kycController.uploadDocuments()` and `uploadDocument()` set `kyc_tier = 1` after successful ID OCR
- **Web Tier 2**: Same controllers set `kyc_tier = 2` after successful POA OCR (when ID already verified)
- **Status endpoint**: `getKYCStatus()` now returns `kycTier` in response

### Frontend KYC Page (3 scenarios)
1. **New/Tier 0 user**: Shows both Identity + Address upload cards; POA is optional
2. **Tier 1 user**: Shows Identity as "Verified" (green), Address upload card only; submit says "Submit for Tier 2 Verification"
3. **Tier 2 user**: Redirected to dashboard

---

## Issues Encountered
- **Staging database cleanup rollback**: Initial cleanup script failed because `otp_verifications` table uses `user_id` (snake_case) instead of `"userId"` (camelCase). Fixed by checking the Sequelize model definition.
- **USSD existing-user path bypassed ID collection**: The `handleWelcome` function allowed existing users without a USSD PIN to skip ID/name collection. Fixed by checking `user.idNumber && user.idType` before routing to PIN setup.

---

## Testing Performed
- [x] Unit tests written/updated (17 new test cases in ussd.test.js)
- [x] All 56 USSD tests pass
- [x] TypeScript compiles with zero errors (`npx tsc --noEmit`)
- [x] No linter errors on any modified file
- [ ] Manual testing in Codespaces (pending — migration needs to be run)

---

## Next Steps
- [ ] Run migration in UAT: `./scripts/run-migrations-master.sh uat`
- [ ] Run migration in Staging: `./scripts/run-migrations-master.sh staging`
- [ ] Build frontend in Codespaces: `cd mymoolah-wallet-frontend && npm run build && cd ..`
- [ ] Restart backend: `./scripts/one-click-restart-and-start.sh`
- [ ] Test USSD Tier 0 flow: dial USSD, register new user, verify `kyc_tier = 0`
- [ ] Test web app Tier 1 flow: upload ID document, verify `kyc_tier = 1`
- [ ] Test web app Tier 2 flow: upload POA document, verify `kyc_tier = 2`
- [ ] Test USSD-to-web upgrade: USSD user (Tier 0) logs into web app, uploads ID + POA
- [ ] Test web-to-USSD flow: web user (Tier 1/2) dials USSD, only asked for PIN
- [ ] Define transaction limits per tier (Andre mentioned this as a future task)
- [ ] Run migration in Production when ready

---

## Important Context for Next Agent
- **Migration not yet run**: The `kyc_tier` column does not exist in any database yet. Run `./scripts/run-migrations-master.sh uat` (and staging/production) before testing.
- **`kyc_tier` values**: 0 = USSD basic, 1 = web ID verified, 2 = web ID + POA verified. `NULL` means no KYC tier assigned yet.
- **`kycStatus` is separate from `kyc_tier`**: `kycStatus` tracks workflow state (not_started, pending, verified, rejected, ussd_basic). `kyc_tier` tracks verification level. Both are needed.
- **Frontend redirect logic**: KYCDocumentsPage only redirects Tier 2 users. Tier 1 users see the POA upload option. This is intentional.
- **Existing web-to-USSD flow works correctly**: A web-verified user dialing USSD is only asked to set a PIN (no KYC re-collection). See `ussdMenuService.js` lines 84-97.
- **Andre mentioned tier-based transaction limits as a future task**: The tier system is in place but limits are not yet enforced per tier.
- **Duplicate KYCDocumentsPage.tsx**: Exists in both `pages/` and `components/`. They must stay in sync. The `pages/` version is canonical.

---

## Related Documentation
- `docs/USSD_INTEGRATION_GUIDE.md` — USSD integration reference
- `docs/DATABASE_CONNECTION_GUIDE.md` — Database connection patterns
- `docs/CURSOR_2.0_RULES_FINAL.md` — Project rules and workflows
