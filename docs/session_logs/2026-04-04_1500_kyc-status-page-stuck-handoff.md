# KYC Status Page Stuck - Handoff to Next Agent

**Date**: 2026-04-04 15:00+  
**Status**: UNRESOLVED - needs next agent  
**Priority**: CRITICAL  
**User**: Andre (very frustrated - do NOT loop)

---

## THE PROBLEM

After uploading a valid driver's licence for KYC verification, the `/kyc/status` page gets **stuck at "Under Review" (50%)** and never transitions to "Verified" (66%). The OCR processing succeeds on the backend (logs show wallet verified, tier 1 set), but the frontend never detects the transition.

This happens for BOTH successful and failed verifications -- the page just stays at "Under Review" indefinitely.

---

## WHAT WAS ALREADY DONE (DO NOT REPEAT)

1. **Driver's licence ID matching** - FIXED: OCR returns prefixed IDs like `02/6411055084084`, now extracts last 13 digits. File: `services/kycService.js` lines ~1580-1600.

2. **Backend status reset before 202** - DONE: `controllers/kycController.js` lines 221-235 now sets `kycStatus = 'under_review'` BEFORE the 202 response.

3. **Frontend polling condition** - DONE: `rejected` added to polling list in both `pages/KYCStatusPage.tsx` and `components/KYCStatusPage.tsx`.

4. **Direct verified detection** - DONE BUT NOT WORKING: `handleRefreshStatus` (line 172) checks `data.kycStatus === 'verified'` and navigates. But the page still gets stuck.

5. **Polling interval** - Reduced from 10s to 5s.

6. **KYC reset script** - FIXED: `scripts/reset-kyc-staging.sh` no longer wipes `idNumber`.

7. **Error messages** - All improved to be user-friendly.

8. **Processing overlay** - Added animated spinner during upload/verification.

---

## ROOT CAUSE HYPOTHESIS (NOT YET VERIFIED)

The most likely cause is one of:

### Hypothesis A: Polling stops due to rate limiting
The `handleRefreshStatus` function returns early on 429 (line 159-162) WITHOUT calling `refreshUserStatus()`. With 5s polling + notification polling every 10s + other API calls, the user may be hitting rate limits. The poll backs off to 60s and the user thinks it's stuck.

**How to verify**: Add `console.log` to the 429 handler and check browser console.

### Hypothesis B: The KYC status API returns `under_review` even after backend processes
The `/api/v1/kyc/status` endpoint (kycController.js line 452) computes `finalKycStatus` from `user.kycStatus`. If the Sequelize model instance is cached/stale, it might return `under_review` even after the async block set it to `verified`.

**How to verify**: Check the staging Cloud Run logs for the `/api/v1/kyc/status` responses during the stuck period. Look for the `finalKycStatus` value.

### Hypothesis C: The async processing block fails silently  
The fire-and-forget async IIFE (line 290+) might be crashing before it reaches the `user.update({ kycStatus: 'verified' })` line. The `try/catch` logs the error but the frontend never knows.

**How to verify**: Check staging Cloud Run logs for errors after "Processing in background" during the stuck period. Look for `✅ User KYC: Tier 1` or any error.

### Hypothesis D: `refreshUserStatus()` in AuthContext swallows errors or uses stale cache
The `refreshUserStatus` function in `contexts/AuthContext.tsx` might have a caching layer or error handling that prevents the update from propagating.

**How to verify**: Read `contexts/AuthContext.tsx`, find the `refreshUserStatus` function, check for caching or error swallowing.

---

## DEBUGGING APPROACH (DO THIS FIRST)

### Step 1: Check backend logs
Ask Andre to reproduce the issue and immediately check Cloud Run logs for:
```
✅ User KYC: Tier 1    ← Did the backend actually verify?
❌ KYC                  ← Did it fail?
kycStatus.*verified     ← Was the user record updated?
```

### Step 2: Check the KYC status API response
Add a `console.log('KYC poll response:', data)` to `handleRefreshStatus` in `pages/KYCStatusPage.tsx` line 171 (after `const data = await response.json()`). Deploy and check browser console to see what the API actually returns during the stuck period.

### Step 3: Check for 429 rate limiting
Add `console.warn('KYC poll rate limited!')` inside the 429 handler (line 160). If this fires, the poll is being throttled.

### Step 4: Check AuthContext
Read `contexts/AuthContext.tsx` and find `refreshUserStatus`. Verify it actually fetches `/api/v1/users/me` and updates the user state. Check for any caching, debouncing, or error swallowing.

---

## KEY FILES

| File | What | Lines |
|------|------|-------|
| `controllers/kycController.js` | Upload handler + async processing + status endpoint | 220-250 (pre-202 reset), 290-340 (async OCR), 440-500 (status endpoint) |
| `services/kycService.js` | OCR processing + validation | 1580-1640 (ID matching), 1694-1770 (document format checks) |
| `mymoolah-wallet-frontend/pages/KYCStatusPage.tsx` | Status page with polling | 99 (useAuth), 144-195 (handleRefreshStatus), 236-246 (polling useEffect), 285-294 (auto-navigate) |
| `mymoolah-wallet-frontend/components/KYCStatusPage.tsx` | Duplicate of pages/ copy | Same structure |
| `mymoolah-wallet-frontend/contexts/AuthContext.tsx` | Auth context with refreshUserStatus | Check refreshUserStatus function |
| `mymoolah-wallet-frontend/pages/KYCDocumentsPage.tsx` | Upload page with processing overlay | 126-234 (handleSubmit) |

---

## TESTING

```bash
# Reset KYC in staging (preserves idNumber):
./scripts/reset-kyc-staging.sh 1

# Verify idNumber is preserved:
# Output should show: ID Number: 6411055084084

# Then test in browser: staging.mymoolah.africa
# 1. Go to Profile > Identity Verification
# 2. Upload Andre's driver's licence
# 3. Watch the /kyc/status page - it should transition from "Under Review" to "Verified"
# 4. If stuck, check browser console for poll responses
```

---

## WHAT NOT TO DO

- Do NOT modify the KYC validation rules (ID matching, surname matching, expiry checks) - those are CONFIRMED CORRECT by Andre
- Do NOT add first-name validation - Andre explicitly said to ignore first names
- Do NOT change the error messages - those were just fixed and approved
- Do NOT remove the processing overlay spinner - that was just added and approved
- Do NOT change the reset script behavior - just fixed to preserve idNumber
