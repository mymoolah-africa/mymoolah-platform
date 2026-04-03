# Session Log - 2026-04-03 - Referral System Banking-Grade Fix

**Session Date**: 2026-04-03 09:00 SAST  
**Agent**: Cursor AI Agent (Claude Opus)  
**User**: Andre  
**Session Duration**: ~45 minutes

---

## Session Summary
Complete audit and fix of the referral system. The core bug was that `generateReferralCode()` generated a new random code on every call — meaning the code displayed on the Referral page changed every time the user opened it, and was never persisted. If someone tried to sign up using a copied code, it would fail because that code didn't exist in the database. Fixed by adding a `referral_code` column to the `users` table, generating the code once and reusing it forever. Also fixed `processSignup()` to accept both invite-specific codes and stable user codes, fixed the USSD service that queried a non-existent `referral_codes` table, removed dead frontend code, and hardened error responses (no `error.message` leaking to clients).

---

## Tasks Completed
- [x] Full codebase sweep of all referral files (5 models, 3 services, 1 controller, 1 route, 2 frontend files)
- [x] Production DB queries to verify Andre's referral state (User ID 1, 0 referrals, 5 total users)
- [x] Created migration `20260403_01_add_referral_code_to_users.js` — adds `referral_code` column with unique index
- [x] Added `referral_code` field to User model
- [x] Fixed `generateReferralCode()` — now returns existing code from `users.referral_code`, generates once
- [x] Fixed `processSignup()` — now matches both pending invite rows AND stable user codes
- [x] Fixed `sendReferralInvite()` — SMS sends the stable user code, invite row gets a derived unique code
- [x] Fixed USSD `handleReferralCode()` — queries `users.referral_code` instead of non-existent `referral_codes` table
- [x] Removed dead `getReferralCode()` method from `apiService.ts` (called `/referrals/code` which doesn't exist)
- [x] Parallelized dashboard API calls with `Promise.all()` for performance
- [x] Updated share URL from `app.mymoolah.africa` to `wallet.mymoolah.africa/register`
- [x] Hardened all error responses — removed `message: error.message` leaking internal errors to clients
- [x] Zero linter errors

---

## Key Decisions
- **Stable code on `users` table**: Rather than a separate `referral_codes` table, the code lives directly on `users.referral_code`. Simpler, one lookup, no join needed.
- **Invite-specific codes**: When an SMS invite is sent, the `referrals` table row gets a derived code like `REF-2EE560-A1B2` (base code + 4 random hex chars). This keeps each invite row unique while the SMS contains the shareable stable code.
- **Dual-path signup matching**: `processSignup()` first checks `referrals.referral_code` (invite flow), then `users.referral_code` (copy/share flow). This means both paths work.
- **Self-referral blocked at signup**: If the stable code belongs to the same user registering, it's silently blocked (not an error, just ignored).

---

## Files Modified
- `migrations/20260403_01_add_referral_code_to_users.js` — NEW: adds `referral_code` column + unique index to `users`
- `models/User.js` — Added `referral_code` field definition
- `services/referralService.js` — Rewrote `generateReferralCode()` (stable), `processSignup()` (dual-path), `sendReferralInvite()` (stable code in SMS)
- `controllers/referralController.js` — `Promise.all()` in dashboard, updated share URL, hardened error responses
- `services/ussdMenuService.js` — Fixed `handleReferralCode()` to query `users.referral_code` instead of non-existent `referral_codes` table
- `mymoolah-wallet-frontend/services/apiService.ts` — Removed dead `getReferralCode()` method

---

## Code Changes Summary
- **`referralService.generateReferralCode(userId)`**: Now does `User.findByPk(userId)` → if `user.referral_code` exists, return it immediately. Otherwise generate `REF-XXXXXX`, save to `user.referral_code`, return. Code persists forever.
- **`referralService.processSignup(code, newUserId)`**: Path 1: match `referrals.referral_code` where status=pending (SMS invite flow). Path 2: match `users.referral_code` (copy/share flow) — creates a `referrals` row with `invitationChannel: 'referral_code'`.
- **`referralService.sendReferralInvite()`**: Gets stable code via `generateReferralCode()`, creates invite row with derived code `REF-XXXXXX-YYYY`, sends SMS with stable code.
- **`referralController.getDashboard()`**: 4 parallel async calls via `Promise.all()` instead of sequential.
- **All controller error handlers**: Removed `message: error.message` from JSON responses (banking-grade: don't expose internals).

---

## Issues Encountered
- **`referral_codes` table referenced but never created**: USSD service had a raw SQL query against `referral_codes` — a table that was never created by any migration. Fixed to query `users.referral_code` instead.
- **`getReferralCode()` dead code**: Frontend apiService had a method calling `/api/v1/referrals/code` which has no backend route. The frontend actually uses `/api/v1/referrals/dashboard` which works. Removed the dead method.

---

## Testing Performed
- [x] Production DB queried to verify current state (User 1, 0 referrals, 5 users)
- [x] Linter check on all modified files — zero errors
- [x] Code review of all changes — no breaking changes to existing flows
- [ ] Migration needs to be run on UAT/staging/production
- [ ] End-to-end test needed after migration: open Referral page, verify code persists across refreshes

---

## Next Steps
- [ ] Run migration: `./scripts/run-migrations-master.sh uat` then `staging` then `production`
- [ ] Deploy backend to production
- [ ] Test: Open Referral page → code should be stable across refreshes
- [ ] Test: Copy code → register new user with that code → verify referral chain created
- [ ] Test: Send SMS invite → recipient registers → verify invite row updated

---

## Important Context for Next Agent
- The `referral_code` column on `users` is nullable. Existing users get their code generated lazily on first access (first time they open the Referral page or their code is requested).
- SMS invites store a derived code in `referrals.referral_code` (format `REF-XXXXXX-YYYY`). The SMS itself contains the user's stable code `REF-XXXXXX`.
- `processSignup()` checks both tables in order: invite rows first, then user stable codes. Both paths work.
- The signup bonus (`paySignupBonus`) is still a stub — wallet credits are commented out. This is pre-existing, not a regression.
- `referralEarningsService.getMonthEarnings()` still uses JS `.reduce()` for summing earnings (tech debt from before, low risk at current volume).

---

## Related Documentation
- `docs/AGENT_HANDOVER.md` — updated with this session
- `docs/CHANGELOG.md` — updated with referral fix entry
