# MyMoolah Agent Rules - Cursor 2.0

**Last Updated**: 2026-03-14  
**Keep in sync**: Any rules added to Cursor Settings must also be added here.

---

## 📌 **PROJECT OVERVIEW**

**MyMoolah** is a banking-grade Treasury Platform for South Africa (wallet, ledger, VAS, USDC, NFC, KYC, reconciliation). **Production**: api-mm.mymoolah.africa, wallet.mymoolah.africa. For status and priorities, read `docs/AGENT_HANDOVER.md`.

---

## 📋 **QUICK REFERENCE**

| ✅ DO | ❌ DON'T |
|------|----------|
| Read rules + handover before work | Start without rules confirmation |
| Sweep `scripts/` before creating | Create scripts without checking |
| Use `scripts/db-connection-helper.js` for ALL DB queries | Write custom DB connection logic (Sequelize, raw pg, etc.) |
| Use `docs/DATABASE_CONNECTION_GUIDE.md` for DB work | Skip reading the DB guide |
| Test in Codespaces | Test on local |
| Migrations before seeding | Seed before migrations |
| Use `./scripts/run-migrations-master.sh [uat\|staging]` | Run `npx sequelize-cli` directly |
| Create session log when work done | Wait for session end to document |
| Commit AND push after changes | Leave push for user |

---

## 🚀 **SESSION START (DO FIRST)**

### **Rule 1: Rules Confirmation (MANDATORY - NO WORK UNTIL DONE)**
- Use `read_file` on this file
- Summarize 3-5 key rules; state: "✅ Rules reading completed - I have read `docs/CURSOR_2.0_RULES_FINAL.md` and will follow all rules"

### **Rule 2: Context Reading**
- Read `docs/AGENT_HANDOVER.md` (onboarding checklist, status, priorities)
- Read 2-3 most recent `docs/session_logs/*.md`
- Read `docs/DATABASE_CONNECTION_GUIDE.md` if DB work planned
- `git status` → commit or stash if needed → `git pull origin main`

### **Rule 3: Git Pull**
- Always check `git status` first
- Uncommitted changes → commit or stash, then pull
- Local commits not pushed → push first, then pull

---

## 🔄 **GIT WORKFLOW**

**Agent MUST commit AND push** after changes. Never leave push for user.

1. Develop locally → `git add . && git commit -m "[description]"` → **`git push origin main`**
2. User pulls in Codespaces → `git pull origin main` → User tests
3. GitHub = source of truth

### **CRITICAL: Codespaces Testing Sequence (MANDATORY — agents must always give this exact sequence)**

After pushing, always tell André to run these commands **in Codespaces**, in this exact order:

```bash
# 1. Pull latest code
git pull origin main

# 2. Rebuild frontend (only if frontend files changed)
cd mymoolah-wallet-frontend && npm run build && cd ..

# 3. Restart backend + proxy + Redis
./scripts/one-click-restart-and-start.sh
```

**NEVER suggest any of these — they are WRONG:**
- ❌ `pm2 restart all`
- ❌ `pm2 reload all`
- ❌ `node server.js`
- ❌ `npm start`
- ❌ Any direct backend restart that bypasses `one-click-restart-and-start.sh`

`./scripts/one-click-restart-and-start.sh` is the ONLY correct way to restart the backend in Codespaces. It handles the Cloud SQL Auth Proxy, Redis container, GCP credentials, DATABASE_URL construction and backend startup in the correct order. Any other method will result in a broken Cloud SQL connection.

---

## 📁 **WORKING DIRECTORY**

- ONLY `/mymoolah/` and subdirectories
- NEVER git worktrees
- **Frontend**: Codebase is source of truth. Agents may edit any UI/frontend files including `mymoolah-wallet-frontend/pages/*.tsx`. Figma may hold reference designs; code takes precedence for ongoing development.
- **Figma**: `/Figma/` sources may exist for reference; backend adapts to frontend needs.
- Settings: `/portal/` only

---

## 🏗️ **DEVELOPMENT STANDARDS**

### **Rule 6A: No Shortcuts**
- NEVER workarounds (wrong enums, skipped migrations, hardcoded values)
- ALWAYS proper migrations, correct enums, Mojaloop/ISO 20022
- See `docs/archive/CURSOR_RULES_EXTENDED.md` for examples; `docs/ZERO_SHORTCUTS_POLICY.md` for policy

### **DATABASE ACCESS (NON-NEGOTIABLE — ALWAYS USE THIS)**

**NEVER write custom DB connection code.** ALWAYS use `scripts/db-connection-helper.js`.

```js
// ✅ CORRECT — the ONLY way to query the database
const { getUATClient } = require('./scripts/db-connection-helper');
const client = await getUATClient();
const result = await client.query('SELECT ...', [params]);
client.release();
```

```js
// ❌ WRONG — never do this
const { Sequelize } = require('sequelize');
const seq = new Sequelize(process.env.DATABASE_URL, ...);
```

