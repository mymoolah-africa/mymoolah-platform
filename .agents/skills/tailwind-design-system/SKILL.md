---
name: tailwind-design-system
description: Maintain MyMoolah's Tailwind/CSS design system: tokens, semantic colors, typography, spacing, CVA variants, shared UI primitives, dark mode, responsive rules, and component consistency across wallet and portal. Use for design-system changes, not one-off screen implementation.
---

# MyMoolah Tailwind Design System

Use this skill for shared visual infrastructure. It defines how MyMoolah UI is built consistently, securely, accessibly, and efficiently across wallet and portal.

## Use This Skill When

- Adding or changing design tokens, CSS variables, Tailwind theme config, or semantic color names.
- Creating or modifying shared primitives in `components/ui/`.
- Adding CVA variants, button/card/input/dialog patterns, badge systems, or status chips.
- Standardizing wallet and portal UI patterns.
- Fixing repeated hardcoded colors, spacing, shadows, typography, or responsive behavior.
- Reviewing Tailwind code for maintainability and performance.

## Do Not Use This Skill When

- Planning a product flow or writing a design brief. Use `design-spec`.
- Implementing one specific wallet/portal screen using existing patterns. Use `frontend-design`.
- Deep-auditing ARIA/screen reader behavior. Use `accessibility-compliance`.
- Building portal RBAC/workflows/backend APIs. Use `admin-portal-builder`.

## Design-System Boundaries

Design-system changes should be rare and deliberate. Before changing shared tokens or primitives:

- Search for existing tokens/components.
- Confirm the change benefits more than one screen or removes meaningful duplication.
- Preserve backwards compatibility unless the current branch is explicitly being reworked.
- Avoid visual churn that changes working UI without a user-facing reason.

## Core Tokens

Canonical brand anchors:

```css
--color-primary: #86BE41;
--color-primary-hover: #6fa334;
--color-primary-foreground: #ffffff;

--color-secondary: #2D8CCA;
--color-secondary-hover: #2474a8;
--color-secondary-foreground: #ffffff;

--font-heading: 'Montserrat', system-ui, sans-serif;
--font-body: 'Montserrat', system-ui, sans-serif;
--font-mono: 'JetBrains Mono', 'Fira Code', ui-monospace, monospace;
```

Semantic tokens must describe purpose, not brand:

- `success`: completed, credited, verified.
- `warning`: pending, needs attention, delayed.
- `error` or `destructive`: failed, blocked, rejected.
- `muted`: secondary text, dividers, inactive surfaces.
- `surface` or `card`: primary content surfaces.
- `border` and `ring`: focus and structure.

Do not hardcode brand hex values throughout components when a token exists.

## Component Rules

Buttons:

- Minimum mobile tap target: 44px.
- Primary action uses primary green.
- Secondary action uses secondary blue, outline, or neutral style.
- Destructive actions must be visually distinct and confirmed.
- Disabled states must remain readable and not imply success.

Cards:

- Use consistent radius, border, and subtle shadow.
- Avoid heavy elevation stacks.
- Financial hero cards must prioritize amount, label, action, and status.

Inputs:

- Visible labels, not placeholder-only.
- Error text must be explicit and not color-only.
- Focus rings must be visible.
- Sensitive inputs need masking/reveal patterns where appropriate.

Badges/status:

- Use semantic status tokens.
- Labels must be text-based: Completed, Pending, Failed, Reversed, Expired.
- Never rely on color alone.

## CVA Variant Guidance

Use CVA or existing local variant patterns when a component needs multiple sanctioned variants. Keep variants semantic:

```ts
variant: {
  primary: 'bg-primary text-primary-foreground hover:bg-primary-hover',
  secondary: 'bg-secondary text-secondary-foreground hover:bg-secondary-hover',
  outline: 'border border-border bg-transparent hover:bg-muted',
  ghost: 'hover:bg-muted',
  destructive: 'bg-error text-error-foreground hover:bg-error/90',
}
```

Avoid adding one-off variants named after a single page or supplier. If a style is only used once, keep it local.

## Layout And Responsive Rules

- Mobile wallet: design from 360px upward.
- Portal/admin: optimize for desktop while preserving tablet usability.
- Use responsive grids deliberately; do not squeeze financial tables into unreadable mobile layouts.
- Prefer sticky bottom actions for mobile confirmation flows when it improves completion.
- Respect safe areas and avoid hidden content behind fixed nav.

## Accessibility And Security Defaults

- 44px minimum touch targets.
- Visible focus states.
- Strong contrast for text and controls.
- Reduced-motion-safe animations.
- No color-only status.
- Mask sensitive values in shared components by default where possible.
- Shared components must not log props that may contain PII, voucher PINs, tokens, account numbers, or provider payloads.

## Performance Defaults

- Prefer CSS transitions and transforms.
- Avoid heavy animation libraries for normal wallet interactions.
- Keep shared components small and tree-shakeable.
- Avoid large dependency additions for styling unless André approves.
- Do not compute financial aggregates in frontend components; use backend/API totals.

## Review Checklist

Before finishing a design-system change:

- Existing UI still uses the correct brand tokens.
- New tokens have clear semantic names.
- Shared components remain accessible and keyboard-safe.
- No PII or provider internals are logged.
- Mobile touch targets are preserved.
- The change does not silently restyle unrelated flows.
- Targeted frontend build/lint/test was run where practical.

## Handoff

If the task now requires applying the system to a concrete screen, switch to `frontend-design`.
