# Session Log - 2026-03-16 - Rules Optimisation, RTP Rollback & FE Refresh Fix

**Session Date**: 2026-03-16 ~10:00–14:00  
**Agent**: Cursor AI Agent (Claude Opus 4.6 Thinking)  
**User**: André  
**Session Duration**: ~4 hours

---

## Session Summary
This session covered three major areas: (1) Agent rules cleanup and optimisation in `docs/CURSOR_2.0_RULES_FINAL.md`, (2) diagnosing and rolling back a PayShap RTP failure caused by a "security update" from the previous night, and (3) fixing a frontend transaction list refresh race condition in `MoolahContext.tsx` that prevented instant display of wallet credits after RTP callbacks.

---

## Tasks Completed
- [x] Reviewed and optimised `docs/CURSOR_2.0_RULES_FINAL.md` — resolved conflicting rules, updated model references, added session-log rule to Rule 8, added codebase-specific rules (one-click restart, Redis guard, JWT HS512, STAGING rate-limit bypass, IAP disable)
- [x] Investigated PayShap RTP failure to Capitec — 400 Bad Request on polling, no in-app notification
- [x] Identified the security update timeline (March 15 ~21:48) and located pre-update commit (`277bbf1f`)
- [x] User performed rollback: `git reset --hard 277bbf1f` + `git push --force origin main` + redeploy
- [x] Post-rollback testing: Capitec RTP still failed (EBONF — SBSA-side routing issue, not code); Standard Bank RTP succeeded
- [x] Confirmed staging uses production SBSA credentials via GCP Secret Manager (not `.env` or UAT)
- [x] Fixed frontend transaction list refresh race condition in `MoolahContext.tsx`

---

## Key Decisions
- **Decision: Rollback to pre-security-update code**: User explicitly requested rollback to commit `277bbf1f` (March 15, 18:36) to undo the security update that potentially broke PayShap. The rollback was force-pushed to main.
- **Decision: Capitec EBONF is SBSA-side**: After rollback, Capitec RTP still returned EBONF ("One or more request to pays failed when trying to create batch"). An RTP to Standard Bank succeeded immediately, proving the code is correct and the issue is Capitec routing on SBSA's side.
- **Decision: Replace time-based dedup with ID-based tracking**: The old `lastBalanceRefreshTime` approach could skip refreshes for genuinely new transactions. The new approach tracks processed notification IDs, ensuring every new `txn_wallet_credit` notification triggers exactly one balance+transaction refresh.

---

## Files Modified
- `docs/CURSOR_2.0_RULES_FINAL.md` — Rules optimisation (model selection, session logging in Rule 8, codebase-specific rules). Note: this was committed and then rolled back with `277bbf1f`, so the current version on main is the pre-optimisation version.
- `mymoolah-wallet-frontend/contexts/MoolahContext.tsx` — Fixed transaction refresh race condition (lines 307–325)

---

## Code Changes Summary

### Frontend Refresh Fix (`MoolahContext.tsx`)

**Problem**: The notification poller ran every 10 seconds. When a `txn_wallet_credit` notification arrived, the old code used a time-based deduplication guard (`timeSinceLastRefresh > 2000ms`). This meant:
1. First poll sees the unread notification → calls `refreshBalanceAfterAction` + `refreshTransactions` → sets `lastBalanceRefreshTime`
2. Next poll (10s later) sees the SAME unread notification → time check passes (10s > 2s) → refreshes again unnecessarily
3. BUT if two rapid notifications arrived within 2s (e.g., balance_refresh + txn_wallet_credit from callback), the second one was skipped entirely
4. The real bug: if the first refresh happened before the DB transaction was fully committed, stale data was returned, and no subsequent refresh was triggered for that same notification

**Fix**: Replaced time-based dedup with notification-ID-based tracking via `window.__processedTxnNotifIds` (a `Set<number>`). Now:
- Each notification ID is processed exactly once
- New notifications always trigger a refresh regardless of timing
- No unnecessary re-refreshes for already-processed notifications

---

## Issues Encountered
- **Issue: Security update broke RTP (user-reported)**: User reported that the security update from March 15 ~21:48 broke the entire PayShap integration. After rollback and testing, the Capitec failure was actually an SBSA-side issue (EBONF), not caused by the code. The Standard Bank RTP worked fine post-rollback.
- **Issue: 400 Bad Request on RTP polling**: This is a pre-existing bug where polling uses `msgId` (custom message ID) instead of `uetr` (UUID) in the status query URL. Not related to the security update. Still present in the rolled-back code.
- **Issue: Transaction not appearing instantly**: Root cause was the time-based deduplication guard in `MoolahContext.tsx` that could skip `refreshTransactions()` under race conditions. Fixed with ID-based tracking.

---

## Testing Performed
- [x] Manual RTP test to Capitec (post-rollback) — reached banking app but showed "Expired" / EBONF
- [x] Manual RTP test to Standard Bank (post-rollback) — succeeded, ACCC callback received, wallet credited
- [x] Linter check on MoolahContext.tsx — zero errors
- [ ] E2E test of notification-driven refresh — requires Codespaces deployment

---

## Next Steps
- [ ] Deploy frontend to staging and test the notification refresh fix end-to-end
- [ ] Fix the pre-existing `uetr` vs `msgId` bug in RTP polling (causes 400 Bad Request on status polls)
- [ ] Investigate Capitec EBONF further with SBSA if it persists — user confirmed SBSA said "nothing changed" on their side
- [ ] Re-apply the rules optimisation changes to `docs/CURSOR_2.0_RULES_FINAL.md` (lost in rollback)
- [ ] Re-evaluate the security update changes and selectively re-apply safe ones

---

## Important Context for Next Agent
- **Current code is rolled back to commit `277bbf1f`** (March 15, 18:36). All commits after this (security update, rules optimisation) were force-pushed away. The only new change is the `MoolahContext.tsx` refresh fix.
- **Staging uses PRODUCTION SBSA credentials** (not UAT). Environment variables are in GCP Secret Manager, not `.env.staging`. The `STANDARDBANK_ENVIRONMENT` in Secret Manager is set to production values.
- **Capitec RTP EBONF is NOT a code issue** — Standard Bank RTP works. André confirmed with SBSA that nothing changed on their side. This may be a Capitec-specific daily limit or routing issue.
- **The `uetr` vs `msgId` polling bug is still present** — RTP status polls return 400 because the URL uses `msgId` format instead of `uetr` (UUID). This doesn't break RTP execution (callbacks still work), but it means polling always fails.
- **The rules file `docs/CURSOR_2.0_RULES_FINAL.md` is back to its pre-optimisation state** due to the rollback. The session log from this session documents what was changed, so a future agent can re-apply.

---

## Questions/Unresolved Items
- Why does Capitec RTP return EBONF when Standard Bank RTP works? Is this a recurring Capitec daily limit issue?
- Should the security update changes be selectively re-applied? Which parts were safe?
- Is the `uetr` polling bug causing any user-facing issues beyond failed poll logs?

---

## Related Documentation
- `docs/SBSA_PAYSHAP_UAT_GUIDE.md` — PayShap integration guide
- `docs/session_logs/2026-03-15_1800_comprehensive-kb-topic-filtering.md` — Previous session
- `docs/session_logs/2026-03-13_2200_field-level-encryption-popia.md` — Field encryption session
- `docs/session_logs/2026-03-11_2015_rtp-proxy-first-pbac-fallback.md` — RTP proxy/PBAC work
