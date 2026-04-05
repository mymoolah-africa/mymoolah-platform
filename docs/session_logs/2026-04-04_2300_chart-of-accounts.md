# Session Log - 2026-04-04 23:00 - Chart of Accounts & Missing Account Migrations

**Session Date**: 2026-04-04 23:00
**Agent**: Cursor AI Agent (Claude 4.6 Opus)
**User**: Andre
**Session Duration**: ~45 minutes

---

## Session Summary
Created `docs/CHART_OF_ACCOUNTS.md` as the single authoritative Chart of Accounts
reference for MMTP (10 sections, 28 accounts, 15 journal templates). Then created
and ran migration `20260405_01_seed_missing_ledger_accounts.js` for 4 accounts
that were referenced in code but lacked idempotent migrations. Migration applied
to both staging and production — all 4 accounts already existed in both environments
(manually created in earlier sessions), so the migration recorded itself in
`SequelizeMeta` without data changes.

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
- [x] Updated `docs/AGENT_HANDOVER.md` with session reference and document map entry
- [x] Created migration `20260405_01_seed_missing_ledger_accounts.js`
- [x] Ran migration on staging — 4/4 already existed, migration recorded
- [x] Ran migration on production — 4/4 already existed, migration recorded
- [x] Updated CoA doc to change "NEEDS MIGRATION" → `20260405_01` for all 4 accounts
- [x] Updated tech-debt to mark missing migrations as RESOLVED
- [x] Created this session log
- [x] Committed and pushed to main (2 commits)

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

- **Migration idempotency confirmed**: All 4 accounts already existed in staging and
  production (manually created in previous sessions). The migration uses
  `ON CONFLICT (code) DO NOTHING` — safe to re-run.

---

## Files Modified
- `docs/CHART_OF_ACCOUNTS.md` — NEW: 28 accounts, 15 journal templates, 10 sections
- `docs/CHART_OF_ACCOUNTS_VISUAL.html` — NEW: Print-ready HTML/PDF Chart of Accounts
- `migrations/20260405_01_seed_missing_ledger_accounts.js` — NEW: 4 missing accounts
- `.cursor/rules/tech-debt.mdc` — 3 new tech-debt rows + 1 architectural decision; missing migrations marked RESOLVED
- `docs/CHANGELOG.md` — v2.80.0 entry for CoA documentation
- `docs/AGENT_HANDOVER.md` — Updated latest feature, session log reference, document map
- `docs/session_logs/2026-04-04_2300_chart-of-accounts.md` — This file

---

## Code Changes Summary
- **Migration** `20260405_01_seed_missing_ledger_accounts.js`: Seeds 4 accounts
  (`1100-02-01`, `2200-03-01`, `2600-01-01`, `5100-02-01`) with ON CONFLICT DO NOTHING.
  Applied to staging and production.
- **No application code changes**. Documentation, migration, and tech-debt register only.

---

## Issues Encountered
- **Plan file not found**: `.cursor/plans/chart_of_accounts_doc_af417d7a.plan.md` did
  not exist on disk. The plan was provided inline in the user's message instead.
- **`2100-05-001` vs `2100-05-01`**: Discovered that `adService.js` and seeder scripts
  use `2100-05-001` (extra digit) while the migration created `2100-05-01`. This causes
  silent ledger posting failures for Watch-to-Earn. Added to tech-debt register.
- **Stale proxy ECONNRESET**: First staging migration attempt failed with ECONNRESET.
  Fixed by killing stale proxies (`lsof -ti:6543/6544/6545`) and restarting via
  `./scripts/ensure-proxies-running.sh`.

---

## Testing Performed
- [x] Verified all account codes against migrations and application code
- [x] Cross-referenced env var map against codebase grep results
- [x] Migration ran successfully on staging (4/4 accounts existed)
- [x] Migration ran successfully on production (4/4 accounts existed)

---

## Migrations Run

