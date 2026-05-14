# Session Log - 2026-05-14 - EasyPay Channel Correction KB

**Session Date**: 2026-05-14 14:35 SAST  
**Agent**: Cursor AI Agent  
**User**: André  
**Session Duration**: Focused EasyPay KB correction and three-environment embedding

---

## Session Summary
Applied Razeen Abrahams' correction that MyMoolah's EasyPay Receiver ID is not active on excluded eCommerce / non-in-person channels because of fraud risk. Updated the FAQ source and refreshed UAT, Staging, and Production AI support KB rows and embeddings.

---

## Tasks Completed
- [x] Reviewed the current EasyPay FAQ wording and KB pipeline commands.
- [x] Corrected `docs/FAQ_MASTER.md` EasyPay cash-in channel guidance.
- [x] Refreshed and embedded UAT KB.
- [x] Refreshed and embedded Staging KB.
- [x] Refreshed and embedded Production KB.
- [x] Verified the corrected EasyPay question in all three DBs.
- [x] Updated changelog and handover.

---

## Key Decisions
- **Fraud-risk exclusions reflected**: The FAQ now explicitly excludes Plusmore, Vodacom-related channels/wallets such as VodaPay, WalletDoc, Prepaid24, EFTCorp / Ukheshe, banking-app bill-payment routes such as Nedbank app flows, and Clicks website/app payments.
- **Direct banks narrowed**: Only Absa, Tyme Bank, Capitec, and Old Mutual Bank are named as direct bank integrations not prevented by EasyPay, subject to onboarding and channel availability.
- **In-person-first wording**: Customer guidance now emphasizes paying at participating in-person tills/kiosks unless an approved bank channel shows the option.

---

## Files Modified
- `docs/FAQ_MASTER.md` - Corrected EasyPay cash-in channel wording.
- `docs/CHANGELOG.md` - Added correction and three-environment KB results.
- `docs/AGENT_HANDOVER.md` - Updated latest status.
- `docs/session_logs/2026-05-14_1435_easypay-channel-correction-kb.md` - This session log.

---

## Code Changes Summary
No application code, schema, migrations, ledger logic, or production service configuration changed in this correction. Database writes were limited to the approved support KB refresh in UAT, Staging, and Production.

---

## Issues Encountered
- **Staging proxy reset**: First Staging generation attempt failed with `read ECONNRESET` before DB write; restarted proxy on port `6544`, probed the DB, and reran successfully.
- **Production proxy reset**: First Production generation attempt failed with `read ECONNRESET` before DB write; restarted proxy on port `6545`, probed the DB, and reran successfully.
- **Readback reset**: Initial cross-environment verification query hit `read ECONNRESET`; restarted all three local proxies and reran verification successfully.

---

## Testing Performed
- [x] KB freshness guard.
- [x] UAT FAQ row update / activation / embedding.
- [x] Staging FAQ row update / embedding.
- [x] Production FAQ row update / embedding.
- [x] Readback verification in all three environments.
- [x] Test results: pass.

Commands/results:
- `npm run check:kb:fresh` - passed.
- UAT: `npm run generate:kb:faq:update` updated 133 rows; `npm run activate:kb` found all generated rows active; `npm run embed:kb` embedded 337 active rows, 0 failures.
- Staging: after proxy restart, `npm run generate:kb:faq:update:staging` inserted 4 rows and updated 129; `npm run embed:kb:staging` embedded 301 active rows, 0 failures.
- Production: after proxy restart, `npm run generate:kb:faq:update:production` inserted 4 rows and updated 129; `npm run embed:kb:production` embedded 301 active rows, 0 failures.
- DB readback: UAT, Staging, and Production row for `Where can I add money to my MyMoolah wallet with EasyPay?` is active, embedded, includes exclusion wording, and names the confirmed direct banks.

---

## Next Steps
- [ ] André can ask support bot in each environment about EasyPay cash-in channels and verify it no longer recommends excluded eCommerce / app channels.
- [ ] Wait for EasyPay's response on daily SFTP file upload timing and 7/365 cadence before scheduler activation decisions.

---

## Important Context for Next Agent
- Do not reintroduce Plusmore, VodaPay/Vodacom channels, WalletDoc, Prepaid24, EFTCorp/Ukheshe, Nedbank app flows, or Clicks web/app as available MyMoolah EasyPay cash-in options.
- Direct bank channels currently named for MyMoolah's Receiver ID are Absa, Tyme Bank, Capitec, and Old Mutual Bank, subject to onboarding.
- This correction was pushed into all three KB databases already.

---

## Questions/Unresolved Items
- EasyPay has not yet confirmed daily file upload time or whether uploads happen 7/365.

---

## Related Documentation
- `docs/FAQ_MASTER.md`
- `docs/CHANGELOG.md`
- `docs/AGENT_HANDOVER.md`
- `docs/session_logs/2026-05-14_1336_easypay-retailer-kb-uat.md`
