# Session Log - 2026-05-12 - AI Support KB Refresh

**Session Date**: 2026-05-12 17:23 SAST  
**Agent**: Cursor AI Agent  
**User**: André  
**Session Duration**: New session / AI support knowledgebase sweep

---

## Session Summary
Swept the existing AI support/RAG knowledgebase path and confirmed the live support assistant uses `ai_knowledge_base` rows populated from `docs/FAQ_MASTER.md` via the existing `generate:kb` and `embed:kb` scripts. Updated the FAQ source from its 20 April 2026 baseline with May 2026 support-facing changes and added a local freshness guard so commit/push workflows are blocked when the support FAQ is older than the changelog.

---

## Tasks Completed
- [x] Read mandatory rules, handover context, changelog, recent session logs, and relevant Cursor/automation skills.
- [x] Used parallel read-only subagents to locate the support KB pipeline, summarize recent support-facing changes, and inspect existing automation patterns.
- [x] Confirmed no duplicate support service was needed; reused the existing `FAQ_MASTER.md` -> `generate-knowledge-base.js` -> `ai_knowledge_base` -> `embed-knowledge-base.js` pipeline.
- [x] Updated `docs/FAQ_MASTER.md` for Gift Cards, retail vouchers, OTT cash-withdrawal availability rules, referral SMS troubleshooting, and May catalog behavior.
- [x] Added `scripts/check-support-kb-freshness.js`, `npm run check:kb:fresh`, `.cursor/hooks.json`, and rule/doc updates to enforce KB freshness before commit/push shell commands.
- [x] Added `--update-existing` support to `scripts/generate-knowledge-base.js` so approved KB refreshes update existing answers instead of only inserting new questions.
- [x] Ran André-approved UAT -> Staging -> Production KB generation/embedding sequence and verified final DB counts.
- [x] Added André's follow-up OTT-Mobile Nedbank and ABSA cash-withdrawal network information to the FAQ and all three DB knowledgebases.
- [x] Added PEP and Ackermans to the Nedbank voucher merchant list and clarified partner-facing terminology for Nedbank/ABSA collection.
- [x] Added `--faq-only` generation support to avoid duplicate GPT gap-fill rows during focused FAQ-only KB updates.
- [x] Updated handover, changelog, and AI support docs with final DB results.

---

## Key Decisions
- **Reuse existing KB pipeline**: The repository already has the RAG support service and KB generation/embedding scripts, so this session added a guard and source updates instead of creating a new service.
- **FAQ date vs changelog date as the freshness invariant**: The guard checks that `docs/FAQ_MASTER.md` is at least as current as the latest `docs/CHANGELOG.md` date. This is simple, auditable, and avoids environment writes during local commits.
- **Production DB writes required approval**: Live DB generation/embedding writes `ai_knowledge_base` rows and embeddings in target environments, so it was only run after André explicitly approved the UAT -> Staging -> Production sequence.
- **Cursor hook plus rule**: `.cursor/hooks.json` blocks `git commit` / `git push` shell commands with stale KB source, while the rules make the behavior explicit for future agents.

---

## Files Modified
- `docs/FAQ_MASTER.md` - Updated last-updated date and added support Q&A for Gift Cards, retail vouchers, voucher amount validation, OTT cash-withdrawal availability, and referral SMS troubleshooting.
- `docs/FAQ_MASTER.md` - Follow-up update added OTT-Mobile Nedbank and ABSA cash-withdrawal collection networks and how-to guidance.
- `scripts/generate-knowledge-base.js` - Follow-up added `--faq-only` mode for focused FAQ source updates.
- `package.json` - Follow-up added `generate:kb:faq:update`, `generate:kb:faq:update:staging`, and `generate:kb:faq:update:production`.
- `scripts/check-support-kb-freshness.js` - New read-only local guard comparing FAQ source freshness with the latest changelog date.
- `scripts/generate-knowledge-base.js` - Added `--update-existing` mode for refreshing existing KB rows by matching question text.
- `package.json` - Added `check:kb:fresh`.
- `.cursor/hooks.json` - Added a project Cursor hook for `git commit` / `git push` shell commands.
- `.cursor/rules/session-workflow.mdc` - Added support KB sweep/check requirements at work completion.
- `.cursor/rules/git-workflow.mdc` - Added support KB freshness requirement before commit/push.
- `docs/CURSOR_2.0_RULES_FINAL.md` - Updated canonical rules with support KB freshness requirements.
- `docs/AI_SUPPORT_SYSTEM.md` - Documented v3.2.0 support KB freshness guard and May 2026 source updates.
- `docs/CHANGELOG.md` - Added the May 12 support KB refresh entry.
- `docs/AGENT_HANDOVER.md` - Added current status and pending live DB embedding context.
- `docs/session_logs/2026-05-12_1723_ai-support-kb-refresh.md` - Created this session log.

---

## Code Changes Summary
- Added a small Node.js guard script and enhanced the existing KB generator only; no new support runtime service, database schema, API route, or migration was added.
- The guard returns Cursor hook JSON by default and human-readable output with `--plain`.
- The guard fails closed when `docs/FAQ_MASTER.md` cannot be parsed or is older than the newest changelog date.
- The generator's `--update-existing` flag updates `answer`, `category`, `audience`, `embedding`, and `updatedAt` for matching questions while preserving existing active state and usage metrics.

