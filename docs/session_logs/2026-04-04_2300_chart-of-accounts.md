# Session Log - 2026-04-04 23:00 - Chart of Accounts Documentation

**Session Date**: 2026-04-04 23:00
**Agent**: Cursor AI Agent (Claude 4.6 Opus)
**User**: Andre
**Session Duration**: ~30 minutes

---

## Session Summary
Created `docs/CHART_OF_ACCOUNTS.md` as the single authoritative Chart of Accounts
reference for MMTP. Documentation-only task — no application code changes.
Updated tech-debt register with 3 new rows and 1 architectural decision.

---

## Tasks Completed
- [x] Read rules file (`docs/CURSOR_2.0_RULES_FINAL.md`) and confirmed compliance
- [x] Read handover, recent session logs, changelog, git status
- [x] Explored codebase to find all ledger account codes across migrations and application code
- [x] Identified 4 code-referenced accounts without migrations: `2200-03-01`, `2600-01-01`, `5100-02-01`, `1100-02-01`
- [x] Analyzed `internationalPaymentService.js` for MoolahMove misalignments
- [x] Created `docs/CHART_OF_ACCOUNTS.md` with 10 comprehensive sections
- [x] Updated `.cursor/rules/tech-debt.mdc` with 3 tech-debt rows + 1 architectural decision
- [x] Updated `docs/CHANGELOG.md` with v2.80.0 entry
- [x] Updated `docs/AGENT_HANDOVER.md` with session reference
- [x] Created this session log
- [x] Committed and pushed to main

---

## Key Decisions

- **MoolahMove as pass-through**: Documented MoolahMove as a simple ZAR-USDC-YellowCard
  pass-through model. MMTP does NOT need a Yellow Card float account. `1200-10-07`
  is exclusively PayShap Outbound. If MoolahMove Phase 2 needs clearing, allocate
  `1200-10-11` or similar.

- **VAT canonical account**: `2300-10-01` is the canonical VAT Control Account for
  all flows. `2300-01-01` used in `internationalPaymentService.js` is a misalignment
  that should be corrected when MoolahMove Phase 2 begins.

- **Reserved ranges**: Pre-allocated ranges for 10 future product verticals to prevent
  code conflicts when multiple products are developed in parallel. TCIB gets
  `1200-20-XX` for per-corridor floats.

- **4 missing migrations flagged as tech-debt**: Rather than creating the migration in
  this documentation-only session, flagged in tech-debt with specific migration name
  (`20260405_01_seed_missing_ledger_accounts.js`) for the next development session.

---

## Files Modified
- `docs/CHART_OF_ACCOUNTS.md` — NEW: 28 accounts, 15 journal templates, 10 sections
- `.cursor/rules/tech-debt.mdc` — 3 new tech-debt rows + 1 architectural decision
- `docs/CHANGELOG.md` — v2.80.0 entry for CoA documentation
- `docs/AGENT_HANDOVER.md` — Updated latest feature, session log reference
- `docs/session_logs/2026-04-04_2300_chart-of-accounts.md` — This file

---

## Code Changes Summary
No application code changes. Documentation and tech-debt register only, per task constraints.

---

## Issues Encountered
- **Plan file not found**: `.cursor/plans/chart_of_accounts_doc_af417d7a.plan.md` did
  not exist on disk. The plan was provided inline in the user's message instead.
- **`2100-05-001` vs `2100-05-01`**: Discovered that `adService.js` and seeder scripts
  use `2100-05-001` (extra digit) while the migration created `2100-05-01`. This causes
  silent ledger posting failures for Watch-to-Earn. Added to tech-debt register.

---

## Testing Performed
- [x] Verified all account codes against migrations and application code
- [x] Cross-referenced env var map against codebase grep results
- [ ] No runtime testing needed (documentation only)

---

## Next Steps
- [ ] Create migration `20260405_01_seed_missing_ledger_accounts.js` for the 4 missing accounts
- [ ] Fix `adService.js` `2100-05-001` → `2100-05-01` (low priority, cosmetic)
- [ ] Fix `internationalPaymentService.js` misalignments when MoolahMove Phase 2 begins
- [ ] Add `docs/CHART_OF_ACCOUNTS.md` to the Document Map in `docs/AGENT_HANDOVER.md`

---

## Important Context for Next Agent
- `docs/CHART_OF_ACCOUNTS.md` is now the canonical reference for all ledger accounts.
  Before adding any new financial product, follow Section 6 (Product Registration Checklist).
- The 4 accounts marked "NEEDS MIGRATION" work in current environments because they were
  manually created or env vars are set. A fresh database deployment will NOT have them.
- MoolahMove (`internationalPaymentService.js`) has 5 documented misalignments in
  Section 9.1 of the CoA doc — these must be fixed before Phase 2 activation.
- TCIB deadline is March 2027 (SARB Directive 1/2025). Per-corridor floats are reserved
  at `1200-20-XX`.

---

## Questions/Unresolved Items
- Should `5100-02-01` (Referral Expense) actually be used in a posting path, or is it
  audit-only? Currently only referenced in `production-full-audit.js`. The referral
  payout uses `2200-03-01` (payable) — the expense recognition path is TBD.
- Should the MoolahMove `4100-01-07` fee revenue account be created now (in the missing
  migrations batch) or deferred to Phase 2 activation?

---

## Related Documentation
- `docs/CHART_OF_ACCOUNTS.md` — the deliverable
- `docs/SETTLEMENTS.md` — float model and settlement architecture
- `.agents/skills/auditing/SKILL.md` — auditing skill with Mojaloop CoA reference
- `migrations/20260224_03_seed_core_ledger_accounts.js` — core account seed
- `migrations/20260404_01_create_botes_loan_and_voucher_clearing_accounts.js` — latest accounts
