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

---

## 📁 Files Modified

| File | Change |
|---|---|
| `services/ragService.js` | NEW → v1 → v2 → v3 (Phase 1 + cost opt + Phase 2) |
| `scripts/embed-knowledge-base.js` | NEW — embeds KB entries with OpenAI |
| `controllers/supportController.js` | Switch to ragService singleton |
| `package.json` | Add langchain deps + embed:kb scripts |
| `package-lock.json` | Auto-updated |
| `services/feedbackService.js` | gpt-4o → gpt-4o-mini (4 calls) |
| `services/googleReviewService.js` | gpt-4o → gpt-4o-mini (5 calls) |
| `services/codebaseSweepService.js` | gpt-4o → gpt-4o-mini (1 call) |
| `controllers/feedbackController.js` | gpt-4o → gpt-4o-mini (1 DB label) |
| `docs/CURSOR_2.0_RULES_FINAL.md` | Added AI model table + Tech Debt section |
| `docs/AGENT_HANDOVER.md` | Updated current session summary |
| `docs/CHANGELOG.md` | Added LangChain RAG entry |
| `docs/README.md` | Updated status + latest update |

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

---

## 🔄 Next Steps

### Immediate
1. Push to GitHub: `git push origin main`
2. Pull in Codespaces: `git pull origin main` + restart backend
3. Run `npm run embed:kb` on Staging DB (connect staging proxy first)
4. Deploy to Staging: `./scripts/deploy-backend.sh --staging`
5. Deploy to Production: `./scripts/deploy-backend.sh --production`

### Phase 3 (Future)
- Redis conversation memory (currently in-memory, lost on restart)
- Admin portal screen to review/approve `isActive=false` auto-learned KB entries
- Archive legacy AI services: `bankingGradeSupportService.js`, `aiSupportService.js`, `semanticEmbeddingService.js`
- UI: Fix markdown rendering in chat (`**bold**` should render as bold, not asterisks)

---

## ⚠️ Important Context for Next Agent

- `ragService.js` is the ONLY active AI support service. `bankingGradeSupportService.js` and `aiSupportService.js` still exist but are NOT in the request path.
- `kycService.js` intentionally uses `gpt-4o` — do NOT change this.
- `npm run embed:kb` must be run on EACH database environment (UAT done, Staging and Production pending).
- Self-learned KB entries appear in `ai_knowledge_base` table with `isActive=false` and `faqId` starting with `AUTO-`. These need admin review before being activated.
- Conversation history is in-memory only — lost on backend restart. Redis migration is Phase 3.