---

## Issues Encountered
- **Initial live KB timestamp check could not connect**: UAT, Staging, and Production Cloud SQL proxies were not running locally.
- **Resolution**: Started proxies with `./scripts/ensure-proxies-running.sh`; initial live timestamps were UAT `2026-03-30`, Staging `2026-03-18`, and Production `2026-04-01`.
- **UAT default inactive behavior**: UAT generation inserted new `GEN-%` rows as inactive by design. After André's approval for the full sequence, `npm run activate:kb` activated the 195 pending rows before embedding.

---

## Testing Performed
- [x] Script syntax validation: `node --check scripts/check-support-kb-freshness.js` passed.
- [x] Freshness check: `npm run check:kb:fresh` passed with FAQ 2026-05-12 covering latest changelog date 2026-05-12.
- [x] Cursor hook output validation: `node scripts/check-support-kb-freshness.js` returned valid allow JSON.
- [x] Cursor lints on edited files reported no linter errors.
- [x] UAT generation: `npm run generate:kb:update` processed 204 entries, inserted 195, updated 9.
- [x] UAT activation/embedding: `npm run activate:kb && npm run embed:kb` activated 195 rows and embedded 268 active entries with 0 failures.
- [x] Staging generation/embedding: `npm run generate:kb:update:staging` inserted 78 and updated 126; `npm run embed:kb:staging` embedded 253 active entries with 0 failures.
- [x] Production generation/embedding: `npm run generate:kb:update:production` inserted 79 and updated 125; `npm run embed:kb:production` embedded 253 active entries with 0 failures.
- [x] Final DB verification: UAT 268 active / 268 active embedded / 0 inactive; Staging 253 active / 253 active embedded / 11 inactive; Production 253 active / 253 active embedded / 2 inactive.
- [x] Follow-up UAT withdrawal-network update: `npm run generate:kb:update` processed 207 entries, inserted 61, updated 146; `npm run activate:kb && npm run embed:kb` embedded 329 active entries with 0 failures.
- [x] Follow-up Staging withdrawal-network update: first attempt hit `ECONNRESET`; restarted stale Cloud SQL proxies, then `npm run generate:kb:update:staging` inserted 40 and updated 167; `npm run embed:kb:staging` embedded 293 active entries with 0 failures.
- [x] Follow-up Production withdrawal-network update: `npm run generate:kb:update:production` inserted 40 and updated 167; `npm run embed:kb:production` embedded 293 active entries with 0 failures.
- [x] Follow-up final DB verification: UAT 329 active / 329 active embedded / 0 inactive; Staging 293 active / 293 active embedded / 11 inactive; Production 293 active / 293 active embedded / 2 inactive.
- [x] PEP/Ackermans focused UAT refresh: `npm run generate:kb:faq:update` updated 127 FAQ rows, inserted 0, and `npm run embed:kb` embedded 329 active entries with 0 failures.
- [x] PEP/Ackermans focused Staging refresh: after proxy restart, `npm run generate:kb:faq:update:staging` updated 127 FAQ rows, inserted 0, and `npm run embed:kb:staging` embedded 293 active entries with 0 failures.
- [x] PEP/Ackermans focused Production refresh: `npm run generate:kb:faq:update:production` updated 127 FAQ rows, inserted 0, and `npm run embed:kb:production` embedded 293 active entries with 0 failures.
- [x] Final wording verification found active Nedbank rows with PEP/Ackermans and active ABSA rows with the "do not ask for a MyMoolah withdrawal" instruction in UAT, Staging, and Production.

---

## Next Steps
- [x] André approved UAT -> Staging -> Production generation/embedding and the sequence completed.
- [ ] Test live support chat in Staging and Production after the next backend restart/deploy cycle if the running service cache does not pick up fresh KB rows within its five-minute KB cache TTL.
- [ ] Future agents must update `docs/FAQ_MASTER.md` for support-facing shipped changes before commit/push.

---

## Important Context for Next Agent
- The live support service is `services/ragService.js`; it loads active embedded rows from `ai_knowledge_base`.
- `docs/FAQ_MASTER.md` is the human-maintained source of truth used by `scripts/generate-knowledge-base.js`.
- `.cursor/hooks.json` now runs `node scripts/check-support-kb-freshness.js` before `git commit` and `git push` shell commands.
- The guard does not write to any database; it only protects local commit/push flow.
- Do not run target-environment KB generation/embedding as part of a normal commit without André's explicit approval for the environment.

---

## Questions/Unresolved Items
- Staging has 11 inactive legacy/auto-learned rows and Production has 2 inactive rows. They were left inactive because this session only updates and embeds approved active FAQ/generated support knowledge.
- Confirm whether any pending auto-learned `isActive=false` KB rows require manual review before broad UAT activation.

---

## Related Documentation
- `docs/FAQ_MASTER.md`
- `docs/AI_SUPPORT_SYSTEM.md`
- `docs/CURSOR_2.0_RULES_FINAL.md`
- `docs/CHANGELOG.md`
- `docs/AGENT_HANDOVER.md`
- `scripts/generate-knowledge-base.js`
- `scripts/embed-knowledge-base.js`
