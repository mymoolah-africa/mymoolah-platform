# MyMoolah Cursor Skills

Skills extend Cursor Agent with specialized knowledge for banking-grade, Mojaloop-standard platform development. Installed via `npx skills add`.

## Rules vs skills (how agents should use both)

| Layer | Location | When it applies |
|-------|----------|------------------|
| **Rules** | `.cursor/rules/*.mdc` | Every session — workflow, git, DB standards, security, comms |
| **Skills** | `.agents/skills/**/SKILL.md` | On demand — read when the task matches the skill (e.g. migrations, recon, Redis) |
| **Canonical doc** | `docs/CURSOR_2.0_RULES_FINAL.md` | Full rule set; keep in sync with `.mdc` summaries |

**Note:** Skills are not a substitute for rules. Critical non‑negotiables (e.g. `db-connection-helper.js` only, parameterized SQL) must stay in rules so they are never skipped.

## Installed Skills

| Skill | Source | Purpose |
|-------|--------|---------|
| **api-design-principles** | wshobson/agents | REST/GraphQL API design, scalability, developer experience |
| **postgresql-optimization** | github/awesome-copilot | PostgreSQL JSONB, indexing, query optimization |
| **sql-optimization-patterns** | wshobson/agents | SQL tuning, EXPLAIN analysis, performance |
| **tailwind-design-system** | wshobson/agents | Tailwind v4, design tokens, component libraries |
| **accessibility-compliance** | wshobson/agents | WCAG 2.2, ARIA patterns, screen readers |
| **interaction-design** | wshobson/agents | Microinteractions, motion design, UX polish |
| **security-best-practices** | supercent-io/skills-template | Security patterns for applications |
| **frontend-design** | .agents/skills/ (project) | Distinctive UI, typography, aesthetics |
| **auditing** | .agents/skills/ (project) | Banking-grade ledger auditing v2.1.0, FICA/POPIA/SARB compliance, SHA-256 hash-chained audit trails, double-entry reconciliation, SOX-grade internal controls, IFRS presentation, Cloud Scheduler integration, Opus 4.6 optimization |
| **admin-portal-builder** | .agents/skills/ (project) | MMTP Admin Portal (MMAP) — RBAC, dashboard architecture, data tables, maker-checker workflows, admin audit logging, overlay patterns, API design for admin endpoints |
| **fintech-test-driven-development** | .agents/skills/ (project) | Jest/Supertest TDD for financial endpoints, idempotency, race conditions |
| **safe-database-migrations** | .agents/skills/ (project) | Zero-downtime PostgreSQL/Sequelize migrations |
| **redis-caching-and-locks** | .agents/skills/ (project) | Distributed locks, rate limiting, idempotency caching |
| **robust-financial-forms** | .agents/skills/ (project) | Type-safe financial data entry, KYC forms |
| **background-jobs-and-cron** | .agents/skills/ (project) | Idempotent Node.js cron jobs for reconciliation |
| **local-ai-and-ocr-pipelines** | .agents/skills/ (project) | ML/OCR pipelines for KYC document processing |

## Installation Location

- **All skills**: `.agents/skills/` (single parent directory)
- **CLI-managed**: 7 skills via `npx skills add` (api-design-principles, postgresql-optimization, etc.)
- **Project skill**: `frontend-design` in `.agents/skills/` (custom, not in registry)
- **Lock file**: `skills-lock.json` (tracks CLI-installed skills)

## Update Skills

```bash
npx skills update
```

## Add More Skills

```bash
npx skills find <keyword>      # Search
npx skills add <owner/repo> --skill <name> --agent cursor -y
```

## Alignment with MMTP Rules

| Rule | Skill support |
|------|---------------|
| Rule 9 (DB aggregation, <50ms) | postgresql-optimization, sql-optimization-patterns |
| Rule 5 (Banking-grade security) | security-best-practices, auditing |
| FICA/POPIA/SARB compliance | auditing |
| Ledger, reconciliation, audit trail | auditing |
| REST API design | api-design-principles |
| Tailwind/React UI | tailwind-design-system, frontend-design |
| 11-language, inclusive UX | accessibility-compliance, interaction-design |
| Admin portal, dashboard, RBAC | admin-portal-builder |
| Maker-checker workflows | admin-portal-builder, auditing |

## Skill Sources & Provenance

| Skill | Primary Sources | License |
|-------|----------------|---------|
| **auditing** v2.1.0 | openclaw/skills Agent Audit Trail (MIT-0), odinlayer SOX Compliance (LobeHub), CFO Stack /cfo-audit, MMTP project-specific | MIT-0 / Custom |
| **admin-portal-builder** v1.0.0 | MMTP project-specific (portal codebase patterns) | Custom |

## Skills Sweep Protocol

Before creating a new skill, sweep `.agents/skills/` to avoid duplicates:
```bash
ls .agents/skills/
```
Total installed: 20 skills (7 CLI-managed + 13 project-specific).
