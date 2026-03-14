# Session Log: LangChain RAG Phase 2 + Cost Optimisation
**Date**: 2026-03-14  
**Time**: 19:00 SAST  
**Agent**: Claude (Sonnet)  
**Session**: Full-day session  
**Previous session**: `2026-03-13_2200_field-level-encryption-popia.md`

---

## 📋 Session Summary

Completed LangChain RAG AI support system (Phase 1 + Phase 2) and full cost optimisation sweep across all OpenAI calls in the codebase. The new `ragService.js` (481 lines) replaces the legacy system (4,649 lines across 3 files). Tested and verified working in UAT. Updated agent rules with tech debt section and architectural decisions log.

---

## ✅ Tasks Completed

### 1. LangChain RAG — Phase 1 (Knowledge Base)
- Created `services/ragService.js` v1 — semantic KB search using OpenAI `text-embedding-3-small`
- Created `scripts/embed-knowledge-base.js` — embeds all 64 active KB entries
- Updated `controllers/supportController.js` — switched from legacy `BankingGradeSupportService` to `ragService`
- Updated `package.json` — added `langchain`, `@langchain/openai`, `@langchain/core`; new scripts `embed:kb`, `embed:kb:dry-run`
- Ran `npm run embed:kb` in Codespaces — all 64 entries embedded successfully
- Tested: `"How do I load money into my wallet?"` → correct answer from KB, 3,985ms, confidence 0.95

### 2. Cost Optimisation (4 layers)
- **Layer 1**: Redis/memory response cache (24h TTL) — repeated questions are free
- **Layer 2**: Direct KB answer when confidence ≥ 0.92 — no LLM call
- **Layer 3**: Switched default model from `gpt-4o` → `gpt-4o-mini` (17x cheaper)
- **Layer 4**: Self-learning — GPT answers for unknown questions saved to KB as `isActive=false` for admin review
- Updated `ragService.js` to v2 with all 4 layers
- **Projected cost**: ~$150–$360/month at 3M users vs $30,000/month without optimisations

### 3. Model Sweep Across Codebase
Switched from `gpt-4o` to `gpt-4o-mini` in:
- `services/feedbackService.js` (4 calls)
- `services/googleReviewService.js` (5 calls)
- `services/codebaseSweepService.js` (1 call)
- `controllers/feedbackController.js` (1 DB record label)
- **KYC intentionally kept on `gpt-4o`** (accuracy-critical, POPIA requirement)

### 4. Phase 2 — Transactional AI
- Updated `ragService.js` to v3 with transactional intent detection
- 7 regex patterns detect personal questions (balance, transactions, wallet, payments)
- `fetchUserContext(userId)` — fetches live wallet balance + last 10 transactions from DB
- `buildUserContext()` — formats data for LLM context
- Personal responses NEVER cached (POPIA compliance)
- Tested: "list my last 4 transactions" → real transaction data returned ✅
- Tested: "what's my balance" → exact balance ZAR 33,222.00 returned ✅
- Tested: "how do I load money" → KB answer (not personal data) ✅

### 5. Rules Update
- Added `## 🤖 AI & OPENAI MODEL SELECTION` section to `CURSOR_2.0_RULES_FINAL.md`
- Added `## 🔧 TECH DEBT & ARCHITECTURAL CONCERNS` section with active debt table and architectural decisions log
- Updated Last Updated date to 2026-03-14

### 6. embed-knowledge-base.js rewrite (db-connection-helper.js)
- Rewrote `scripts/embed-knowledge-base.js` to use `db-connection-helper.js` for all DB connections
- Added `--env=uat|staging|production` flag — passwords fetched automatically from GCP Secret Manager
- Raw SQL replaces Sequelize model dependency
- Added npm scripts: `embed:kb:staging`, `embed:kb:production`
- Ran `npm run embed:kb:staging` — 1 entry embedded (Staging has only 1 KB entry)
- Ran `npm run embed:kb:production` — 0 entries (Production has no KB data yet)

### 7. KB Accuracy Review
- Identified KB entries describing features not yet live (Tap to Add Money: Q3.2, Q3.2a, Q3.2b)
- Flagged entries for non-live features: bulk payouts, cross-border, API, white-label
- **Decision**: Review and clean up UAT KB before seeding to Staging/Production (scheduled before go-live)

---

## 📁 Files Modified

