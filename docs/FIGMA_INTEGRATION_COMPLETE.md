# Historical Figma Integration Record

**Status**: Historical only — Figma is no longer part of the active MyMoolah development workflow.

This document is kept as a short compatibility note because older docs and commits may link to the former Figma integration guide. The old approach used Figma early in the project as a design input and code-generation aid. That workflow has been retired.

## Current Position

- The codebase is the frontend source of truth.
- Agents and developers may edit routed pages, overlays, shared components, and design tokens directly.
- Do not wait for, request, or depend on Figma files before implementing wallet or portal UI.
- Do not treat any `.tsx` file as read-only because of its original design source.
- Use the MyMoolah design system, current product code, and active project docs as the implementation authority.

## Historical Context

Figma was useful during early prototyping to bootstrap visual direction and some React component structure. Those references are now historical. If a historical note mentions "Figma-generated" code, interpret it only as origin history, not as an instruction for current work.

## Current Frontend References

- Wallet frontend: `mymoolah-wallet-frontend/`
- Portal frontend: `portal/admin/frontend/`
- Design guidance: `.agents/skills/frontend-design/SKILL.md`, `.agents/skills/tailwind-design-system/SKILL.md`, `.agents/skills/admin-portal-builder/SKILL.md`
- Portal guide: `docs/PORTAL_DEVELOPMENT_GUIDE.md`
- Current agent rules: `docs/CURSOR_2.0_RULES_FINAL.md`
