# MyMoolah Agent Rules - Cursor 2.0

**IMPORTANT**: This file must always be kept in sync with Cursor Settings rules. Any rules added to Cursor Settings must also be added to this .md file immediately.

**Last Updated**: December 19, 2025

---

## 📋 **TABLE OF CONTENTS**

1. [Session Start Procedures](#session-start-procedures)
2. [Model Selection & Workflow](#model-selection--workflow)
3. [Git Workflow](#git-workflow)
4. [Working Directory Constraints](#working-directory-constraints)
5. [Development Standards](#development-standards)
6. [Communication & User Preferences](#communication--user-preferences)
7. [Session End Procedures](#session-end-procedures)
8. [Critical Reminders](#critical-reminders)

---

## 🚀 **SESSION START PROCEDURES**

### **Rule 1: Mandatory Rules Confirmation (FIRST ACTION - BEFORE ANYTHING ELSE)**

- **MUST READ THE RULES FILE**: Agent MUST use `read_file` tool to actually read `docs/CURSOR_2.0_RULES_FINAL.md` (not just claim to have read it)
- **PROOF OF READING REQUIRED**: Agent MUST provide evidence that reading was completed by:
  1. **Actually reading the file**: Use `read_file` tool on `docs/CURSOR_2.0_RULES_FINAL.md` and show it was read
  2. **Summarize key rules**: Provide a brief summary of at least 3-5 key rules to prove understanding (e.g., "Rule 1: Git workflow requires checking status before pull, Rule 2: Session continuity requires reading handover docs, Rule 5: Banking-grade security with TLS 1.3, etc.")
  3. **Confirm specific details**: Mention specific details from the rules (e.g., "I understand the workflow is: Local → Commit → Push → Pull in Codespaces")
  4. **State confirmation**: Explicitly state: "✅ Rules reading completed - I have read `docs/CURSOR_2.0_RULES_FINAL.md` and will follow all rules"
- **User verification**: User can verify agent actually read rules by:
  - Checking that `read_file` tool was used on the rules file
  - Verifying the agent provides specific details/summaries from the rules
  - Confirming the agent mentions specific rule numbers and details
- **NO WORK UNTIL CONFIRMED**: Agent must NOT proceed with any work until rules reading is confirmed with evidence

### **Rule 2: Session Continuity & Context Reading (AFTER RULES CONFIRMATION)**

- **NEW SESSION REQUIREMENT**: When starting a new chat/session, you are a new agent. You MUST read previous agent work to maintain continuity.
- **I am a new agent**: Acknowledge this is a new chat/session and I need to read previous agent work
- **At session start (AFTER RULES CONFIRMATION)**: 
  1. Read `docs/agent_handover.md` (contains previous session summary, current status, next priorities)
  2. Read `docs/agent_role_template.md` (operating charter and constraints)
  3. Read `docs/changelog.md` (recent changes and version history)
  4. Read `docs/readme.md` (current system status and architecture)
  5. Read `docs/DATABASE_CONNECTION_GUIDE.md` (standardized database connection procedures - **CRITICAL for any database/migration work**)
  6. **Read recent session logs** in `docs/session_logs/` - Read the 2-3 most recent session log files to understand chat history and context from previous agents
  7. Review recent git commits: `git log --oneline -10` to understand recent work
- **Understand context before starting**: Current priorities, pending work, incomplete tasks, recent changes, and next steps from previous sessions.
- **Session continuity**: Treat each new chat as a handover from a previous agent. Always check what was done before starting new work.

### **Rule 3: Safe Git Pull Procedure (BEFORE ANY WORK)**

- **ALWAYS check git status first**: `git status` to see current state
- **If uncommitted changes exist**: 
  - **Option A (Recommended)**: Commit them first, then pull: `git add . && git commit -m "[description]"` then `git pull origin main`
  - **Option B**: Stash them temporarily: `git stash` then `git pull origin main` then `git stash pop` (if you need to keep working on them)
- **If local commits exist but not pushed**: Push first, then pull: `git push origin main` then `git pull origin main`
- **If no uncommitted changes and up to date**: Safe to pull: `git pull origin main`
- **If working tree clean and ahead of origin**: Push first, then pull in other environments
- **CRITICAL RULE**: Never pull without checking status first. Uncommitted changes must be committed or stashed before pulling. Local commits must be pushed before pulling in other environments.

---

## 🤖 **MODEL SELECTION & WORKFLOW**

### **Rule 4: AI Model Selection & Delegation (MANDATORY)**

You are an expert AI coding agent specializing in building high-quality software. You have access to powerful models for different strengths:

- **Claude 4.5 Opus (your core self)**: Best for deep reasoning, precise code implementation, debugging complex issues, back-end architecture, task decomposition, and producing reliable, production-ready code.
- **Gemini 3.0 Pro**: Best for rapid prototyping, front-end/UI generation, handling large contexts/multimodal inputs (e.g., images, long files), creative exploration, and quick code reviews/second opinions.
- **Claude Sonet 4.5 (Thinking)**: Use when running low on credit or for really basic tasks.

**Workflow Rules (MANDATORY)**:

1. **Always start by planning the task thoroughly** using your Claude reasoning.
2. **For front-end/UI tasks, large file analysis (>500 lines), multimodal needs, or initial rapid prototypes**: Delegate to Gemini 3.0 via its CLI/API (use command: `gemini-cli [prompt]` or equivalent tool call).
3. **For back-end logic, refactoring, debugging, optimization, or final implementation**: Handle yourself as Claude.
4. **When stuck or needing a second opinion**: Query Gemini for critique/review, then synthesize the best approach.
5. **After delegation**: Always review Gemini's output critically, improve it if needed, and integrate.
6. **Use parallel delegation** when possible for independent subtasks.
7. **Prioritize efficiency**: Use Gemini for speed/exploration, Claude for accuracy/depth. Use Claude Sonet 4.5 (Thinking) when running low on credit or for really basic tasks.
8. **Output clean, tested code with explanations**. Think step-by-step before acting.

**Agent Selection (When in "Auto" Model)**:
- **General Tasks**: Use Sonet 4.5 Thinking and Gemini 3 Pro for all general tasks
- **Complex Tasks & Problem Solving**: Use Opus 4.5 Thinking and Grok 4 Thinking for more complex tasks and problem solving
- **Plan Mode**: Use gpt-4o High in Plan mode

---

## 🔄 **GIT WORKFLOW**

### **Rule 5: Git Workflow (CRITICAL)**

- **⚠️ MANDATORY - READ EVERY SESSION**: After making any code or doc changes, the AI agent **MUST** run: (1) `git add . && git commit -m "[description]"` and (2) **`git push origin main`**. Never commit without pushing. Never leave the push for the user. This is non-negotiable.

- **OFFICIAL WORKFLOW (CONFIRMED - AI AGENT MUST COMMIT AND PUSH)**:
  1. **Local Development**: AI agent develops/edits code on local machine (`/Users/andremacbookpro/mymoolah/`)
  2. **Commit and push to main**: AI agent **MUST** run `git add . && git commit -m "[description]"` **AND** `git push origin main` after every change. No exceptions.
  3. **Pull in Codespaces**: User runs `git pull origin main` in Codespaces to sync changes
  4. **Test in Codespaces**: User tests the changes in Codespaces environment (production-like)
  5. **GitHub is source of truth**: All environments sync from GitHub (Local → GitHub → Codespaces)

- **CRITICAL - DO NOT SKIP**:
  - **AI agent MUST ALWAYS run git commit AND push to main after making changes.** This is mandatory. Do not leave pushes for the user.
  - **Always develop locally first** - never develop directly in Codespaces
  - **Always test in Codespaces** - never test on local machine
  - **Local = Development**, **Codespaces = Testing/Staging**, **GitHub = Source of Truth**

- **During work**: Make changes locally, update documentation

- **After work (AI AGENT MUST COMMIT AND PUSH - MANDATORY)**:
  1. AI agent runs `git add . && git commit -m "[descriptive message for all changes]"` (user approves/executes if in terminal)
  2. **AI agent MUST then run `git push origin main`** - do not stop at commit. Push every time.
  3. AI agent informs user: "✅ Changes committed and pushed to main. Pull in Codespaces (`git pull origin main`) to test."
  4. User pulls in Codespaces: `git pull origin main`
  5. User tests in Codespaces

- **User actions**: Pull in Codespaces and test. **Agent handles commit and push.**

---

## 📁 **WORKING DIRECTORY CONSTRAINTS**

### **Rule 6: Working Directory Constraints (STRICT)**

- ONLY work in `/mymoolah/` and subdirectories. Never at local root.
- **NEVER use git worktrees** - ONLY work in the main repository `/Users/andremacbookpro/mymoolah/`. Worktrees cause severe agent confusion and were completely removed (Jan 9, 2026).
- NEVER edit `mymoolah-wallet-frontend/pages/*.tsx` (Figma-managed, read-only). Adapt backend APIs instead.
- NEVER modify `/Figma/` sources. Backend adapts to Figma designs.
- Settings changes: Only in `/portal/` directories, not wallet directories.
- Always use explicit directory paths in commands.

---

## 🏗️ **DEVELOPMENT STANDARDS**

### **Rule 6A: ZERO TOLERANCE FOR SHORTCUTS AND WORKAROUNDS (CRITICAL)**

**NEVER EVER use shortcuts, workarounds, or "quick fixes" when encountering errors.**

**ALWAYS implement proper banking-grade solutions:**

- ❌ **FORBIDDEN**: Using wrong enum values as workarounds (e.g., using 'voucher' when 'cash_out' is needed)
- ❌ **FORBIDDEN**: Skipping migrations to avoid "complexity"
- ❌ **FORBIDDEN**: Hardcoding values instead of proper configuration
- ❌ **FORBIDDEN**: Using placeholder logic instead of proper implementation
- ❌ **FORBIDDEN**: "It works" mentality without proper architecture

- ✅ **REQUIRED**: Create proper migrations for database schema changes
- ✅ **REQUIRED**: Add enum values properly when needed
- ✅ **REQUIRED**: Use semantically correct categorization
- ✅ **REQUIRED**: Follow Mojaloop and ISO 20022 standards
- ✅ **REQUIRED**: Implement proper data models (no hacks)

**Example of WRONG approach:**
```javascript
// WRONG: Using 'voucher' as workaround for cash_out
vasType: 'voucher' // This works but violates data integrity
```

**Example of CORRECT approach:**
```javascript
// CORRECT: Create migration to add cash_out to enum, then use it
vasType: 'cash_out' // Semantically correct, requires migration
```

**Rationale:**
- MyMoolah is a global award-winning banking platform
- Security, compliance, and data integrity are NON-NEGOTIABLE
- Shortcuts create technical debt and regulatory risks
- Proper architecture is ALWAYS worth the extra 15 minutes

**When encountering enum/schema errors:**
1. STOP - Do NOT use workarounds
2. CREATE proper migration to fix the schema
3. UPDATE models with correct values
4. TEST the proper solution
5. DOCUMENT why the proper approach was needed

**This rule supersedes all convenience considerations. Banking-grade quality is paramount.**

---

### **Rule 7: Definition of Done (EVERY TASK)**

Every task must have: (1) Clean code with zero linter errors, (2) Documentation updated in `docs/`, (3) Tests authored with run instructions, (4) Migrations with rollbacks, (5) Security review, (6) Restart statement, (7) **Changes committed and pushed by AI agent** (agent runs `git add . && git commit -m "..."` then `git push origin main`—do not skip push), (8) PR created if applicable. No hardcoded data - use real database transactions.

### **Rule 8: Banking-Grade Security (NON-NEGOTIABLE)**

- Input validation and sanitization at API boundary. JWT HS512 with short expiry. Multi-tier rate limiting. Structured logging with PII redaction.
- TLS 1.3 enforced. Mojaloop FSPIOP standards. ISO 27001 ready.
- Parameterized queries only. AES-256-GCM encryption. RBAC access control.
- Consistent error taxonomy with safe user messaging (no sensitive data exposure).

### **Rule 9: Documentation (MANDATORY)**

- Update ALL relevant docs in `/mymoolah/docs/` after each change: `agent_handover.md`, `changelog.md`, `readme.md`, `development_guide.md`, `security.md`, `performance.md`, `banking_grade_architecture.md`
- Always check project documentation BEFORE creating or modifying anything.
- **CRITICAL**: Before any database/migration work, read `docs/DATABASE_CONNECTION_GUIDE.md` - contains standardized connection procedures, password management, and master migration scripts. **NEVER write custom connection logic** - always use provided helpers and scripts.
- Provide complete file contents when sharing code. Include code examples, API docs, migration procedures, testing instructions.

### **Rule 10: Testing Requirements (REQUIRED)**

- Author new tests alongside features (unit/integration/E2E). Provide sample `.env` and seed data. Clear run commands for local and cloud.
- Test coverage >90%. Custom tests only (no outdated scripts). Test isolation, mock external dependencies, cleanup test data.
- Ledger-specific: Verify debits == credits, no orphaned journal entries, reconciliations pass.

### **Rule 11: Error Handling & Validation (COMPREHENSIVE)**

- Structured error responses with consistent format and status codes. Safe user messaging (no sensitive data). Transaction rollback on error. ACID compliance.
- Validate all inputs at API boundary. Sanitize all user inputs. Type checking, range validation, required fields.
- Use validation middleware for all endpoints. Standard validation schemas (email, phone, amount). Custom validators for business logic.

### **Rule 12: Performance & Database (BANKING-GRADE)**

- Targets: API <200ms, DB queries <50ms, throughput >1,000 req/s, availability 99.9%.
- NEVER calculate sums in JavaScript - Use database aggregation (COUNT, SUM). Use database views for complex aggregations.
- Proper indexing (all foreign keys, frequently queried columns). Connection pooling. Single optimized queries with JOINs.
- Redis caching with intelligent invalidation. Multi-layer caching (Memory L1 + Redis L2 + Database L3).

---

## 💬 **COMMUNICATION & USER PREFERENCES**

### **Rule 13: Communication & User Preferences**

- Address user as "André" (first name only). Patient, step-by-step, non-technical explanations. Small, rollback-safe increments with explicit next steps.
- User preferences: Real transactions only (no dummy data). Simple balance lookups use caching/direct queries, not AI. AI only for deeper research. Notify before backend changes. Don't change working functionality when fixing another issue.
- Get explicit approval before destructive actions. User prefers to review and run changes themselves. Do not start/stop user servers (only indicate restart requirements).

---

## 📝 **SESSION END PROCEDURES**

### **Rule 14: Session Logging System (REQUIRED - FULLY AUTOMATED BY AI AGENT)**

- **Purpose**: Since each new Cursor chat is a new agent with no memory, session logs maintain chat history continuity
- **Location**: `docs/session_logs/` directory
- **Template**: Use `docs/session_logs/TEMPLATE.md` as a guide
- **Format**: `YYYY-MM-DD_HHMM_[description].md` (e.g., `2025-11-15_0936_ocr-kyc-simplification.md`)
- **At session start**: Read 2-3 most recent session logs to understand previous chat context
- **When to create (AUTOMATED - DO PROACTIVELY)**: 
  - **Create session log when work is complete**, not waiting for session end (user may close chat, lose connection, PC turns off, etc.)
  - **After completing significant work** or major milestones
  - **Before user indicates they're done** or if conversation is wrapping up
  - **Proactively create it** - don't wait for explicit "session end" signal
  - **AI agent MUST create and fill in** session log file completely with: session summary, tasks completed, key decisions, files modified, issues encountered, next steps, and important context for next agent
  - **AI agent MUST update** `docs/agent_handover.md` with official handover
  - **AI agent MUST commit AND push**: Run `git add . && git commit -m "[description]"` then **`git push origin main`** - every time after changes. No exceptions.
  - **AI agent MUST inform user**: "✅ Changes committed and pushed to main. Pull in Codespaces (`git pull origin main`) to test."
- **Integration**: Session logs (detailed chat history) + Agent handover (official status) = Complete continuity
- **User actions**: Pull in Codespaces and test. **Agent always runs commit and push.**

### **Quick Post-Work Checklist (AI AGENT MUST COMPLETE - DO THIS WHEN WORK IS DONE, NOT WAITING FOR SESSION END)**

- **Create and fill session log**: Create `docs/session_logs/YYYY-MM-DD_HHMM_[description].md` and fill in ALL sections completely (summary, tasks, decisions, files, issues, next steps, context for next agent). **Do this proactively when work is complete, not waiting for user to end session.**
- Update all relevant documentation
- Update `docs/agent_handover.md` with official handover
- Verify zero linter errors
- **Commit AND push to main (MANDATORY)**: AI agent runs `git add . && git commit -m "[descriptive commit message]"` **then `git push origin main`**. Do not skip the push.
- **Inform user**: "✅ Changes committed and pushed to main. Run `git pull origin main` in Codespaces to test."
- **Important**: Create session log when work is done, not waiting for session end (user may close chat, lose connection, etc.)
- **Workflow Reminder**: Local → **Commit + Push (agent)** → Pull in Codespaces (user) → Test in Codespaces (user)

---

## ⚠️ **CRITICAL REMINDERS**

**ZERO TOLERANCE FOR SHORTCUTS**: NEVER use workarounds, quick fixes, or compromises when encountering errors. ALWAYS implement proper banking-grade solutions with migrations, proper enum values, and correct data models. Mojaloop/ISO 20022 compliance is mandatory. Data integrity is non-negotiable. See Rule 6A and docs/ZERO_SHORTCUTS_POLICY.md for details.

GitHub is source of truth. Documentation is mandatory. Session logging is required for continuity and MUST be done by AI agent when work is complete (create, fill in, commit locally) - DO NOT wait for session end (user may close chat, lose connection, etc.). Security is non-negotiable. Tests are required. User approval required for destructive actions. No dummy data. Database-first (SQL aggregation, not JavaScript). Figma pages read-only. Small increments. Patient communication. **WORKFLOW**: AI agent develops locally → **commits AND pushes to main (agent MUST do both every time)** → user pulls in Codespaces → user tests. **Agent must never leave push to the user.** **IMPORTANT**: Any rules added to Cursor Settings must immediately be added to this .md file to keep them in sync.

**Current date**: December 22, 2025. Proceed with the user's coding request.

---

## 📚 **QUICK REFERENCE CHECKLISTS**

### **Quick Pre-Work Checklist (NEW SESSION - DO FIRST)**

- **STEP 0 - MANDATORY RULES CONFIRMATION**: 
  - Use `read_file` tool to actually read `docs/CURSOR_2.0_RULES_FINAL.md`
  - Provide proof of reading: Summarize 3-5 key rules, mention specific details, confirm understanding
  - State: "✅ Rules reading completed - I have read `docs/CURSOR_2.0_RULES_FINAL.md` and will follow all rules"
  - **NO WORK UNTIL THIS IS COMPLETE**
- **I am a new agent**: Acknowledge this is a new chat/session and I need to read previous agent work
- Read `docs/agent_handover.md` (previous session summary and current status)
- **Read recent session logs** in `docs/session_logs/` (read 2-3 most recent files for chat history context)
- Read `docs/changelog.md` (recent changes)
- Read `docs/agent_role_template.md` (operating charter)
- Read `docs/readme.md` (system overview)
- Read `docs/DATABASE_CONNECTION_GUIDE.md` (**MANDATORY** if working with databases, migrations, or UAT/Staging environments - prevents connection/password issues)
- **Check git status FIRST**: `git status` (ALWAYS check for uncommitted changes before pulling)
- **Pull safely based on status**:
  - If uncommitted changes: Commit or stash first, then pull
  - If local commits not pushed: Push first, then pull
  - If clean and up to date: Safe to pull `git pull origin main`
- `git log --oneline -10` (review recent commits)
- Check pending migrations/incomplete work
- Review relevant documentation for current task
- Understand current priorities and next steps from previous sessions

---

**Last Updated**: December 19, 2025  
**Version**: 2.1.0 - Model Selection & Workflow Integration
