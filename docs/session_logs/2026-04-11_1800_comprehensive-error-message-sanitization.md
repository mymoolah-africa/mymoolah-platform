# Session Log: Comprehensive Error Message Sanitization

**Date**: 2026-04-11 18:00  
**Agent**: Cursor Agent (Opus 4.6)  
**Version**: v2.97.3  
**Duration**: ~45 minutes  
**Previous Session**: `2026-04-11_1330_electricity-failover-meter-min-fix.md`

---

## Summary

Comprehensive codebase-wide audit and fix of ALL generic/leaking error messages across 40 files. Every user-facing API endpoint now returns safe, specific error messages with machine-readable `errorCode` fields instead of leaking internal `error.message`, `details: error.message`, or stack traces to clients. Frontend overlays updated to correctly read and display backend error messages.

---

## Problem

After fixing the electricity `METER_MIN_AMOUNT` error in the previous session, André identified that generic "Purchase Failed" or "Something went wrong" messages were pervasive across the entire application. Users were seeing unhelpful error text instead of actionable messages explaining what went wrong.

Root causes identified:
1. **Backend**: ~100+ catch blocks returned raw `error.message` to clients, leaking internal DB errors, Sequelize validation text, supplier API responses, and stack traces
2. **Backend**: Many error responses lacked `errorCode` field, making frontend error branching impossible
3. **Backend**: `NODE_ENV !== 'production'` conditional exposed full error.message and stack traces in staging
4. **Frontend**: Several overlays read the wrong error path (`err.response.message` instead of `err.response.data.message`)
5. **Frontend**: Several overlays captured error details but displayed hardcoded generic text instead

---

## Tasks Completed

### Backend — Routes (9 files)
| File | Fixes | Key Changes |
|------|-------|-------------|
| `overlayServices.js` | 9 catch blocks | Removed all `error.message` leaks; added `errorCode`; removed `stack` exposure in staging |
| `wallets.js` | 12 catch blocks | Added `errorCode` + safe messages to all |
| `kyc.js` | 8 catch blocks | Removed 3 `details: error.message` leaks |
| `transactionRoutes.js` | 5 catch blocks | Removed `details: error.message`, replaced "Database error" |
| `beneficiaries.js` | 5 catch blocks | Added `errorCode` to all |
| `notifications.js` | 5 catch blocks | Added missing `console.error` + `errorCode` |
| `unifiedBeneficiaries.js` | 10 catch blocks | Removed all `error: error.message` |
| `googleReviewRoutes.js` | 2 catch blocks | Removed conditional dev leak |
| `referrals.js` | 1 catch block | Added `errorCode` |
| `dynamicApiRoutes.js` | 1 catch block | Replaced `message: error.message` |

### Backend — Controllers (22 files)
| File | Fixes | Key Changes |
|------|-------|-------------|
| `flashController.js` | 17 catch blocks | Removed `error.message`, `flashError`, `details` from all responses |
| `voucherController.js` | 24 catch blocks | Removed `err.message` fallbacks, `details: error.message` |
| `walletController.js` | 14 catch blocks | Removed NODE_ENV conditional leaks |
| `userController.js` | 7 catch blocks | Removed `details: error.message` |
| `authController.js` | 9 catch blocks | Removed `error.message` from registration/login/token |
| `transactionController.js` | 6 catch blocks | Replaced "Database error" + details |
| `peachController.js` | 15 catch blocks | Removed `details: error.response?.data`, restructured logging |
| `catalogSyncController.js` | 9 catch blocks | Replaced `message: error.message` |
| `googleReviewController.js` | 9 catch blocks | Removed conditional dev error exposure |
| `feedbackController.js` | 8 catch blocks | Same pattern as google review |
| `settingsController.js` | 4 catch blocks | Removed `details: error.message` |
| `supportController.js` | 3 catch blocks | Removed `error: error.message` |
| `notificationController.js` | 3 catch blocks | Replaced `error: err.message` |
| `usdcController.js` | 7 structured log fixes | Removed error.message from console logs to prevent log injection |
| `mobilemartController.js` | 4 catch blocks | Replaced `message: error.message` |
| `productController.js` | 2 catch blocks | Replaced `error: error.message` |
| `qrPaymentController.js` | 2 catch blocks | Replaced `message: error.message` |
| `kycController.js` | 1 catch block | Removed `details: error.message` |
| `ledgerController.js` | 1 catch block | Added safe message + errorCode |
| `userFavoritesController.js` | 2 catch blocks | Replaced `error: error.message` |
| `airtimeController.js` | 1 catch block | Replaced `error: error.message` |
| `referralController.js` | 1 catch block | Replaced `error: error.message` in client response |

### Backend — Middleware (2 files)
| File | Fix |
|------|-----|
| `secureLogging.js` | Removed `stack` from dev responses; always returns safe message; added `errorCode: 'INTERNAL_ERROR'` |
| `auth.js` | Added `errorCode: 'TOKEN_MISSING'` (401) and `errorCode: 'TOKEN_INVALID'` (403) |

