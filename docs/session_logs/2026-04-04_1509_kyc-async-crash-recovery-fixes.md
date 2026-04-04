# KYC Async Crash Recovery + Security Fixes

**Date**: 2026-04-04 15:09
**Status**: COMPLETE
**Priority**: CRITICAL
**File Changed**: `controllers/kycController.js`

---

## Summary

Fixed the KYC status page "stuck at Under Review" bug. The root cause was that the fire-and-forget async IIFE in `uploadDocuments` had a catch block that only logged errors without recovering — leaving `kycStatus` at `under_review` permanently with no notification to the user. Additionally added a safety net in `getKYCStatus` and fixed two secondary bugs.

---

## Fixes Applied

### Fix 1 — Async IIFE catch block recovery [CRITICAL]
**Lines**: 393-411
**Problem**: When the async OCR processing crashed (for any reason — OpenAI timeout, DB connection loss, Cloud Run CPU throttling after 202), the catch block only logged the error. The user's `kycStatus` stayed at `under_review` forever, no notification was created, and the frontend polled indefinitely.
**Fix**: The catch block now calls `persistKycRejection()` to set `kycStatus = 'rejected'`, update the KYC record, and create a notification. If even that fails, a raw SQL fallback ensures the user is never permanently stuck.

### Fix 2 — getKYCStatus stale under_review safety net [HIGH]
**Lines**: 493-519
**Problem**: If Fix 1 somehow also fails (e.g., the entire async IIFE never executed), the user would still be stuck. No existing self-healing covered this case.
**Fix**: Added a 5-minute timeout check in `getKYCStatus`. If `under_review` has persisted for more than 5 minutes (OCR processing takes 30-60s max), the status is automatically set to `rejected` with the message "Document processing timed out. Please try uploading again." This triggers the rejection modal on the frontend so the user can retry.

### Fix 3 — manualVerifyKYC static method bug [HIGH]
**Lines**: 539-546
**Problem**: `Wallet.verifyKYC(walletId, ...)` was called as a static method, but `verifyKYC` is only defined as an instance method (`Wallet.prototype.verifyKYC`). This would throw "Wallet.verifyKYC is not a function" if called.
**Fix**: Now fetches the wallet instance first with `Wallet.findOne({ where: { walletId } })`, returns 404 if not found, then calls `wallet.verifyKYC()` on the instance.

### Fix 4 — uploadDocument userId security [MEDIUM]
**Line**: 16
**Problem**: The single-document `uploadDocument` endpoint used `req.body.userId` (client-provided), allowing any authenticated user to submit KYC for another user.
**Fix**: Now uses `req.user?.id` (from JWT auth middleware) with fallback to `req.body.userId` for backward compatibility.

---

## What Was NOT Changed (per Andre's instructions)
- KYC validation rules (ID matching, surname only, no first names, expiry for passport+licence)
- Error messages
- Processing overlay spinner
- Reset script
- Notification modal design
- Frontend polling logic (already correct)

---

## Root Cause Analysis

The async IIFE catch block (line 393) was the primary bug. When OCR processing threw an error (likely due to Cloud Run CPU throttling after the 202 response was sent, or OpenAI API issues), the catch only logged and did nothing:

```js
// BEFORE (broken)
} catch (kycError) {
    console.error('❌ KYC processing error (async):', kycError);
    // nothing — user stuck forever
}
```

Evidence: The 14:54 upload produced NO notification (neither success nor failure), while the 14:06 upload had produced a notification. This proves the async block crashed between the 202 response and any status update.

---

## External Agent Review

An external agent was consulted. Their analysis had 2 correct findings (Bug 2: catch block, Bug 3: static method), 2 incorrect findings (Bug 1: claimed `config/kycTierLimits.js` doesn't exist — it does; Bug 4: claimed status value mismatch — the fields are different), and 2 correct-but-irrelevant findings (Bug 5: userId security, Bug 6: Wallet model instantiation).

---

## Testing

```bash
# Reset KYC in staging:
./scripts/reset-kyc-staging.sh 1

# Then test in browser: staging.mymoolah.africa
# 1. Go to Profile > Identity Verification
# 2. Upload Andre's driver's licence
# 3. Watch the /kyc/status page
# Expected: transitions from "Under Review" to "Verified" (if OCR succeeds)
#           OR shows rejection modal with reason (if OCR fails)
#           NEVER stays stuck at "Under Review" permanently
```

---

## Files Modified

| File | Changes |
|------|---------|
| `controllers/kycController.js` | 4 fixes: catch recovery, stale safety net, static method, userId security |

---

## Next Steps

1. Deploy to staging and test the KYC upload flow
2. Check Cloud Run logs to identify the specific crash cause in the async block
3. Consider setting Cloud Run CPU allocation to "always allocated" if CPU throttling is the root cause
4. The `Wallet` import at line 3 still uses direct model factory — consider switching to `const { Wallet } = require('../models')` for consistency (low priority)
