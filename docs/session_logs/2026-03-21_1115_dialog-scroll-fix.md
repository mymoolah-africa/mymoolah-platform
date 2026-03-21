# Session Log: Dialog Scroll Fix (Universal)

**Date**: 2026-03-21 11:15
**Agent**: Claude 4.6 Opus (Cursor)
**Task**: Fix Pay Now modal scrolling issue on Send Money page

---

## Summary

Fixed a universal scrolling issue affecting all Radix `DialogContent`-based modals across the wallet frontend. The Pay Now modal on the Send Money page could not scroll between sticky top header and sticky bottom navigation because the shared `DialogContent` component had no `max-height` or `overflow` constraints.

## Root Cause

The shared `DialogContent` component (`components/ui/dialog.tsx`) used `fixed` positioning with `top-[50%] translate-y-[-50%]` centering but had no `max-h-*` or `overflow-y-auto`. When modal content exceeded viewport height (e.g., Pay Now with payment method grid + beneficiary fields + amount + reference), the content extended off-screen with no scroll capability.

## Fix Applied

1. **`components/ui/dialog.tsx`** (line 96): Added `max-h-[85vh] overflow-y-auto` to the base `DialogContent` class string. This applies universally to ALL dialogs.

2. **`styles/globals.css`**: Added smooth mobile touch-scrolling CSS for `[data-slot="dialog-content"]` with `-webkit-overflow-scrolling: touch` and `overscroll-behavior: contain`.

## Scope of Impact

The fix is universal — applies to every `DialogContent` usage across the frontend:
- `pages/SendMoneyPage.tsx` — Pay Now, Payment, Add Beneficiary, Add Contact, Edit Beneficiary modals
- `components/SendMoneyPage.tsx` — same modals (duplicate component)
- `components/ServicesPage.tsx` — purchase complete dialog
- `components/KYCDocumentsPage.tsx` — camera dialog
- `components/LoginPage.tsx` — terms, security, FAQ dialogs (already had manual override, no conflict)
- `components/RegisterPage.tsx` — same (already had manual override, no conflict)
- `components/ui/command.tsx` — command dialog

## Files Modified

| File | Change |
|------|--------|
| `mymoolah-wallet-frontend/components/ui/dialog.tsx` | Added `max-h-[85vh] overflow-y-auto` to base DialogContent classes |
| `mymoolah-wallet-frontend/styles/globals.css` | Added touch-scroll CSS for dialog-content data-slot |

## What Was NOT Changed

- No API changes
- No backend changes
- No functionality changes to any modals
- Login/Register pages still have their own `max-h-[85vh] overflow-y-auto` (redundant but harmless — not touched to avoid breaking working code)

## Testing

Rebuild frontend and test any dialog/modal to confirm scrolling works:
- Send Money > Pay Now modal (the reported issue)
- Send Money > Pay existing beneficiary modal
- Any other dialog across the app

## Next Steps

- Test in Codespaces after pull + rebuild
- Verify scroll works on iOS Safari (touch-scroll CSS added)
- No further action needed

## Context for Next Agent

The shared `DialogContent` component at `components/ui/dialog.tsx` is the single source of truth for all Radix-based dialog styling. Any future dialog will automatically get `max-h-[85vh] overflow-y-auto` from the base component. If a specific dialog needs different constraints, callers can override via `className` prop (Tailwind's `cn()` utility handles merging).
