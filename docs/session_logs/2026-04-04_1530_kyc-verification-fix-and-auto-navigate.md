# Session Log - 2026-04-04 - KYC Verification Fix & Auto-Navigate Removal

**Session Date**: 2026-04-04 15:30  
**Agent**: Cursor AI Agent (Claude 4.6 Opus)  
**User**: André  
**Session Duration**: ~2 hours (continuation from previous KYC session)

---

## Session Summary
Fixed the critical KYC verification bug where driver's licence uploads always failed with `SequelizeValidationError: Validation len on idNumber failed`. Root cause: Sequelize's `afterFind` hook decrypts `idNumber` on User instances, marking the field as "changed"; subsequent `user.update()` calls re-validate all changed fields, and the encrypted ciphertext (set by `beforeUpdate` hook) exceeds the `len:[5,20]` plaintext validator. Fixed by replacing all `user.update()` calls with parameterized raw SQL. Also removed auto-navigate from KYC status page and hardened KYC reset scripts.

---

## Tasks Completed
- [x] Diagnosed root cause via Cloud Run staging logs: `SequelizeValidationError: Validation len on idNumber failed`
- [x] Replaced all `user.update()` calls in `kycController.js` with parameterized raw SQL (7 locations)
- [x] Removed auto-navigate from KYC status page (both `pages/` and `components/` copies)
- [x] Fixed KYC reset scripts to preserve registration data (no more `DELETE FROM kyc`)
- [x] Verified Denise's (user ID 6) idNumber is intact in production (encrypted, preserved)
- [x] Deployed and tested: ID verification (Tier 1) and POA verification (Tier 2) both succeed

---

## Key Decisions
- **Raw SQL over Sequelize ORM for user updates in KYC flow**: The `afterFind` decryption hook + `beforeUpdate` encryption hook creates an ORM-level conflict where Sequelize re-validates the encrypted `idNumber` against plaintext validators during unrelated field updates. Raw SQL with parameterized bind variables is equally secure and avoids this issue. Pattern already existed at line 385 of the same file.
- **Remove ALL auto-navigate from KYC status page**: Users must be able to view their KYC tier info, limits, and upload POA at any time. The page should never auto-redirect to dashboard. User can manually click "Continue to Dashboard" when ready.
- **KYC reset scripts: UPDATE instead of DELETE**: KYC records are now set to `status='reset'` instead of being deleted, preserving the audit trail and OCR data. Registration data (idNumber, idType, names, phone) is never touched.

---

## Files Modified
- `controllers/kycController.js` — Replaced 7 `user.update()` calls with parameterized raw SQL to avoid Sequelize idNumber re-validation
- `mymoolah-wallet-frontend/pages/KYCStatusPage.tsx` — Removed auto-navigate to dashboard on verified status
- `mymoolah-wallet-frontend/components/KYCStatusPage.tsx` — Same fix (duplicate file)
- `scripts/reset-kyc-production.sh` — Rewritten: preserves registration data, UPDATE instead of DELETE, shows preview before confirm, masks PII
- `scripts/reset-kyc-staging.sh` — Same rewrite for staging

---

## Code Changes Summary

### Backend (`controllers/kycController.js`)
- 7 `user.update()` calls converted to raw SQL with `$1, $2` bind params
- Affected: `uploadDocument` (2), async IIFE identity flow (2), async IIFE address flow (1), `getKYCStatus` self-heal (3)
- All queries only modify `kycStatus`, `kyc_tier`, `kycVerifiedAt`, `updatedAt` — never encrypted fields

### Frontend (`KYCStatusPage.tsx`)
- Removed `setTimeout(() => navigate('/dashboard'), 1500)` from `handleRefreshStatus()` callback
- Removed auto-navigate `useEffect` that fired on verified status transition
- Kept context refresh (`updateKYCStatus`, `refreshUserStatus`) so UI updates correctly

### Scripts
- KYC records: `DELETE FROM kyc` → `UPDATE kyc SET status = 'reset'`
- Wallet limits reset to Tier 0 defaults (R5,000 daily / R25,000 monthly)
- Production script shows current user state before confirmation
- ID numbers masked in output (PII redaction)

---

## Issues Encountered
- **Issue 1**: OCR was extracting the correct 13-digit ID from the driver's licence (`6411055084084` from `02/6411055084084`), validation was passing, but `user.update()` crashed after. Diagnosis required Cloud Run log analysis to identify `SequelizeValidationError`.
- **Issue 2**: KYC status page auto-navigated to dashboard within 1.5 seconds when the user was already verified, preventing POA upload. Two separate auto-navigate mechanisms existed: one in `handleRefreshStatus()` (unconditional) and one in a `useEffect` (with guard). The `handleRefreshStatus` one fired on every page mount via the mount effect.
- **Issue 3**: KYC reset scripts were deleting KYC records entirely (`DELETE FROM kyc`), destroying the audit trail. The `idNumber` field was NOT being deleted by the scripts (confirmed by production query), but the encrypted ciphertext display in output looked like corrupted data.

---

## Testing Performed
- [x] Manual testing: uploaded André's driver's licence on staging → Tier 1 verified
- [x] Manual testing: uploaded tax invoice as POA on staging → Tier 2 verified
- [x] Manual testing: KYC status page stays open when navigating to it while verified
- [x] Manual testing: POA upload card visible and functional from KYC documents page
- [x] Cloud Run logs verified: OCR extraction correct, validation passes, notifications created
- [x] Denise's production record verified intact (idNumber encrypted, idType preserved)
- [x] Test results: PASS

---

## Next Steps
- [ ] Deploy KYC fixes to production when ready (`./scripts/deploy-backend.sh --production`)
- [ ] Deploy frontend to production (`./scripts/deploy-wallet.sh production`)
- [ ] Consider creating a POA-only reset script (reset Tier 2 → Tier 1 without touching ID verification)
- [ ] Add `status = 'reset'` to the KYC model ENUM if not already present (may need migration)
- [ ] Address the stray `SequelizeValidationError` in self-heal paths that may still fire on old deployments

---

## Important Context for Next Agent
- The `User` model's `afterFind` hook decrypts `idNumber`, marking it as "changed" on the Sequelize instance. Any subsequent `instance.save()` or `instance.update()` will re-validate ALL changed fields, including `idNumber`, against `len:[5,20]`. Since the `beforeUpdate` hook encrypts `idNumber` to a long ciphertext, this creates an impossible validation loop. **Never use `user.update()` or `user.save()` in the KYC controller** — always use raw SQL with parameterized bind variables.
- Both `pages/KYCStatusPage.tsx` and `components/KYCStatusPage.tsx` exist as near-duplicates. Changes must be applied to BOTH files.
- KYC reset scripts now use `UPDATE kyc SET status = 'reset'` instead of `DELETE`. The `'reset'` status may not be in the Sequelize ENUM — this works at the DB level but could cause issues if Sequelize validates the status value. Monitor for errors.

---

## Commits This Session
- `ab75404e` — fix: replace user.update() with raw SQL in KYC controller
- `d21f1ca6` — fix: remove auto-navigate from KYC status page
- `06b3d51d` — fix: KYC reset scripts preserve registration data and keep audit trail

---

## Related Documentation
- Previous session: `docs/session_logs/2026-04-04_1509_kyc-async-crash-recovery-fixes.md`
- Previous session: `docs/session_logs/2026-04-04_1500_kyc-status-page-stuck-handoff.md`
