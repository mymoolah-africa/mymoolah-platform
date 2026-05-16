# Session Log - 2026-05-16 - FAQ Audience Split

**Session Date**: 2026-05-16 12:17 SAST  
**Agent**: Cursor AI Agent  
**User**: André  
**Session Duration**: Short documentation update

---

## Session Summary
Updated the canonical support FAQ so André can import customer-safe static FAQ entries into the public website while keeping wallet-specific help and AI support KB coverage available from the same source. The work focused on comprehensive self-service wording because MyMoolah does not depend on a traditional support call-centre model.

---

## Tasks Completed
- [x] Audited `docs/FAQ_MASTER.md` against recent wallet, EasyPay, OTT, MoolahMove, notification, Android, API, and policy-access changes.
- [x] Added an audience legend for Website, Wallet, Both, and Support KB usage.
- [x] Expanded "How do I" and troubleshooting entries across registration, KYC, add-money, Send Money, beneficiaries, VAS, vouchers, withdrawals, transaction history, notifications, fees, login/OTP, security, support, API documentation, and policy access.
- [x] Updated `docs/CHANGELOG.md` and `docs/AGENT_HANDOVER.md`.
- [x] Ran the support KB freshness guard.

---

## Key Decisions
- **Single master source**: Kept `docs/FAQ_MASTER.md` as the canonical source, with audience guidance instead of creating separate website and wallet FAQ files.
- **Website-safe default**: Entries are treated as Website/Both unless explicitly marked Wallet or Support KB.
- **No live KB writes**: Did not run any UAT, Staging, or Production KB generation/embedding commands because those update environment data and require André approval.
- **No internal leakage**: Avoided publishing credentials, private API details, SFTP credentials, or confidential policy operations in website-safe wording.

---

## Files Modified
- `docs/FAQ_MASTER.md` - Added audience labels and expanded customer self-service FAQ coverage.
- `docs/CHANGELOG.md` - Added the FAQ audience split documentation entry.
- `docs/AGENT_HANDOVER.md` - Added top-level handover note for the FAQ update and pending KB refresh decision.
- `docs/session_logs/2026-05-16_1217_faq-audience-split.md` - New session continuity log.

---

## Code Changes Summary
No runtime code, database schema, migrations, scripts, frontend components, or environment configuration changed. This was a documentation/support-content update only.

---

## Issues Encountered
- No functional blockers.
- `docs/AGENT_HANDOVER.md` is very large, so targeted search/patching was used instead of full-file reading.

---

## Testing Performed
- [x] Content search for audience labels and risky/internal wording.
- [x] `npm run check:kb:fresh` passed.
- [ ] Unit tests written/updated - Not applicable; documentation-only change.
- [ ] Integration tests run - Not applicable; documentation-only change.

---

## Next Steps
- [ ] André can import Website/Both entries from `docs/FAQ_MASTER.md` into the static website FAQ.
- [ ] If André approves an AI support KB refresh, run the existing `generate:kb:faq:update` and `embed:kb` flow for the chosen target environment.
- [ ] Consider a future export script that emits website-only and wallet-only FAQ files from the master source.

---

## Important Context for Next Agent
- `docs/FAQ_MASTER.md` now includes explicit audience guidance.
- Website import should use Website/Both entries first; Wallet entries belong in authenticated help or support KB.
- Support KB entries are customer-safe, but may include internal support routing context not intended for the public website.
- No environment KB embeddings were refreshed in this session.

---

## Questions/Unresolved Items
- André has not yet requested UAT/Staging/Production KB regeneration or embedding for this FAQ update.
- No separate website export file was created in this session.

---

## Related Documentation
- `docs/FAQ_MASTER.md`
- `docs/CHANGELOG.md`
- `docs/AGENT_HANDOVER.md`
