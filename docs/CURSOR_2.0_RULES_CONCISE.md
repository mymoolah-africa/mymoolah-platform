# Cursor 2.0 Rules - Concise Version for Settings

**Copy these rules into Cursor 2.0 Settings → Rules section**

---

## Rule 1: Git Workflow (CRITICAL)
- **Local**: Before work: `cd /Users/andremacbookpro/mymoolah && git pull origin main`. After work: `git add . && git commit -m "message" && git push origin main`
- **Codespaces**: Before work: `cd /workspaces/mymoolah-platform && git pull origin main`. After work: `git add . && git commit -m "message" && git push origin main`
- GitHub is source of truth. Always pull before work, push after work. Never work with uncommitted changes.

## Rule 2: Agent Handover (MANDATORY)
- **At session start**: Read `docs/agent_handover.md`, `docs/agent_role_template.md`, `docs/changelog.md`, `docs/readme.md`
- **At session end**: Update `docs/agent_handover.md` with task summary, files changed, API/data model changes, security notes, tests added, restart requirements, next steps
- Understand current priorities and pending work before making changes.

## Rule 3: Working Directory Constraints (STRICT)
- **ONLY work in `/mymoolah/`** and subdirectories. Never at local root.
- **NEVER edit** `mymoolah-wallet-frontend/pages/*.tsx` (Figma-managed, read-only). Adapt backend APIs instead.
- **NEVER modify** `/Figma/` sources. Backend adapts to Figma designs.
- **Settings changes**: Only in `/portal/` directories, not wallet directories.
- Always use explicit directory paths in commands.

## Rule 4: Definition of Done (EVERY TASK)
Every task must have: (1) Clean code with zero linter errors, (2) Documentation updated in `docs/`, (3) Tests authored with run instructions, (4) Migrations with rollbacks, (5) Security review, (6) Restart statement, (7) Changes committed and pushed, (8) PR created if applicable. No hardcoded data - use real database transactions.

## Rule 5: Banking-Grade Security (NON-NEGOTIABLE)
- Input validation and sanitization at API boundary. JWT HS512 with short expiry. Multi-tier rate limiting. Structured logging with PII redaction.
- TLS 1.3 enforced. Mojaloop FSPIOP standards. ISO 27001 ready.
- Parameterized queries only. AES-256-GCM encryption. RBAC access control.
- Consistent error taxonomy with safe user messaging (no sensitive data exposure).

## Rule 6: Documentation (MANDATORY)
- Update ALL relevant docs in `/mymoolah/docs/` after each change: `agent_handover.md`, `changelog.md`, `readme.md`, `development_guide.md`, `security.md`, `performance.md`, `banking_grade_architecture.md`
- Always check project documentation BEFORE creating or modifying anything.
- Provide complete file contents when sharing code. Include code examples, API docs, migration procedures, testing instructions.

## Rule 7: Testing Requirements (REQUIRED)
- Author new tests alongside features (unit/integration/E2E). Provide sample `.env` and seed data. Clear run commands for local and cloud.
- Test coverage >90%. Custom tests only (no outdated scripts). Test isolation, mock external dependencies, cleanup test data.
- Ledger-specific: Verify debits == credits, no orphaned journal entries, reconciliations pass.

## Rule 8: Error Handling & Validation (COMPREHENSIVE)
- Structured error responses with consistent format and status codes. Safe user messaging (no sensitive data). Transaction rollback on error. ACID compliance.
- Validate all inputs at API boundary. Sanitize all user inputs. Type checking, range validation, required fields.
- Use validation middleware for all endpoints. Standard validation schemas (email, phone, amount). Custom validators for business logic.

## Rule 9: Performance & Database (BANKING-GRADE)
- Targets: API <200ms, DB queries <50ms, throughput >1,000 req/s, availability 99.9%.
- **NEVER calculate sums in JavaScript** - Use database aggregation (COUNT, SUM). Use database views for complex aggregations.
- Proper indexing (all foreign keys, frequently queried columns). Connection pooling. Single optimized queries with JOINs.
- Redis caching with intelligent invalidation. Multi-layer caching (Memory L1 + Redis L2 + Database L3).

## Rule 10: Communication & User Preferences
- Address user as "André" (first name only). Patient, step-by-step, non-technical explanations. Small, rollback-safe increments with explicit next steps.
- **User preferences**: Real transactions only (no dummy data). Simple balance lookups use caching/direct queries, not AI. AI only for deeper research. Notify before backend changes. Don't change working functionality when fixing another issue.
- Get explicit approval before destructive actions. User prefers to review and run changes themselves. Do not start/stop user servers (only indicate restart requirements).

---

## Quick Pre-Work Checklist
- [ ] Read `agent_handover.md` and `changelog.md`
- [ ] `git pull origin main`
- [ ] Check pending migrations/incomplete work
- [ ] Review relevant documentation

## Quick Post-Work Checklist
- [ ] Update all relevant documentation
- [ ] Run tests, verify zero linter errors
- [ ] `git add . && git commit -m "message" && git push origin main`
- [ ] Update `agent_handover.md`

---

**CRITICAL REMINDERS**: GitHub is source of truth. Documentation is mandatory. Security is non-negotiable. Tests are required. User approval required for destructive actions. No dummy data. Database-first (SQL aggregation, not JavaScript). Figma pages read-only. Small increments. Patient communication.

