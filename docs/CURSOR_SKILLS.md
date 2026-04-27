# MyMoolah Cursor Skills

Skills extend Cursor Agent with specialized knowledge for banking-grade, Mojaloop-standard platform development. Installed via `npx skills add`.

## Rules vs skills (how agents should use both)

| Layer | Location | When it applies |
|-------|----------|------------------|
| **Rules** | `.cursor/rules/*.mdc` | Every session — workflow, git, DB standards, security, comms |
| **Skills** | `.agents/skills/**/SKILL.md` | On demand — read when the task matches the skill (e.g. migrations, recon, Redis) |
| **Canonical doc** | `docs/CURSOR_2.0_RULES_FINAL.md` | Full rule set; keep in sync with `.mdc` summaries |

**Note:** Skills are not a substitute for rules. Critical non‑negotiables (e.g. `db-connection-helper.js` only, parameterized SQL) must stay in rules so they are never skipped.


## 2026-04-27 Skills Upgrade Notes

The live inventory is `.agents/skills/*/SKILL.md`. If this document and the folder disagree, trust the folder and update this document.

Upgrade principles now applied:
- Oversized skills should keep `SKILL.md` concise and move depth to companion reference files.
- Project rules override third-party skill text, especially `db-connection-helper.js`, JWT HS512, Codespaces testing, and code-as-frontend-source-of-truth.
- Visual skills share `../_shared/visual-output-reference.md` for tool routing, MyMoolah brand defaults, and PII-safe examples.
- Skill routing should prefer the narrowest applicable skill before loading broad audit/security guidance.

## Installed Skills

Total installed: 21 project skills. The live folder inventory remains the source of truth.

| Skill | Source | Purpose |
|-------|--------|---------|
| **accessibility-compliance** | wshobson/agents + MMTP-tuned | WCAG 2.2, ARIA patterns, TalkBack/mobile accessibility, inclusive wallet and portal UI |
| **admin-portal-builder** | .agents/skills/ (project) | MMTP Admin Portal (MMAP): RBAC, maker-checker, admin audit logging, dashboard/data-table/overlay patterns |
| **api-design-principles** | wshobson/agents | REST/GraphQL API design, scalability, developer experience |
| **auditing** | .agents/skills/ (project) | Concise banking-grade ledger/VAT/reconciliation/compliance router; deep reference preserved in `reference-full.md` |
| **background-jobs-and-cron** | .agents/skills/ (project) | Cloud Scheduler endpoints, node-cron fallbacks, idempotent scheduled jobs, large backfills |
| **explainer-graphic** | .agents/skills/ (project) | Analogy-led infographics and educational graphics |
| **find-skills** | vercel-labs/skills + MMTP-tuned | Discover/install skills after checking in-repo inventory first |
| **fintech-test-driven-development** | .agents/skills/ (project) | Jest/Supertest TDD for financial endpoints, idempotency, race conditions, ledger invariants |
| **frontend-design** | .agents/skills/ (project) | Distinctive UI, typography, aesthetics |
| **interaction-design** | wshobson/agents + MMTP-tuned | Microinteractions, motion design, loading states, reduced-motion-safe feedback |
| **local-ai-and-ocr-pipelines** | .agents/skills/ (project) | OCR/ML pipelines, Tesseract fallback, Transformers.js singleton model loading |
| **postgresql-optimization** | github/awesome-copilot + MMTP-tuned | PostgreSQL JSONB, indexing, query optimization, db-helper-safe direct query patterns |
| **redis-caching-and-locks** | .agents/skills/ (project) | Distributed locks, rate limiting, idempotency caching |
| **robust-financial-forms** | .agents/skills/ (project) | Type-safe financial data entry, KYC forms |
| **safe-database-migrations** | .agents/skills/ (project) | Zero-downtime PostgreSQL/Sequelize migrations and safe concurrent indexing |
| **security-best-practices** | supercent-io/skills-template + MMTP-tuned | OWASP, POPIA, JWT HS512, secrets, rate limiting, PII-safe logging |
| **slide-deck-builder** | .agents/skills/ (project) | Self-contained HTML slide decks, presenter mode, keyboard navigation |
| **sql-optimization-patterns** | wshobson/agents | SQL tuning, EXPLAIN analysis, performance anti-patterns |
| **tailwind-design-system** | wshobson/agents + MMTP-tuned | Tailwind v4, design tokens, MyMoolah brand colours, component libraries |
| **visual-page-builder** | .agents/skills/ (project) | Self-contained HTML explainers, landing pages, documentation pages, reports |
| **workflow-visualizer** | .agents/skills/ (project) | Interactive workflow, architecture, system, swimlane, and data-flow diagrams |

## Installation Location

- **All skills**: `.agents/skills/` (single parent directory)
- **CLI-managed**: tracked in `skills-lock.json` and MMTP-tuned where needed.
- **Project skills**: custom skills live beside CLI-managed skills in `.agents/skills/`.
- **Lock file**: `skills-lock.json` (tracks CLI-installed skills)

## Update Skills

```bash
npx skills update
```

## Add More Skills

```bash
npx skills find <keyword>      # Search
npx skills add <owner/repo> --skill <name> --agent cursor -y   # Always pass --agent cursor -y to avoid interactive agent selection
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
| **auditing** v2.2.0 | openclaw/skills Agent Audit Trail (MIT-0), odinlayer SOX Compliance (LobeHub), CFO Stack /cfo-audit, MMTP project-specific; full previous reference preserved in `reference-full.md` | MIT-0 / Custom |
| **admin-portal-builder** v1.1.0 | MMTP project-specific (portal codebase patterns); full previous reference preserved in `reference-full.md` | Custom |

## Skills Sweep Protocol

Before creating a new skill, sweep `.agents/skills/` to avoid duplicates:
```bash
ls .agents/skills/
```
Total installed: 21 skills (8 CLI-managed + 13 project-specific).
