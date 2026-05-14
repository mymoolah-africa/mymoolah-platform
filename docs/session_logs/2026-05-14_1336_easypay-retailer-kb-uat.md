# Session Log - 2026-05-14 - EasyPay Retailer KB UAT

**Session Date**: 2026-05-14 13:36 SAST  
**Agent**: Cursor AI Agent  
**User**: André  
**Session Duration**: Focused EasyPay support KB update and UAT refresh

---

## Session Summary
Added Ashleen's EasyPay integration-confirmation information to the support FAQ source in a customer-safe way and refreshed the UAT AI support KB only. The SFTP password and raw credential details were deliberately not added to docs, logs, or the KB.

---

## Tasks Completed
- [x] Read mandatory rules, handover context, recent session logs, database guide, and relevant skills.
- [x] Used parallel read-only subagents to confirm the KB pipeline and avoid duplicating existing EasyPay/SFTP documentation.
- [x] Updated `docs/FAQ_MASTER.md` with confirmed EasyPay add-money retailer/channel availability, receiver-query escalation, and macOS-safe SFTP guidance.
- [x] Refreshed UAT KB using the approved FAQ-only pipeline.
- [x] Updated `docs/CHANGELOG.md` and `docs/AGENT_HANDOVER.md`.

---

## Key Decisions
- **No secrets in KB**: EasyPay SFTP credentials from the email were not stored in source docs, session logs, or the support KB.
- **Customer-safe KB scope**: Added retailer/channel and escalation guidance for EasyPay cash-in only, while reinforcing that EasyPay is not a MyMoolah cash-withdrawal path.
- **UAT only**: Staging and Production KB refreshes are intentionally pending until André tests UAT.

---

## Files Modified
- `docs/FAQ_MASTER.md` - Added EasyPay retailer/channel availability, SalesSupport escalation, and macOS SFTP clarification.
- `docs/CHANGELOG.md` - Documented the FAQ and UAT KB refresh.
- `docs/AGENT_HANDOVER.md` - Updated latest status and next-agent context.
- `docs/session_logs/2026-05-14_1336_easypay-retailer-kb-uat.md` - This session log.

---

## Code Changes Summary
No application code, schema, migrations, ledger logic, or production data changed.

---

## Issues Encountered
- **UAT DB ECONNRESET**: The first `npm run generate:kb:faq:update` completed OpenAI embeddings but failed before DB write with `read ECONNRESET`.
- **Resolution**: Restarted only the UAT Cloud SQL proxy on port `6543`, verified DB connectivity with `SELECT NOW()`, then reran the UAT pipeline successfully.

---

## Testing Performed
- [x] KB freshness guard passed.
- [x] UAT FAQ KB generation run.
- [x] UAT generated KB activation run.
- [x] UAT KB embedding run.
- [x] Test results: pass.

Commands/results:
- `npm run check:kb:fresh` - passed.
- `npm run generate:kb:faq:update` - after UAT proxy restart, inserted 4 rows and updated 129 rows.
- `npm run activate:kb` - activated 4 pending generated rows; total active UAT KB entries now 337.
- `npm run embed:kb` - embedded 337 active UAT rows with 0 failures.

---

## Next Steps
- [ ] André to test the UAT support bot responses for EasyPay retailer/channel questions and WinSCP/SFTP guidance.
- [ ] After André approves UAT, run the same FAQ-only KB refresh for Staging and Production: `npm run generate:kb:faq:update:staging && npm run embed:kb:staging`, then `npm run generate:kb:faq:update:production && npm run embed:kb:production`.
- [ ] Store EasyPay SFTP credentials only in an approved secure store; do not add them to docs or KB.

---

## Important Context for Next Agent
- The EasyPay SFTP host and username were present in André's pasted email, but the password is sensitive and must not be repeated or committed.
- macOS does not need WinSCP; recommended options are Cyberduck, FileZilla, Transmit, ForkLift, Mountain Duck, or Terminal `sftp`.
- UAT KB is now refreshed. Staging and Production are not refreshed for this new retailer/SFTP wording yet.

---

## Questions/Unresolved Items
- André needs to test UAT before approving Staging and Production KB refresh.
- EasyPay's indicated PEP/Ackermans and Pick n Pay/Boxer timing remains partner/channel-testing dependent.

---

## Related Documentation
- `docs/FAQ_MASTER.md`
- `docs/CHANGELOG.md`
- `docs/AGENT_HANDOVER.md`
- `docs/integrations/EasyPay_API_Integration_Guide.md`
