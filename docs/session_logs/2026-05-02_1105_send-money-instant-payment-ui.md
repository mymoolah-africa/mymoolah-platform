# Session Log - 2026-05-02 - Send Money Instant Payment UI

**Session Date**: 2026-05-02 11:05 SAST  
**Agent**: Cursor AI Agent  
**User**: André  
**Session Duration**: Frontend upgrade checkpoint

---

## Session Summary
Implemented the approved Send Money payment UI upgrade. The wallet now presents bank payments as `Bank Transfer` at the method level and uses a polished `Transfer Speed` selector for `Standard EFT` versus `Instant Payment`, while keeping the internal `payshap` rail value for backend calls. Follow-up in the same session restyled wallet toggle switches and fixed Pay Now bank `Save as Beneficiary` persistence.

---

## Tasks Completed
- [x] Inspected the live routed Send Money page and confirmed `mymoolah-wallet-frontend/pages/SendMoneyPage.tsx` is the active implementation.
- [x] Removed the duplicate top `Instant` tile from the Pay Now payment method grid.
- [x] Replaced the old switch-style instant payment controls with two selectable cards for `Standard EFT` and `Instant Payment`.
- [x] Removed customer-facing `PayShap` wording from the Send Money page.
- [x] Removed fee/cost wording from the form and moved Instant Payment fee acceptance into a confirmation popup.
- [x] Restyled the shared wallet `Switch` primitive to a slim MyMoolah-green toggle.
- [x] Fixed Pay Now bank `Save as Beneficiary` so selected recipients stay saved and unselected one-time recipients are removed after payment.
- [x] Added branch-code persistence for bank recipients created from Send Money.
- [x] Fixed bank payment-account removal in `UnifiedBeneficiaryService`.

---

## Key Decisions
- **Customer wording**: Use `Instant Payment` in the UI because André confirmed customers should not see the term `PayShap`.
- **Backend compatibility**: Preserve the existing internal `payshap` rail value so no API or database changes are required.
- **Payment method hierarchy**: Keep `Bank Transfer` as the high-level option, then show transfer speed only for bank flows.

---

## Files Modified
- `mymoolah-wallet-frontend/pages/SendMoneyPage.tsx` - Updated Add Beneficiary, saved-beneficiary payment, and Pay Now bank payment UI.
- `mymoolah-wallet-frontend/components/ui/switch.tsx` - Replaced black/white switch styling with a MyMoolah-green shared toggle.
- `mymoolah-wallet-frontend/components/overlays/shared/ConfirmationModal.tsx` - Added optional confirm-close control for async Instant Payment confirmation.
- `mymoolah-wallet-frontend/services/beneficiaryService.ts` - Added branch-code support for bank beneficiary creation.
- `services/UnifiedBeneficiaryService.js` - Fixed bank payment-method deactivation when removing bank accounts.
- `docs/AGENT_HANDOVER.md` - Updated latest feature and session log index.
- `docs/CHANGELOG.md` - Added this frontend UI update.
- `docs/session_logs/2026-05-02_1105_send-money-instant-payment-ui.md` - Added this session log.

---

## Code Changes Summary
- Simplified the payment method grid to `MyMoolah`, `Bank Transfer`, and disabled `MoolahMove`.
- Added accessible `aria-pressed` card controls for transfer speed selection.
- Kept standard EFT as the default speed and synchronized Pay Now rail state when selecting Instant Payment.
- Removed the grey inline fee/timing message shown under the Pay Now bank account fields.
- Added an Instant Payment confirmation modal that quotes the fee and total debit before submitting when a bank recipient account is available.
- Made `Save as Beneficiary` control actual persistence: save keeps the created bank payment account; one-time payment removes it after submit.
- Added universal branch-code lookup to Send Money bank creation so wallet-to-bank submit has complete account details.
- Updated backend account removal so bank payment methods are marked inactive through the normalized table.
- Removed all `PayShap` text from the Send Money page while retaining internal rail mapping.

---

## Issues Encountered
- **Focused ESLint debt**: `npx eslint pages/SendMoneyPage.tsx --ext ts,tsx --report-unused-disable-directives --max-warnings 0` still fails because this large legacy page has pre-existing unrelated lint debt such as unused imports, `any` types, and old no-useless-escape warnings.
- **Resolution**: Production build passed, and Cursor lints for the touched file reported no new linter errors.

---

## Testing Performed
- [ ] Unit tests written/updated - Not applicable for this narrow UI-only change.
- [ ] Integration tests run - Not applicable; no API contract changed.
- [ ] Manual testing performed - Code review only; André to verify in Codespaces/browser.
- [x] Test results: `npm run build` in `mymoolah-wallet-frontend` passed.
- [x] Test results: `npm run build` was rerun after removing inline fee copy and adding the Instant Payment confirmation popup; it passed.
- [x] Test results: `node --check services/UnifiedBeneficiaryService.js` passed.
- [x] Test results: Cursor lints on `SendMoneyPage.tsx` reported no linter errors.

---

## Next Steps
- [ ] André should pull/build in Codespaces and visually test the Send Money Pay Now and saved-beneficiary bank payment flows.
- [ ] If desired, split the large legacy Send Money page later so the existing lint debt can be addressed safely in smaller pieces.

---

## Important Context for Next Agent
- `payshap` still appears as an internal TypeScript state/rail value and should not be renamed without coordinating backend/API contracts.
- User-facing Send Money copy should continue to say `Instant Payment`.
- Do not show bank fee/cost copy on the Send Money form itself; fee acceptance belongs in the Instant Payment confirmation popup.
- The `Save as Beneficiary` toggle depends on `BeneficiaryPaymentMethod` cleanup; keep the backend deactivation path aligned with normalized payment methods.
- Existing unrelated dirty changes from the spinner and voucher-logo work were present before this UI update and should not be reverted.

---

## Questions/Unresolved Items
- No product blockers remain for this UI checkpoint.

---

## Related Documentation
- `docs/AGENT_HANDOVER.md`
- `docs/CHANGELOG.md`