| File | Change |
|---|---|
| `services/ragService.js` | NEW → v1 → v2 → v3 (Phase 1 + cost opt + Phase 2) |
| `scripts/embed-knowledge-base.js` | NEW then rewritten to use db-connection-helper.js |
| `controllers/supportController.js` | Switch to ragService singleton |
| `package.json` | Add langchain deps + embed:kb + embed:kb:staging + embed:kb:production |
| `package-lock.json` | Auto-updated |
| `services/feedbackService.js` | gpt-4o → gpt-4o-mini (4 calls) |
| `services/googleReviewService.js` | gpt-4o → gpt-4o-mini (5 calls) |
| `services/codebaseSweepService.js` | gpt-4o → gpt-4o-mini (1 call) |
| `controllers/feedbackController.js` | gpt-4o → gpt-4o-mini (1 DB label) |
| `docs/CURSOR_2.0_RULES_FINAL.md` | Added AI model table + Tech Debt + Architectural Decisions |
| `docs/AGENT_HANDOVER.md` | Updated to v2.17.0 |
| `docs/CHANGELOG.md` | Added LangChain RAG v3 entry |
| `docs/README.md` | Updated to v2.17.0 |

---

## 🔑 Key Decisions

1. **Replace, don't patch**: Replaced 4,649 lines of pattern matching with 481 lines of semantic RAG. Net: same functionality + personalised responses + self-learning.
2. **`gpt-4o-mini` for everything non-KYC**: 17x cost reduction. KYC stays on `gpt-4o` for accuracy.
3. **POPIA compliance**: Personal responses (balance, transactions) are never cached.
4. **Self-learning with admin gate**: Auto-learned KB entries have `isActive=false` until admin approves.
5. **Tech debt section in rules**: Future agents must document architectural concerns, not just fix bugs silently.

---

## 🐛 Issues Encountered & Fixed

| Issue | Fix |
|---|---|
| Codespaces backend crashed after git pull — `MODULE_NOT_FOUND @langchain/openai` | User ran `npm install` in Codespaces to install new deps |
| `.env.codespaces` is gitignored — `SUPPORT_AI_MODEL=gpt-4o-mini` change didn't push | Change is in `ragService.js` default (env var overrides if needed) |
| embed-knowledge-base.js used Sequelize models + manual DATABASE_URL | Rewrote to use `db-connection-helper.js` with `--env` flag |
| Staging embed failed with password auth error | User used literal "PASSWORD" — fixed script to auto-fetch from GCP Secret Manager |
| KB contains entries for features not live (Tap to Add Money) | Flagged for review before seeding to Staging/Production |

---

## 🔄 Next Steps

### Before Go-Live (within 2 weeks)
1. **Review and clean UAT KB** — deactivate entries for features not yet live (Tap to Add Money Q3.2a/Q3.2b, update Q3.2)
2. **Seed KB to Staging and Production** — update `seed-support-knowledge-base.js` to use `db-connection-helper.js` with `--env` support
3. **Run embed:kb on Staging/Production** — `npm run embed:kb:staging`, `npm run embed:kb:production`
4. **Deploy to Staging** — `./scripts/deploy-backend.sh --staging`
5. **Deploy to Production** — `./scripts/deploy-backend.sh --production`
6. **Archive legacy scripts** — `run-sweep-patterns-migration.sh` (old AI system)

### Phase 3 (Future)
- Redis conversation memory (currently in-memory, lost on restart)
- Admin portal screen to review/approve `isActive=false` auto-learned KB entries
- Archive legacy AI services: `bankingGradeSupportService.js`, `aiSupportService.js`, `semanticEmbeddingService.js`
- UI: Fix markdown rendering in chat (`**bold**` should render as bold, not asterisks)

---

## ⚠️ Important Context for Next Agent

- `ragService.js` is the ONLY active AI support service. `bankingGradeSupportService.js` and `aiSupportService.js` still exist but are NOT in the request path.
- `kycService.js` intentionally uses `gpt-4o` — do NOT change this.
- **KB seeding to Staging/Production is BLOCKED** until UAT KB is reviewed for accuracy (Tap to Add Money and other non-live features must be deactivated first).
- `npm run embed:kb:staging` and `npm run embed:kb:production` use `db-connection-helper.js` — no manual passwords needed.
- Self-learned KB entries appear in `ai_knowledge_base` table with `isActive=false` and `faqId` starting with `AUTO-`. These need admin review before being activated.
- Conversation history is in-memory only — lost on backend restart. Redis migration is Phase 3.
- `seed-support-knowledge-base.js` still uses Sequelize models + `DATABASE_URL` — needs same `db-connection-helper.js` fix before use on Staging/Production.