- **UAT**: `getUATClient()` — port 6543, database `mymoolah`
- **Staging**: `getStagingClient()` — port 6544, reads password from GCP Secret Manager
- **Production**: `getProductionClient()` — port 6545

Migrations: ALWAYS use `./scripts/run-migrations-master.sh [uat|staging]` — never `npx sequelize-cli` directly.

### **Rules 7-12 (Summary)**
- **Done**: Clean code, docs updated, tests, migrations with rollbacks, security review, commit+push
- **Security**: Input validation, JWT HS512, TLS 1.3, parameterized queries, AES-256-GCM, RBAC
- **Docs**: Update `docs/` after changes; read `DATABASE_CONNECTION_GUIDE.md` before DB work
- **Scripts**: Sweep `scripts/` before creating (200+ exist)
- **Performance**: DB aggregation (not JS sums); API <200ms, DB <50ms

---

## 💬 **COMMUNICATION**

- Address user as "André"; patient, step-by-step
- Real transactions only; no dummy data
- Notify before backend changes; get approval before destructive actions
- Don't change working functionality when fixing another issue

---

## 📝 **SESSION END**

**When work is complete** (don't wait for session end):
1. Create session log: `docs/session_logs/YYYY-MM-DD_HHMM_[description].md`
2. Update `docs/AGENT_HANDOVER.md`
3. `git add . && git commit -m "[description]"` **then `git push origin main`**
4. Inform user: "✅ Changes committed and pushed. Pull in Codespaces: `git pull origin main`"

---

## 🤖 **AI & OPENAI MODEL SELECTION**

| Service | Model | Reason |
|---|---|---|
| `ragService.js` (support chat) | `gpt-4o-mini` | High volume — cost critical |
| `feedbackService.js` | `gpt-4o-mini` | Sentiment analysis — mini sufficient |
| `googleReviewService.js` | `gpt-4o-mini` | Review generation — mini sufficient |
| `codebaseSweepService.js` | `gpt-4o-mini` | Background job — mini sufficient |
| `kycService.js` | `gpt-4o` | Identity verification — **accuracy critical, do NOT downgrade** |

**AI Support System (LangChain RAG v3):**
- `services/ragService.js` — 481-line replacement for 4,649-line legacy system
- Phase 1: Semantic KB search (64 embedded entries)
- Phase 2: Transactional AI (live balance + last 10 transactions per user)
- Cost layers: Redis cache → Direct KB (≥92% confidence) → GPT-4o-mini → Self-learning
- Personal responses NEVER cached (POPIA compliance)
- Self-learning: unknown questions auto-saved to KB as `isActive=false` for admin review
- Embed KB: `npm run embed:kb` (run after adding new KB entries)

---

## 🔧 **TECH DEBT & ARCHITECTURAL CONCERNS**

This section must be maintained by every agent. Flag issues here so future agents don't inherit silent problems.

### **Active Tech Debt**
| Item | File(s) | Risk | Suggested Action |
|---|---|---|---|
| Legacy AI services (4,649 lines, unused) | `services/bankingGradeSupportService.js`, `services/aiSupportService.js`, `services/semanticEmbeddingService.js` | Low — not in request path | Archive after confirming ragService stable in production |
| `aiSupportService.js` references `gpt-5` | `services/aiSupportService.js:1187,1558` | Medium — will crash if called | Archive the file |
| Conversation history in-memory only | `services/ragService.js` | Medium — lost on restart, not scalable | Migrate to Redis for horizontal scaling (Phase 3) |
| npm audit: 25 vulnerabilities (2 critical) | `package.json` | Medium | Run `npm audit fix` when stable |

### **Architectural Decisions Log**
| Decision | Date | Reason |
|---|---|---|
| LangChain RAG replaces pattern-matching AI | Mar 2026 | 4,649 → 481 lines; semantic search; self-learning |
| `gpt-4o-mini` for all non-KYC OpenAI calls | Mar 2026 | Cost: ~$30k/month → ~$150-360/month at 3M users |
| KYC stays on `gpt-4o` | Mar 2026 | POPIA accuracy requirement |
| Figma restriction removed | Feb 2026 | Code is source of truth; agents edit `.tsx` freely |
| Agent commits AND pushes to main | Feb 2026 | Streamlined workflow |
| Cloud Build for deployments (not local Docker) | Mar 2026 | No Docker Desktop needed; faster build times |

### **Rule: Flag Tech Debt**
When you identify complexity, duplication, or architectural risk — add it to the table above. Do NOT leave it undocumented for the next agent.

---

## ⚠️ **CRITICAL REMINDERS**

No shortcuts. Sweep `scripts/` first. Session log when work done. Commit+push every time. Test in Codespaces only. Migrations before seeding. Code is frontend source of truth. Database-first (SQL aggregation). Flag tech debt in this file.

---

**Extended reference**: Model selection details, Rule 6A code examples, full git workflow → `docs/archive/CURSOR_RULES_EXTENDED.md`
