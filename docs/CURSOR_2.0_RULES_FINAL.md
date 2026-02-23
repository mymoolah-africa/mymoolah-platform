# MyMoolah Agent Rules - Cursor 2.0

**Last Updated**: 2026-02-21  
**Keep in sync**: Any rules added to Cursor Settings must also be added here.

---

## 📌 **PROJECT OVERVIEW**

**MyMoolah** is a banking-grade Treasury Platform for South Africa (wallet, ledger, VAS, USDC, NFC, KYC, reconciliation). **Production**: api-mm.mymoolah.africa, wallet.mymoolah.africa. For status and priorities, read `docs/agent_handover.md`.

---

## 📋 **QUICK REFERENCE**

| ✅ DO | ❌ DON'T |
|------|----------|
| Read rules + handover before work | Start without rules confirmation |
| Sweep `scripts/` before creating | Create scripts without checking |
| Use `docs/DATABASE_CONNECTION_GUIDE.md` for DB work | Write custom DB connection logic |
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
- Read `docs/agent_handover.md` (onboarding checklist, status, priorities)
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

---

## 📁 **WORKING DIRECTORY**

- ONLY `/mymoolah/` and subdirectories
- NEVER git worktrees; NEVER `mymoolah-wallet-frontend/pages/*.tsx` (Figma-managed); NEVER `/Figma/`
- Settings: `/portal/` only

---

## 🏗️ **DEVELOPMENT STANDARDS**

### **Rule 6A: No Shortcuts**
- NEVER workarounds (wrong enums, skipped migrations, hardcoded values)
- ALWAYS proper migrations, correct enums, Mojaloop/ISO 20022
- See `docs/archive/CURSOR_RULES_EXTENDED.md` for examples; `docs/ZERO_SHORTCUTS_POLICY.md` for policy

### **Rules 7-12 (Summary)**
- **Done**: Clean code, docs updated, tests, migrations with rollbacks, security review, commit+push
- **Security**: Input validation, JWT HS512, TLS 1.3, parameterized queries, AES-256-GCM, RBAC
- **Docs**: Update `docs/` after changes; read `DATABASE_CONNECTION_GUIDE.md` before DB work
- **Scripts**: Sweep `scripts/` before creating (200+ exist)
- **DB**: Use `db-connection-helper.js` and `run-migrations-master.sh`; never custom connection logic
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
2. Update `docs/agent_handover.md`
3. `git add . && git commit -m "[description]"` **then `git push origin main`**
4. Inform user: "✅ Changes committed and pushed. Pull in Codespaces: `git pull origin main`"

---

## ⚠️ **CRITICAL REMINDERS**

No shortcuts. Sweep `scripts/` first. Session log when work done. Commit+push every time. Test in Codespaces only. Migrations before seeding. Figma pages read-only. Database-first (SQL aggregation).

---

**Extended reference**: Model selection details, Rule 6A code examples, full git workflow → `docs/archive/CURSOR_RULES_EXTENDED.md`