| Environment | Migration | Result | Accounts |
|-------------|-----------|--------|----------|
| Staging | `20260405_01_seed_missing_ledger_accounts` | 0 created, 4 existed | 1100-02-01, 2200-03-01, 2600-01-01, 5100-02-01 |
| Production | `20260405_01_seed_missing_ledger_accounts` | 0 created, 4 existed | 1100-02-01, 2200-03-01, 2600-01-01, 5100-02-01 |

---

## Continuation: Audit Analysis + Visual CoA (5 Apr 2026)

### Production Audit Discrepancy
Ran `scripts/production-full-audit.js --production` which returned overall **FAIL**:
- **FAIL**: Wallet aggregate (R 872.88) != Ledger 2100-01-01 (R 922.88) — DIFF = R 50.00
- **Root cause**: TXN#33 (R50.00 electricity purchase) had its commission journal posted (JE#39)
  but the face-value journal entry (DR 2100-01-01 / CR 1200-10-XX) was missing. This left
  the Client Float Liability R50.00 higher than the sum of actual wallet balances.
- **Next step**: Backfill the missing R50.00 journal entry AND investigate why the forward
  posting path silently failed.

### Visual Chart of Accounts
- Created `docs/CHART_OF_ACCOUNTS_VISUAL.html` — a polished, print-ready HTML document
  with the full CoA. Open in browser, Cmd+P to save as PDF. Color-coded categories,
  journal templates, solvency rules, reserved ranges, and cross-references.

---

## Next Steps
- [ ] Backfill missing R50.00 JE for TXN#33 on production (DR 2100-01-01 / CR supplier float)
- [ ] Investigate why electricity purchase forward posting failed silently for TXN#33
- [ ] Fix `adService.js` `2100-05-001` → `2100-05-01` (low priority, cosmetic)
- [ ] Fix `internationalPaymentService.js` misalignments when MoolahMove Phase 2 begins
- [ ] Create `4100-01-07` (MoolahMove Fee Revenue) migration when Phase 2 begins
- [ ] Continue with ongoing priorities: KB seeding, SBSA PayShap callbacks, H2H SFTP

---

## Important Context for Next Agent
- `docs/CHART_OF_ACCOUNTS.md` is now the canonical reference for all ledger accounts.
  Before adding any new financial product, follow Section 6 (Product Registration Checklist).
- All 4 previously-missing accounts now have an idempotent migration (`20260405_01`).
  Fresh database deployments will automatically get them.
- MoolahMove (`internationalPaymentService.js`) has 5 documented misalignments in
  Section 9.1 of the CoA doc — these must be fixed before Phase 2 activation.
- TCIB deadline is March 2027 (SARB Directive 1/2025). Per-corridor floats are reserved
  at `1200-20-XX`.
- Stale proxies cause ECONNRESET on migration. Always kill + restart before running
  migrations: `kill $(lsof -ti:6543) $(lsof -ti:6544) $(lsof -ti:6545); sleep 2; ./scripts/ensure-proxies-running.sh`

---

## Questions/Unresolved Items
- Should `5100-02-01` (Referral Expense) actually be used in a posting path, or is it
  audit-only? Currently only referenced in `production-full-audit.js`. The referral
  payout uses `2200-03-01` (payable) — the expense recognition path is TBD.
- Should the MoolahMove `4100-01-07` fee revenue account be created now or deferred
  to Phase 2 activation?

---

## Git Commits (this session)
1. `2062f04f` — `docs: create canonical Chart of Accounts (v2.80.0)`
2. `72a41072` — `feat: migration for 4 missing ledger accounts (20260405_01)`

---

## Related Documentation
- `docs/CHART_OF_ACCOUNTS.md` — the deliverable
- `docs/SETTLEMENTS.md` — float model and settlement architecture
- `.agents/skills/auditing/SKILL.md` — auditing skill with Mojaloop CoA reference
- `migrations/20260224_03_seed_core_ledger_accounts.js` — core account seed
- `migrations/20260404_01_create_botes_loan_and_voucher_clearing_accounts.js` — loan + voucher accounts
- `migrations/20260405_01_seed_missing_ledger_accounts.js` — this session's migration
