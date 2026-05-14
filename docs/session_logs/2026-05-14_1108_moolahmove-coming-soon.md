# Session Log - 2026-05-14 - MoolahMove Coming Soon

**Session Date**: 2026-05-14 11:08 SAST  
**Agent**: Cursor AI Agent  
**User**: André  
**Session Duration**: Focused wallet UI treatment update

---

## Session Summary
Updated wallet Send Money / Add Account UI so MoolahMove is clearly unavailable and styled as Coming Soon. The Add Account modal now prevents users from selecting the MoolahMove tab while preserving the future implementation behind a feature flag.

---

## Tasks Completed
- [x] Checked git status before edits.
- [x] Used parallel read-only subagents to locate MoolahMove UI surfaces and existing Coming Soon patterns.
- [x] Disabled/fogged the MoolahMove Add Account tab with a blue Coming Soon pill.
- [x] Aligned existing disabled Send Money MoolahMove tiles to the same greyed blue-pill Coming Soon treatment.
- [x] Ran frontend TypeScript/build validation and lints.

---

## Key Decisions
- **No new service added**: Existing MoolahMove scaffolding remains in place for later activation; this change only gates and styles the UI.
- **Feature flag preserved**: `MOOLAHMOVE_ENABLED` is false, so the international form is not rendered and submit defensively rejects MoolahMove while unavailable.
- **Visual alignment**: Used the greyed card/button feel and blue Coming Soon pill shown in André's screenshots rather than the previous amber treatment.

---

## Files Modified
- `mymoolah-wallet-frontend/components/overlays/shared/AddAccountModal.tsx` - Disabled and fogged the MoolahMove tab; gated the international form.
- `mymoolah-wallet-frontend/pages/SendMoneyPage.tsx` - Updated existing disabled MoolahMove tiles to match the blue Coming Soon style.
- `docs/CHANGELOG.md` - Added this UI change entry.
- `docs/AGENT_HANDOVER.md` - Updated latest status and session-log pointer.
- `docs/session_logs/2026-05-14_1108_moolahmove-coming-soon.md` - This session log.

---

## Code Changes Summary
- Add Account now shows MM Wallet and Bank as active options, with MoolahMove visually disabled.
- Existing MoolahMove payment method tiles in Send Money remain disabled but now match the requested Coming Soon visual language.

---

## Issues Encountered
- None.

---

## Testing Performed
- [x] Frontend type check.
- [x] Wallet production build.
- [x] Cursor lints.
- [x] Test results: pass.

Commands/results:
- `npx tsc --noEmit` in `mymoolah-wallet-frontend` - passed.
- `npm run build` in `mymoolah-wallet-frontend` - passed with the existing large chunk warning.
- Cursor lints on touched frontend files - no errors.

---

## Next Steps
- [ ] André to pull and visually confirm the Add Account / Send Money MoolahMove treatments in Codespaces.

---

## Important Context for Next Agent
- Do not remove the MoolahMove scaffold; it is intentionally retained behind `MOOLAHMOVE_ENABLED` for future rollout.
- This was a frontend-only availability treatment. No backend, database, ledger, or production data changed.

---

## Questions/Unresolved Items
- None.

---

## Related Documentation
- `docs/CHANGELOG.md`
- `docs/AGENT_HANDOVER.md`