### Frontend — Overlays (6 files)
| File | Fix |
|------|-----|
| `BillPaymentOverlay.tsx` | Fixed 2 wrong error paths: `err.response.message` → `err.response.data.message` |
| `FlashEeziCashOverlay.tsx` | Added `errorMessage` state; shows actual error instead of hardcoded text |
| `CashoutEasyPayOverlay.tsx` | Added `errorMessage` state; shows actual error instead of hardcoded text |
| `TopupEasyPayOverlay.tsx` | Added `errorMessage` state; shows actual error instead of hardcoded text |
| `DigitalVouchersOverlay.tsx` | Improved generic error text |
| `TopupVoucherOverlay.tsx` | Replaced "Something went wrong" with voucher-specific guidance |

---

## Files Modified (40 files)

### Controllers (22)
- `controllers/airtimeController.js`
- `controllers/authController.js`
- `controllers/catalogSyncController.js`
- `controllers/feedbackController.js`
- `controllers/flashController.js`
- `controllers/googleReviewController.js`
- `controllers/kycController.js`
- `controllers/ledgerController.js`
- `controllers/mobilemartController.js`
- `controllers/notificationController.js`
- `controllers/peachController.js`
- `controllers/productController.js`
- `controllers/qrPaymentController.js`
- `controllers/referralController.js`
- `controllers/settingsController.js`
- `controllers/supportController.js`
- `controllers/transactionController.js`
- `controllers/usdcController.js`
- `controllers/userController.js`
- `controllers/userFavoritesController.js`
- `controllers/voucherController.js`
- `controllers/walletController.js`

### Routes (9)
- `routes/beneficiaries.js`
- `routes/dynamicApiRoutes.js`
- `routes/googleReviewRoutes.js`
- `routes/kyc.js`
- `routes/notifications.js`
- `routes/overlayServices.js`
- `routes/referrals.js`
- `routes/transactionRoutes.js`
- `routes/unifiedBeneficiaries.js`
- `routes/wallets.js`

### Middleware (2)
- `middleware/auth.js`
- `middleware/secureLogging.js`

### Frontend (6)
- `mymoolah-wallet-frontend/components/overlays/BillPaymentOverlay.tsx`
- `mymoolah-wallet-frontend/components/overlays/cashout-easypay/CashoutEasyPayOverlay.tsx`
- `mymoolah-wallet-frontend/components/overlays/digital-vouchers/DigitalVouchersOverlay.tsx`
- `mymoolah-wallet-frontend/components/overlays/flash-eezicash/FlashEeziCashOverlay.tsx`
- `mymoolah-wallet-frontend/components/overlays/topup-easypay/TopupEasyPayOverlay.tsx`
- `mymoolah-wallet-frontend/components/overlays/topup-voucher/TopupVoucherOverlay.tsx`

---

## Remaining (Non-Critical, Admin-Only)

These files still have `error.message` in responses but are admin/internal endpoints only (not user-facing):
- `routes/monitoring.js` (8 instances) — health/metrics endpoints
- `routes/reconciliation.js` (15 instances) — admin reconciliation
- `routes/supplierComparison.js` (6 instances) — admin supplier comparison
- `controllers/dynamicApiController.js` (13 instances) — dynamic API admin
- `controllers/dtMercuryController.js` (7 instances) — DT Mercury admin

These can be addressed in a future session if needed.

---

## Key Decisions

1. **Safe error messages only**: Every user-facing endpoint now returns a human-readable, actionable error message that never exposes internal details
2. **errorCode on every error response**: Machine-readable codes like `WALLET_LIST_FAILED`, `FLASH_PURCHASE_FAILED`, etc. enable frontend to branch on specific error types
3. **Server-side logging preserved**: All `console.error()` calls retained for debugging — only client responses sanitized
4. **Staging protected**: Removed the `NODE_ENV !== 'production'` conditional that was leaking full error details in staging environment

---

## Next Steps

1. Deploy backend and frontend with new tag
2. Consider addressing admin endpoint error leaks (monitoring, reconciliation, supplierComparison, dynamicApi, dtMercury) in a future session
3. Consider creating a shared `AppError` class with standard error codes enum for consistency

---

## Context for Next Agent

- 40 files changed across backend controllers, routes, middleware, and frontend overlays
- Pattern applied: remove `error.message` / `details` / `stack` from JSON responses → replace with safe `message` + `errorCode`
- Admin/internal endpoints still have some `error.message` exposure (acceptable for now, flagged above)
- Frontend overlays now use `err.response?.data?.message` correctly (was broken before)
- Three overlays (FlashEeziCash, CashoutEasyPay, TopupEasyPay) now have `errorMessage` state to display dynamic errors
