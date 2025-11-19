# Zapper QR Types - Modal Refactoring Summary

## Overview
Refactored the QR payment confirmation modal to support all 6 production Zapper QR types with clear, maintainable conditional logic.

## The 6 Production QR Types

### QR Type 1: No Amount, Editable Amount, No Reference, No Tip
- **Amount**: 0 (editable input field shown)
- **Tip**: Not enabled (field hidden)
- **Reference**: None (field hidden, not shown in summary)
- **Summary**: "Pay R<amount> to <merchant>"

### QR Type 2: No Amount, Editable Amount, Static Reference, No Tip
- **Amount**: 0 (editable input field shown)
- **Tip**: Not enabled (field hidden)
- **Reference**: Static (e.g., "TestRefStatic12345") - shown in summary only, not as input field
- **Summary**: "Pay R<amount> to <merchant>", "REFERENCE: <reference>"

### QR Type 3: No Amount, Editable Amount, No Reference, Tip Enabled
- **Amount**: 0 (editable input field shown)
- **Tip**: Enabled (optional input field shown, default 10%)
- **Reference**: None (field hidden, not shown in summary)
- **Summary**: "Pay R<amount + tip> to <merchant>", "TIP: R<tip>", "PAYMENT (EXCLUDING TIP): R<amount>"

### QR Type 4: Pre-populated Amount (Non-editable), Reference, No Tip
- **Amount**: Pre-populated (e.g., R1.11) - field hidden, non-editable
- **Tip**: Not enabled (field hidden)
- **Reference**: Static (e.g., "REF12345") - shown in summary only, not as input field
- **Summary**: "Pay R1.11 to <merchant>", "REFERENCE: <reference>"

### QR Type 5: Pre-populated Amount (Editable), Reference, Tip Enabled
- **Amount**: Pre-populated (e.g., R1.11) - field visible and editable (because tip is enabled)
- **Tip**: Enabled (optional input field shown)
- **Reference**: Static - shown in summary only, not as input field
- **Summary**: "Pay R<amount + tip> to <merchant>", "TIP: R<tip>", "PAYMENT (EXCLUDING TIP): R<amount>", "REFERENCE: <reference>"

### QR Type 6: Pre-populated Amount (Non-editable), Custom/Editable Reference, No Tip
- **Amount**: Pre-populated (e.g., R1.11) - field hidden, non-editable
- **Tip**: Not enabled (field hidden)
- **Reference**: Custom/editable (e.g., "REF12345" pre-populated, user can edit) - shown as input field
- **Summary**: "Pay R1.11 to <merchant>", "CUSTOMREF: <reference>" (uses custom label)

## Refactoring Changes

### Helper Functions Created (Lines 71-129)

1. **`shouldShowAmountField()`**: Determines if amount input field should be visible
   - Returns `true` when: amount is 0 OR tip is enabled
   - Returns `false` when: amount is pre-populated AND tip is not enabled

2. **`shouldShowTipField()`**: Determines if tip input field should be visible
   - Returns `true` when tip is enabled

3. **`shouldShowReferenceField()`**: Determines if reference input field should be visible
   - Returns `true` when reference is editable (custom reference)

4. **`shouldShowReferenceInSummary()`**: Determines if reference should be shown in summary
   - Returns `true` when reference exists (static or custom)

5. **`getReferenceLabel()`**: Gets the appropriate label for reference
   - Returns custom label (uppercase) when reference is editable and custom label exists
   - Returns "REFERENCE" otherwise

6. **`getDisplayAmount()`**: Gets the amount to display in summary
   - Uses confirmAmount if set, otherwise uses pre-populated amount

7. **`getTotalPaymentAmount()`**: Calculates total payment (amount + tip)
   - Used for summary display when tip is entered

8. **`isValidPayment()`**: Validates if payment can be processed
   - Returns `true` when effective amount > 0 (from input or pre-populated)

### Modal Structure

The modal now uses a clear structure:
1. **Payment Summary Box** (always shown when pendingPaymentData exists)
   - Shows "Pay R<amount> to <merchant>"
   - Conditionally shows tip breakdown
   - Conditionally shows reference

2. **Input Fields Section** (conditionally shown based on QR type)
   - Merchant (always shown, read-only)
   - Amount (conditionally shown via `shouldShowAmountField()`)
   - Tip (conditionally shown via `shouldShowTipField()`)
   - Custom Reference (conditionally shown via `shouldShowReferenceField()`)

3. **Action Buttons**
   - Cancel (always enabled unless processing)
   - Approve & Pay (disabled when `!isValidPayment()` or processing)

## Backend Changes

### Reference Handling
- Fixed empty string check (treats `''` as null)
- Returns `null` when no reference provided (no auto-generation)

### Tip Detection
- Extracts tip info from Zapper API `features` object
- Fallback: parses URL pattern `40|278|13` to detect tip enabled
- Calculates default tip percentage (defaults to 10%)

### Custom Reference Detection
- Parses URL pattern `33|REF12345|1|CustomRef:` to detect custom/editable references
- Extracts custom label (e.g., "CustomRef")

### Response Enhancement
- Added `referenceEditable` and `customReferenceLabel` to payment details

## Benefits of Refactoring

1. **Clarity**: Helper functions make the logic explicit and easy to understand
2. **Maintainability**: Changes to field visibility logic are centralized
3. **Testability**: Each helper function can be tested independently
4. **Readability**: Modal JSX is cleaner with descriptive function names
5. **Consistency**: All field visibility decisions use the same pattern

## Testing Checklist

- [ ] QR Type 1: Amount field shows, no tip, no reference
- [ ] QR Type 2: Amount field shows, no tip, reference in summary only
- [ ] QR Type 3: Amount field shows, tip field shows, no reference
- [ ] QR Type 4: Amount field hidden, no tip, reference in summary only
- [ ] QR Type 5: Amount field shows (because tip enabled), tip field shows, reference in summary
- [ ] QR Type 6: Amount field hidden, no tip, custom reference field shows

## Files Modified

1. `controllers/qrPaymentController.js` - Backend QR validation and payment processing
2. `mymoolah-wallet-frontend/pages/QRPaymentPage.tsx` - Frontend modal refactoring
3. `mymoolah-wallet-frontend/services/apiService.ts` - API service tip parameter

