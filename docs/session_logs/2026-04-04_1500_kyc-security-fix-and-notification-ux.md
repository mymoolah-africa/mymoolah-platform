# Session Log - 2026-04-04 - KYC Security Fix & Notification UX

**Session Date**: 2026-04-04 15:00  
**Agent**: Cursor AI Agent  
**User**: Andre  
**Continuation of**: `2026-04-04_1130_staging-production-parity-fixes.md`

---

## Session Summary
Fixed a critical KYC security vulnerability where documents from a different person could pass validation when the registered user had no ID number on file. Redesigned the notification popup modal for the wallet frontend. Fixed the profile page showing stale "KYC Required" after successful verification. Reduced KYC auto-navigation delay.

---

## Tasks Completed
- [x] CRITICAL: KYC OCR security fix — reject verification when no registered ID on user profile
- [x] Notification popup modal redesigned — slide-down panel from TopBanner, fits 375px wallet width, animated
- [x] KYC auto-navigation delay reduced from 3s to 1.5s
- [x] Profile page now refreshes user status on mount (fixes stale KYC badge)

---

## Key Decisions
- **ID number is mandatory for KYC**: If `user.idNumber` is null/empty, KYC is rejected with a message to contact support. Previously the ID check was silently skipped.
- **First names NOT validated**: Andre explicitly confirmed that only surname matching is required. First name differences are acceptable (initials, nicknames, etc.).
- **Expiry dates checked for Passports AND SA Driver's Licences**: Both must be valid (not expired). SA Driver's Licence has two dates — use the LAST date as expiry. SA ID and Temporary ID Certificate have no expiry check.
- **Notification modal redesigned as slide-down panel**: Drops from below the TopBanner at the wallet's 375px max-width, with animated entry, category-colored dots, and proper close button.

---

## Files Modified
- `services/kycService.js` — Fixed ID number bypass: reject when `user.idNumber` is null/empty instead of skipping the check
- `mymoolah-wallet-frontend/components/TopBanner.tsx` — Complete redesign of notification popup modal with animations, proper width, scrollable list, colored category dots
- `mymoolah-wallet-frontend/pages/KYCStatusPage.tsx` — Auto-nav delay 3s → 1.5s
- `mymoolah-wallet-frontend/components/KYCStatusPage.tsx` — Auto-nav delay 3s → 1.5s
- `mymoolah-wallet-frontend/pages/ProfilePage.tsx` — Added `useEffect` to refresh user status on mount
- `mymoolah-wallet-frontend/components/ProfilePage.tsx` — Same refresh on mount fix

---

## Code Changes Summary
- **KYC Security (backend)**: The `validateDocumentAgainstUser` method in `kycService.js` now has three sequential guards: (1) reject if no registered ID, (2) reject if no document ID found, (3) reject if IDs don't match. Previously, the combined `if (registeredId && docIdForMatch)` condition silently skipped when `registeredId` was empty.
- **Notification UI (frontend)**: Replaced the basic `maxWidth: 360` centered white box with a 375px-wide slide-down panel anchored to the TopBanner. Added `notifOverlayIn` and `notifSlideDown` CSS keyframe animations. Notifications are color-coded by category (green for KYC, blue for payments, brand green for others).
- **Profile refresh (frontend)**: Added `useEffect(() => refreshUserStatus(), [])` so the profile page always has the latest KYC status when opened.

---

## Issues Encountered
- **ID bypass allowed wrong-person KYC**: Root cause was `if (registeredId && docIdForMatch)` evaluating to `false` when `registeredId` was empty, skipping the entire ID check. Only surname was compared, which matched for family members.
- **User clarification needed on expiry rules**: Initial misunderstanding that expiry checks should only apply to SA Driver's Licences. Andre clarified that passports must also be valid (not expired). The existing code already handles this correctly.

---

## Testing Performed
- [ ] Unit tests written/updated
- [ ] Integration tests run
- [x] Manual testing required — Andre to deploy to staging and test KYC flow
- [ ] Test results: pending Andre's staging test

---

## Next Steps
- [ ] Deploy to staging: `./scripts/deploy-backend.sh staging` and `./scripts/deploy-wallet.sh staging`
- [ ] Test KYC flow in staging: try verifying with correct ID, then with wrong-person document
- [ ] If staging passes, deploy to production
- [ ] Ensure Andre's test user has an idNumber set before KYC test

---

## Important Context for Next Agent
- **KYC validation rules (confirmed by Andre)**:
  - ID Number: MUST match exactly against `user.idNumber`. If no ID on file → reject.
  - Surname: MUST match exactly (Jaro-Winkler 0.999 threshold).
  - First names: COMPLETELY IGNORED — never validated, never cause failure.
  - Expiry: Checked for SA Driver's Licence (use LAST of two dates) and Passports. NOT checked for SA ID or Temporary ID.
- **Notification modal**: The `TopBanner.tsx` notification popup was redesigned but the blocking overlay (payment requests) was left unchanged as it works correctly.
- **Profile page**: Now auto-refreshes user status on mount. This may cause a brief flash if the API is slow, but ensures status is always current.
- **Duplicate component files**: Both `pages/` and `components/` directories contain copies of KYCStatusPage, KYCDocumentsPage, and ProfilePage. Changes must be applied to both.

---

## Related Documentation
- Previous session: `docs/session_logs/2026-04-04_1130_staging-production-parity-fixes.md`
