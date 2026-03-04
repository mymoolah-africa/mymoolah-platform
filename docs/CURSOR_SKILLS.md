# MyMoolah Cursor Skills

Skills extend Cursor Agent with specialized knowledge for banking-grade, Mojaloop-standard platform development. Installed via `npx skills add`.

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
| Rule 5 (Banking-grade security) | security-best-practices |
| REST API design | api-design-principles |
| Tailwind/React UI | tailwind-design-system, frontend-design |
| 11-language, inclusive UX | accessibility-compliance, interaction-design |
