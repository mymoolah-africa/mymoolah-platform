---
name: find-skills
description: >-
  For MyMoolah Treasury Platform (MMTP) in Cursor — discover installable agent skills when the user asks
  "how do I do X", "find a skill for X", or wants to extend capabilities. Always reconcile with the repo
  inventory (`docs/CURSOR_SKILLS.md`, `.agents/skills/`) before recommending external skills.
---

# Find Skills (MyMoolah / Cursor)

This skill extends Cursor agents with a **project-first** workflow: MMTP already ships banking-grade skills under `.agents/skills/`. Use the open registry (`npx skills`, skills.sh) only when the repo does not already cover the task.

## When to use this skill

Use when the user:

- Asks "how do I do X" where X might map to an existing skill (in-repo or registry)
- Says "find a skill for X" / "is there a skill for X"
- Wants to install, update, or compare skills
- Asks to extend agent capabilities for a domain (testing, design, ledger, migrations, etc.)

## MMTP rules vs skills (read before recommending)

| Layer | Location | Role |
|-------|----------|------|
| **Rules** | `.cursor/rules/*.mdc` | Always-on project law — session workflow, git, DB access, security |
| **Skills** | `.agents/skills/**/SKILL.md` | On-demand procedures — read when the task matches |
| **Canonical** | `docs/CURSOR_2.0_RULES_FINAL.md` | Full rule set |

**Non-negotiables stay in rules**, not skills: e.g. all DB access via `scripts/db-connection-helper.js`, migrations via `./scripts/run-migrations-master.sh`, parameterized SQL only, no dummy production data, Codespaces testing sequence. Installing a third-party skill never overrides those rules.

## Step 0 — Check the MMTP inventory first (Cursor)

Before `npx skills find` or browsing skills.sh:

1. Read **`docs/CURSOR_SKILLS.md`** — canonical table of installed skills and MMTP alignment.
2. List **`.agents/skills/`** — source of truth on disk (`ls .agents/skills/` from repo root).

If a listed skill already matches the domain, **tell the user the path** and follow that skill’s `SKILL.md` instead of installing duplicates.

### Quick domain → existing MMTP skill map

| Domain | Prefer this repo skill (path) |
|--------|-------------------------------|
| Ledger, recon, CoA, audit trail | `.agents/skills/auditing/SKILL.md` |
| Sequelize / PostgreSQL migrations | `.agents/skills/safe-database-migrations/SKILL.md` |
| Redis, locks, idempotency cache | `.agents/skills/redis-caching-and-locks/SKILL.md` |
| Financial API tests (Jest/Supertest) | `.agents/skills/fintech-test-driven-development/SKILL.md` |
| Admin portal / RBAC / MMAP | `.agents/skills/admin-portal-builder/SKILL.md` |
| Wallet / portal UI polish | `.agents/skills/frontend-design/SKILL.md` |
| SQL / DB performance | `.agents/skills/postgresql-optimization/SKILL.md`, `sql-optimization-patterns` |
| REST API shape | `.agents/skills/api-design-principles/SKILL.md` |
| Security patterns | `.agents/skills/security-best-practices/SKILL.md` |
| Cron / scheduled jobs | `.agents/skills/background-jobs-and-cron/SKILL.md` |
| KYC / forms / money entry | `.agents/skills/robust-financial-forms/SKILL.md` |
| OCR / local ML | `.agents/skills/local-ai-and-ocr-pipelines/SKILL.md` |
| HTML decks / explainers | `.agents/skills/slide-deck-builder`, `visual-page-builder`, `workflow-visualizer`, `explainer-graphic` |

## Skills CLI (open ecosystem)

Package manager: **`npx skills`** (registry + GitHub sources). Browse: [skills.sh](https://skills.sh/).

**Commands:**

| Command | Purpose |
|---------|---------|
| `npx skills find [query]` | Search by keyword (may be interactive) |
| `npx skills add <owner/repo-or-URL> --skill <name> --agent cursor -y` | Install into this repo for **Cursor** without prompts |
| `npx skills check` | Check for updates |
| `npx skills update` | Update CLI-tracked installs (`skills-lock.json`) |

### Cursor + MMTP install pattern (non-interactive)

Always run from **repository root** (`mymoolah`). The Skills CLI can prompt for “which agents” unless you pin the agent:

```bash
cd /path/to/mymoolah
npx skills add https://github.com/vercel-labs/skills --skill find-skills --agent cursor -y
```

Generic form:

```bash
npx skills add <owner/repo> --skill <skill-directory-name> --agent cursor -y
```

**Install location for this project:** `.agents/skills/<skill-name>/` (universal path used by Cursor per `docs/CURSOR_SKILLS.md`).

**`-g` (global):** only if André explicitly wants a user-level install outside the repo. Default for MMTP work: **project install** (no `-g`) so the skill is versioned with the monorepo.

After adding a skill: update **`docs/CURSOR_SKILLS.md`** if the skill is meant to be documented for other agents.

## Helping users find skills (workflow)

### Step 1 — Clarify need

Identify domain, specific task, and whether it is banking-specific (ledger, POPIA, payments) vs generic (CSS-only tweak).

### Step 2 — Leaderboard (optional)

For generic web ecosystem gaps, [skills.sh leaderboard](https://skills.sh/) helps surface widely used skills. For **ledger, recon, or SA regulatory** work, prefer **in-repo `auditing`** over generic “finance” skills from the internet.

### Step 3 — Search the registry

If inventory + leaderboard are insufficient:

```bash
npx skills find "<keywords>"
```

Examples: `react performance`, `playwright e2e`, `changelog`.

### Step 4 — Verify before recommending

Do not recommend on title alone:

1. **Install / usage signals** — prefer well-maintained sources; treat unknown authors cautiously.
2. **Source reputation** — `vercel-labs`, `anthropics`, `microsoft` tend to be higher signal; still read the skill.
3. **Conflict with MMTP** — reject skills that encourage mock financial data, direct `pg`/`Sequelize` pools bypassing `db-connection-helper.js`, or `npx sequelize-cli` for migrations.

### Step 5 — Present options

Include: name, what it does, source, install command, link on skills.sh (if applicable).

### Step 6 — Install only with consent

If André wants it installed, use **`--agent cursor -y`** from repo root. After install, confirm files under `.agents/skills/<name>/` and that `skills-lock.json` updated when the CLI manages the skill.

## MMTP-specific categories (search hints)

| Category | Example `npx skills find` queries |
|----------|----------------------------------|
| Wallet / React / Vite | `react`, `vite`, `typescript` |
| Testing | `jest`, `supertest`, `playwright` |
| GCP / Cloud Run | `cloud run`, `gcp`, `ci cd` |
| Docs / API | `openapi`, `readme`, `changelog` |
| Design / a11y | Already covered in-repo — check Step 0 first |

## When no skill fits

1. Say no matching skill was found (registry + repo).
2. Offer to implement using MMTP rules + existing services.
3. Optional: `npx skills init <name>` for a **new local** skill under `.agents/skills/` — follow `.cursor/skills-cursor/create-skill` guidance if present; keep banking non-negotiables in **rules**, not in contradictory skill text.

## Creating a new MMTP project skill (summary)

- Sweep `.agents/skills/` and `docs/CURSOR_SKILLS.md` for duplicates.
- Add `SKILL.md` with YAML frontmatter (`name`, `description`).
- Register in `docs/CURSOR_SKILLS.md` so the next agent discovers it without registry search.
