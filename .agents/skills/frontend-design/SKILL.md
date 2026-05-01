---
name: frontend-design
description: Build production-grade MyMoolah React interfaces for wallet, portal, overlays, transaction views, VAS, KYC, payment confirmation, and admin screens. Use when implementing or reviewing frontend UI code. Pairs with design-spec for product direction and tailwind-design-system for shared tokens/components.
---

# MyMoolah Frontend Design

Use this skill when writing or changing frontend code. It turns approved product direction into secure, fast, accessible React UI.

## Use This Skill When

- Implementing wallet UI, routed pages, overlays, product purchase flows, statements, receipts, or transaction views.
- Implementing portal/admin UI outside deep RBAC/workflow logic.
- Improving visual hierarchy, responsive behavior, loading states, error states, or empty states.
- Reviewing frontend code for product polish, speed, accessibility, and financial clarity.

## Do Not Use This Skill When

- Only writing a product/design brief. Use `design-spec`.
- Only changing Tailwind tokens, CVA variants, CSS variables, or shared primitives. Use `tailwind-design-system`.
- Implementing complex admin RBAC, maker-checker, audit logs, operational tables, or portal backend APIs. Use `admin-portal-builder`.
- Working on money movement logic, ledger, VAT, reconciliation, or DB writes. Use the relevant backend/audit skills.

## Required Companion Skills

- Use `accessibility-compliance` for forms, dialogs, bottom sheets, modals, KYC, PINs, voucher reveal/copy, and confirmation screens.
- Use `robust-financial-forms` for any form that submits money, KYC, beneficiary, payout, or purchase data.
- Use `security-best-practices` when rendering PII, voucher PINs, auth state, admin data, or provider errors.
- Use `tailwind-design-system` before adding new shared classes, tokens, or primitives.

## MyMoolah Frontend Rules

- Code is the frontend source of truth.
- Prefer existing components, overlay patterns, and utility functions before creating new ones.
- Keep wallet experiences mobile-first and thumb-friendly.
- Keep portal/admin experiences dense enough for operations but still readable.
- Never introduce dummy financial flows, fake production data, or placeholder provider values.
- Never display raw stack traces, SQL, secrets, full ID numbers, full voucher PINs by default, or provider internals to users.

## Wallet Architecture

The wallet uses step-based flows and overlays. For product purchases, send money, top-up, cash-out, vouchers, airtime, electricity, and bill payments:

- Prefer existing overlay components and shared UI.
- Keep each step focused on one decision.
- Show amount, fee, total, recipient/supplier, and confirmation before submit.
- Include loading, timeout, pending, success, failed, and retry/support states.
- Use direct/cached API data for balances; do not use AI for simple balance display.

## Visual Standard

Build screens that feel:

- Trustworthy: clean hierarchy, clear labels, calm surfaces.
- Fast: lightweight UI, skeletons, no blocking spinners where data shape is known.
- Premium: refined spacing, consistent typography, subtle transitions.
- Accessible: readable text, 44px touch targets, focus states, no color-only status.
- Secure: masked sensitive values, deliberate reveal actions, safe error messages.

Brand anchors:

- Primary green: `#86BE41`
- Secondary blue: `#2D8CCA`
- Font: Montserrat
- Amounts/references: tabular numbers or mono where alignment matters

Avoid generic purple fintech gradients, crypto aesthetics, heavy animation, noisy cards, and icon-only financial actions.

## Implementation Checklist

Before editing:

- Locate the existing component or flow first.
- Check whether a design spec exists. If unclear, use `design-spec` or ask André.
- Check shared utilities for currency, dates, transaction display, masking, and status labels.
- Decide if changes are local UI only or design-system-level.

While editing:

- Use semantic tokens/classes rather than hardcoded one-off styling where possible.
- Keep components small and state explicit.
- Use skeleton loading for known financial data shapes.
- Use explicit error, timeout, and pending messages.
- Preserve keyboard, touch, and screen-reader behavior.
- Keep network calls and expensive calculations out of render loops.

Before finishing:

- Verify responsive mobile behavior.
- Verify sensitive data is masked.
- Verify destructive/payment actions have confirmation.
- Run targeted frontend build/tests/lints where practical.
- Update docs/session notes when the UI changes a stable workflow.

## Financial UI Patterns

Money movement confirmation must include:

- Source
- Recipient/supplier
- Amount
- Fee
- Total debit or total received
- Reference
- Expected timing
- Clear primary CTA
- Cancel/back path

Transaction and receipt UI must include:

- Status label
- Amount with sign/meaning
- Date/time
- Reference
- Counterparty/supplier
- Support path for pending/failed states

Voucher/token UI must:

- Mask PIN/code by default.
- Provide deliberate reveal/copy.
- Show expiry and redemption instructions.
- Avoid screenshots/logging of sensitive data.

## Security And Performance Defaults

- Safe user-facing errors only.
- Mask PII: ID numbers, account numbers, voucher PINs, provider references where not needed.
- Do not persist sensitive data in browser storage unless an existing secure pattern already does so.
- Prefer CSS transitions over JS animation.
- Respect reduced motion.
- Avoid large client-side data reductions for financial totals; ask backend for aggregated values.

## When To Stop

Stop and ask André before expanding scope if the UI change requires backend behavior changes, new financial flows, new supplier behavior, production writes, or a design decision not covered by the current brief.
