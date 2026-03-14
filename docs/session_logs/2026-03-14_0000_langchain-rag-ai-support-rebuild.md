# Session Log - 2026-03-14 - LangChain RAG AI Support Rebuild

**Session Date**: 2026-03-14 00:00  
**Agent**: Cursor AI Agent (Claude)  
**User**: André  
**Session Duration**: ~1 hour

---

## Session Summary
Replaced the complex 4,000+ line AI support stack (bankingGradeSupportService + aiSupportService) with a clean ~250-line LangChain RAG service. Semantic search over the knowledge base via OpenAI embeddings, GPT-4o for natural responses, and in-memory conversation history. Same API contract—no frontend changes.

---

## Tasks Completed
- [x] Created `services/ragService.js` — LangChain RAG (~250 lines)
- [x] Created `scripts/embed-knowledge-base.js` — Generate OpenAI embeddings for KB
- [x] Updated `controllers/supportController.js` — Uses ragService instead of bankingGradeSupportService
- [x] Added npm scripts: `embed:kb`, `embed:kb:dry`
- [x] Updated `docs/AI_SUPPORT_SYSTEM.md` — v3.0 architecture

---

## Key Decisions
- **Decision 1**: Replace pattern matching entirely with semantic search — handles infinite query variations
- **Decision 2**: Use OpenAI text-embedding-3-small (1536 dims) — replaces local MiniLM; stored in existing JSONB column
- **Decision 3**: Keep old services in place (not delete) — `bankingGradeSupportService.js` and `aiSupportService.js` remain for reference; controller uses ragService
- **Decision 4**: First-time setup: run `npm run embed:kb` in Codespaces (UAT proxy) before testing — existing KB has MiniLM or null embeddings; must regenerate with OpenAI

---

## Files Modified
- `services/ragService.js` — NEW
- `scripts/embed-knowledge-base.js` — NEW
- `controllers/supportController.js` — Switched to ragService
- `package.json` — Added embed:kb, embed:kb:dry scripts
- `docs/AI_SUPPORT_SYSTEM.md` — Updated to v3.0

---

## Next Steps
- [ ] In Codespaces: Run `./scripts/ensure-proxies-running.sh uat` then `npm run embed:kb` to generate embeddings
- [ ] Test `/api/v1/support/chat` in UAT
- [ ] Deploy to Staging, run embed:kb for Staging DB, test
- [ ] Deploy to Production, run embed:kb for Production DB
- [ ] Phase 2 (future): Add transactional AI — inject user wallet/transaction data into RAG context
- [ ] Phase 2 (future): Redis conversation memory for horizontal scaling

---

## Important Context for Next Agent
- **RAG service**: `services/ragService.js` — single source of truth for AI support
- **Embeddings**: Only entries with OpenAI-compatible embeddings (array, 1536 dims) are used. Run `npm run embed:kb` after adding new KB entries or when switching envs.
- **No pattern matching**: All queries go through semantic search. If 0 embeddings exist, GPT gets "No specific documentation found" and suggests contacting support.
- **Old services**: `bankingGradeSupportService.js`, `aiSupportService.js`, `supportService.js` still exist but are not used by the chat endpoint.

---

## Related Documentation
- `docs/AI_SUPPORT_SYSTEM.md` — Full AI support docs
- `docs/DATABASE_CONNECTION_GUIDE.md` — Proxy setup for embed script
