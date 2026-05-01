# Session Log - 2026-05-01 - Frontend Skill Routing Optimization

**Session Date**: 2026-05-01 13:20 SAST  
**Agent**: Cursor AI Agent  
**User**: André  
**Session Type**: Skills governance / frontend design workflow

---

## Session Summary
Reviewed the three frontend/design-related skills after André added a new `design` skill. Confirmed the skill is valuable as a pre-build design specification tool, but should not be merged into the implementation or Tailwind design-system skills. Renamed it to `design-spec` and rewrote all three skills so each has a precise activation boundary.

---

## Tasks Completed
- [x] Reviewed `.agents/skills/design/SKILL.md`, `.agents/skills/frontend-design/SKILL.md`, and `.agents/skills/tailwind-design-system/SKILL.md`.
- [x] Added `.agents/skills/design-spec/SKILL.md` with valid skill frontmatter and concise Design.md/product-spec routing.
- [x] Removed the old `.agents/skills/design/SKILL.md` file.
- [x] Rewrote `.agents/skills/frontend-design/SKILL.md` for React UI implementation, wallet overlays, portal screens, financial UI states, performance, masking, and safe frontend errors.
- [x] Rewrote `.agents/skills/tailwind-design-system/SKILL.md` for Tailwind/CSS tokens, semantic colors, shared primitives, CVA variants, accessibility defaults, and performance-safe styling.
- [x] Updated `.agents/skills/find-skills/SKILL.md` and `docs/CURSOR_SKILLS.md` with the new routing.
- [x] Updated `docs/CHANGELOG.md` and `docs/AGENT_HANDOVER.md`.

---

## Key Decision
Keep the three skills separate:

- `design-spec`: use before coding to define product intent, UX flow, states, copy, acceptance criteria, and security/accessibility expectations.
- `frontend-design`: use while coding concrete React wallet/portal/overlay UI.
- `tailwind-design-system`: use only for shared tokens, primitives, CVA variants, Tailwind/CSS, and cross-app consistency.

This keeps context smaller and improves routing accuracy. A merged mega-skill would load too much generic guidance and reduce performance.

---

## Validation
- Confirmed live skill inventory contains 22 `SKILL.md` files.
- Confirmed `design-spec`, `frontend-design`, and `tailwind-design-system` all contain clear "use" and "do not use" sections.
- `git diff --check` passed.

---

## Next Agent Notes
- Use `design-spec` when André asks what a screen/flow should be or wants a Design.md prompt.
- Use `frontend-design` when actually editing wallet/portal UI.
- Use `tailwind-design-system` only when shared visual infrastructure changes.
- Pair with `accessibility-compliance`, `robust-financial-forms`, and `security-best-practices` for financial forms, KYC, PII, voucher PINs, payment confirmation, and admin-sensitive UI.
