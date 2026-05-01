---
name: design-spec
description: Write MyMoolah product design specifications before UI implementation. Use when creating Design.md briefs, screen specs, UX flow plans, AI design prompts, or acceptance criteria before coding wallet, portal, onboarding, payments, VAS, or admin experiences. Do not use for React/Tailwind implementation.
---

# MyMoolah Design Spec

Use this skill to define the product and UX intent before implementation. It produces implementation-ready design specifications, not code.

## Use This Skill When

- André asks for a design brief, Design.md, screen spec, UX plan, wireframe description, or product flow.
- A UI task is ambiguous and needs agreement on structure, states, copy, or user journey before coding.
- A design prompt is needed for Stitch, Figma-like tools, image generation, or another AI design system.
- A wallet, portal, VAS, payout, KYC, statement, receipt, reconciliation, or admin screen needs product direction.

## Do Not Use This Skill When

- Writing React, TypeScript, CSS, or Tailwind classes. Use `frontend-design`.
- Creating tokens, CVA variants, Tailwind theme config, or shared UI primitives. Use `tailwind-design-system`.
- Checking ARIA, WCAG, keyboard navigation, or screen reader behavior in detail. Use `accessibility-compliance`.
- Building admin RBAC, maker-checker, audit logs, or operational tables. Use `admin-portal-builder` as well.

## Routing With Related Skills

- Start with `design-spec` when the question is "what should this screen/flow be?"
- Move to `frontend-design` when the question is "build this UI in the app."
- Add `tailwind-design-system` when shared tokens/components or design system consistency are being changed.
- Add `accessibility-compliance` for forms, modals, confirmations, older users, screen readers, or legal-risk flows.
- Add `security-best-practices` when the UI exposes PII, auth, KYC, payment confirmation, PINs, vouchers, or secrets.

## MyMoolah Product Principles

Every spec must optimize for:

- Trust: financial actions must feel safe, explicit, and auditable.
- Speed: users must understand the next action immediately.
- Clarity: amounts, fees, totals, recipient details, and status must be obvious.
- Accessibility: mobile-first, legible, plain English, no color-only status.
- Security: mask sensitive values and avoid exposing IDs, PINs, tokens, or internal provider details.
- Performance: design for lightweight screens, fast decision-making, skeleton states, and minimal visual noise.

Avoid crypto, gaming, neon, speculative finance, cluttered dashboards, decorative-only motion, and vague compliance wording.

## Brand Anchors

- Primary green: `#86BE41`
- Secondary blue: `#2D8CCA`
- Typography: Montserrat
- Tone: clean, premium, trustworthy, mobile-first, South African fintech
- Default theme: light, high contrast, calm surfaces

Use brand colors with restraint. Green is for primary action and positive emphasis. Blue is for information, links, secondary actions, and trust cues. Do not use bright competing accent colors unless they serve a clear status purpose.

## Required Spec Structure

Use this structure unless the user asks for another format:

```md
# [Feature Or Screen Name] Design Spec

## Objective
[What this screen or flow must achieve.]

## User Context
[Who is using it, what they need, what risk or anxiety must be reduced.]

## UX Flow
[Step-by-step path, including entry point, confirmation, success, failure, and recovery.]

## Screen Structure
[Top-level hierarchy: header, content sections, key cards, forms, footer/actions.]

## Components
[Cards, buttons, inputs, lists, chips, modals, banners, receipts, tables.]

## States
[Loading, empty, validation error, pending, completed, failed, reversed, timeout, support path.]

## Copy Guidance
[Plain English labels and examples. No provider internals or sensitive details.]

## Accessibility And Security
[Tap targets, contrast, focus, masking, PII handling, confirmation requirements.]

## Implementation Notes
[Which existing app patterns/components should be reused. No full code.]

## Acceptance Criteria
[Specific checks that prove the design is ready to build.]
```

## Financial UX Requirements

Every money movement spec must show:

- Amount
- Fee
- Total debit or total received
- Source wallet/account
- Recipient or supplier
- Reference
- Status
- Reversal/refund path where applicable
- Support path if pending or failed

For voucher, PIN, token, or payout screens:

- Mask sensitive codes by default.
- Make "copy" and "reveal" actions deliberate.
- Show redemption instructions and expiry when available.
- Never expose raw ID numbers, full mobile numbers, provider stack traces, or internal API errors.

## Output Quality Bar

A good MyMoolah design spec is:

- Specific enough to implement without guesswork.
- Short enough for an engineer to use.
- Explicit about failure states and security.
- Consistent with wallet overlays and portal admin patterns.
- Clear about when to reuse existing components.

If the design spec will be implemented immediately, end with: "Next skill: `frontend-design`."
