# Session Log - 2026-04-30 - PayShap H2H Fallback

**Session Date**: 2026-04-30 08:58-10:25 SAST  
**Agent**: Cursor AI Agent  
**User**: André  
**Session Duration**: ~90 minutes

---

## Session Summary
Implemented phase 1 of the duplicate-proof PayShap H2H fallback. RPP / PayShapID / plain inbound PayShap credits now use a database-backed inbound-credit event gate, and H2H statement `TRF` lines only enter fallback when they look like inbound PayShap/RPP credits.

---

## Tasks Completed
- [x] Created inbound credit event and source models.
- [x] Added migration `20260430_01_create_sbsa_inbound_credit_events.js`.
- [x] Added `services/standardbank/inboundCreditEventService.js` for source fingerprint and reconciliation-key claims.
- [x] Routed inbound PayShap callback paths through the event gate metadata.
- [x] Added controlled H2H `TRF` fallback classification while preserving skip behavior for unrelated `TRF` and RTP-shaped lines.
- [x] Extended production audit checks for inbound-credit duplicate evidence.
- [x] Added targeted Jest tests and updated H2H/changelog/handover/rules documentation.

---

## Key Decisions
- **Phase 1 excludes RTP**: André selected RPP / PayShapID / plain inbound PayShap credits first. RTP remains phase 2 because RTP paid callbacks include fee/net-credit rules.
- **Database gate before wallet credit**: `sbsa_inbound_credit_events.reconciliation_key` is unique, so PayShap and H2H sources for the same normalized reference, amount, and currency can only create one credited event.
- **Conservative ambiguity handling**: Same-reference/same-amount collisions are suppressed rather than auto-crediting twice. This may require manual review for rare legitimate duplicate same-amount deposits, but prevents double credits.
- **Broad `TRF` auto-crediting remains forbidden**: Only PayShap/RPP-looking credit narratives can enter the fallback gate; RTP and unrelated `TRF` lines remain skipped.

---

## Files Modified
- `models/SBSAInboundCreditEvent.js` - New logical inbound credit event model.
- `models/SBSAInboundCreditEventSource.js` - New observed source/audit model.
- `migrations/20260430_01_create_sbsa_inbound_credit_events.js` - Creates event/source tables and unique indexes.
- `services/standardbank/inboundCreditEventService.js` - Claims source fingerprints and reconciliation keys.
- `services/standardbankDepositNotificationService.js` - Uses the event gate before wallet/float crediting and stores event evidence.
- `controllers/standardbankController.js` - Adds event metadata to inbound PayShap paths.
- `services/standardbank/sbsaStatementService.js` - Adds controlled PayShap/RPP `TRF` fallback classifier.
- `scripts/production-full-audit.js` - Adds SBSA inbound credit event audit checks.
- `tests/standardbank/inboundCreditEventService.test.js` - New event gate tests.
- `tests/standardbank/sbsaStatementService.statementCreditSafety.test.js` - Updated statement safety tests.
- `docs/SBSA_H2H_SETUP_GUIDE.md`, `docs/CHANGELOG.md`, `docs/AGENT_HANDOVER.md`, `docs/CURSOR_2.0_RULES_FINAL.md` - Updated operational and handover docs.

---

## Code Changes Summary
- PayShap callbacks and H2H statement fallback candidates now attach source evidence to one channel-neutral inbound-credit event.
- The deposit notification service suppresses delayed duplicate sources before any wallet mutation.
- Statement `DEP` handling remains unchanged; statement `TRF` fallback is narrowly gated to PayShap/RPP-looking credits and excludes RTP.
- Production audit now reports duplicate wallet/journal evidence, multi-source events, and fallback suspense/failure states.

---

## Issues Encountered
- The existing cross-channel duplicate guard was a 90-second runtime check only; this was replaced for PayShap fallback paths with a database-backed reconciliation key.
- Legitimate same-reference/same-amount duplicate deposits are intentionally conservative: they will not auto-credit twice through the fallback gate and should be reviewed manually if they occur.
- Ledger posting in the existing deposit service remains outside the wallet transaction; event metadata records whether the ledger post succeeded for audit follow-up.

---

## Testing Performed
- [x] Unit tests written/updated.
- [x] Syntax checks passed.
- [x] Targeted Jest tests passed.
- [x] Broader Standard Bank suite attempted; unrelated `pain002PollerService.test.js` failures remain outside this fallback change.
- [ ] Migration has not yet been run in UAT/staging/production.

Commands:

```bash
node --check models/SBSAInboundCreditEvent.js && node --check models/SBSAInboundCreditEventSource.js && node --check migrations/20260430_01_create_sbsa_inbound_credit_events.js && node --check services/standardbank/inboundCreditEventService.js && node --check services/standardbankDepositNotificationService.js && node --check services/standardbank/sbsaStatementService.js && node --check controllers/standardbankController.js && node --check scripts/production-full-audit.js
npx jest tests/standardbank/inboundCreditEventService.test.js tests/standardbank/sbsaStatementService.statementCreditSafety.test.js --runInBand
npx jest tests/standardbank --runInBand
```

---

## Next Steps
- [ ] Run migration in UAT via `./scripts/run-migrations-master.sh uat`.
- [ ] Run migration in staging after UAT passes.
- [ ] Run production migration only after André approval.
- [ ] Deploy backend after migration so the new tables exist before the event gate runs.
- [ ] Design RTP fallback as a separate phase.

---

## Important Context for Next Agent
- Do not remove the phase-1 RTP exclusion without a separate RTP accounting design.
- `sbsa_inbound_credit_events.reconciliation_key` intentionally prioritizes no double-crediting over auto-crediting ambiguous same-reference/same-amount duplicates.
- H2H fallback only starts for `TRF` credit lines whose narrative looks like PayShap/RPP inbound money; unrelated `TRF` lines remain skipped.

---

## Questions/Unresolved Items
- Should same-reference/same-amount duplicate deposits within the PayShap fallback domain get a maker-checker manual allocation screen in MMAP?
- Should ledger posting be moved into a shared atomic journal helper in a later hardening pass?

---

## Related Documentation
- `docs/SBSA_H2H_SETUP_GUIDE.md`
- `docs/CHANGELOG.md`
- `docs/AGENT_HANDOVER.md`
- `docs/CURSOR_2.0_RULES_FINAL.md`
