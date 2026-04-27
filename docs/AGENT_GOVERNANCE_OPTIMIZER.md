# Agent Governance Optimizer

## Purpose

The Agent Governance Optimizer is a weekly, approval-gated service that reviews MyMoolah's Cursor rules, agent skills, and related governance documentation. Its purpose is to keep MMTP agent guidance accurate, current, and efficient without allowing automation to weaken banking-grade controls or merge changes without human review.

## Scope

Initial scope is limited to:

- `.cursor/rules/**/*.mdc`
- `.agents/skills/**/SKILL.md`
- `.agents/skills/**/reference*.md`
- `.agents/skills/_shared/**/*.md`
- `docs/CURSOR_SKILLS.md`
- `docs/CURSOR_2.0_RULES_FINAL.md`
- `CLAUDE.md`

Runtime application logic, migrations, secrets, deployment scripts, production configuration, and financial code are out of scope unless André explicitly expands the service later.

## Operating Model

The optimizer runs from Cloud Scheduler against a Cloud Run HTTP endpoint using the existing Google OIDC authentication pattern in `middleware/cloudSchedulerAuth.js`.

Default cadence:

- Staging first: Sunday 03:30 SAST
- Production later: Sunday 03:30 SAST only after at least one staging run has been reviewed

The service is draft-only. It must never merge, deploy, or push directly to `main`.

## Safety Gates

The optimizer must block or flag any proposed change that:

- Removes non-negotiable project rules such as `db-connection-helper.js`, parameterized SQL, HS512 JWT, PII redaction, approved restart scripts, real-data-only guidance, Figma historical-only positioning, or production-write approval.
- Touches paths outside the configured allowlist.
- Mentions secrets, private keys, `.env` values, tokens, passwords, or production data exports.
- Attempts to weaken destructive-action approval requirements.
- Produces a large diff without a clear rationale and validation summary.

## Review And Approval

The service records every run in `agent_optimizer_runs`. Depending on mode:

- `dry_run`: creates a run log and returns findings only.
- `draft_pr`: creates or updates a GitHub branch and draft PR only when safe file changes exist.
- `report_only`: records a report without publishing changes.

André reviews the draft PR. Only a human merge to `main` is allowed.

## Data Sources

Allowed source types:

- Local repo inventory.
- Official Cursor rules and skills documentation.
- Official dependency/model documentation explicitly allowlisted in service configuration.
- Project canonical docs.

Broad internet search can be used for human-readable recommendations, but broad search findings must not become direct edits without review.

## Rollback

Because the service only drafts changes on a branch, rollback is normally closing the PR or deleting the branch. If a reviewed PR is merged and later found to be wrong, revert the merge commit and record the issue in `docs/AGENT_HANDOVER.md` and the next session log.

## Required Validation

Every optimizer run should report:

- Rule file frontmatter validity.
- Skill frontmatter validity.
- Broken skill reference paths.
- Drift between `docs/CURSOR_SKILLS.md` and the live `.agents/skills/` inventory.
- Overlong always-on rules.
- Missing non-negotiable project law.
- Safety-gate pass/fail.
- Published branch/PR URL when applicable.
