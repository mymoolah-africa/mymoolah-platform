# Session Log - 2026-05-07 - OTT Staging Payout Validation

**Session Date**: 2026-05-07 11:33 SAST  
**Agent**: Cursor AI Agent  
**User**: André  
**Session Duration**: Controlled staging payout validation

---

## Session Summary
Ran André-approved controlled staging wallet-debit tests for OTT ABSA CashSend and Nedbank Cardless Withdrawal using wallet user `0825571055`. ABSA completed successfully and posted a balanced ledger journal; Nedbank was rejected by OTT because the provider is not authorised on the MyMoolah account, and MMTP safely reversed/refunded the full debit.

---

## Tasks Completed
- [x] Located staging user `+278****1055` after exact `0825571055` lookup did not match the stored E.164 phone format.
- [x] Confirmed the staging user was verified but had missing `idType`.
- [x] With André's approval, set only this staging user's missing `idType` to `south_african_id`.
- [x] Submitted ABSA CashSend provider `112` for R50.00 cash amount plus R13.00 transaction fee.
- [x] Submitted Nedbank Cardless Withdrawal provider `10` for R50.00 cash amount plus R13.00 transaction fee.
- [x] Polled and verified final ABSA payout state.
- [x] Audited recent payout rows, wallet state, transactions, and journal balance after both tests.
- [x] Updated changelog, handover, OTT framework docs, and tech debt with the validation evidence.

---

## Key Decisions
- **Do not bypass verified-recipient checks**: The test was paused when `idType` was missing rather than calling the service with invented recipient data.
- **Staging-only profile correction approved**: André explicitly approved setting the missing `idType` for the staging test user to `south_african_id`.
- **Nedbank is partner-enable blocked**: MMTP terms and reversal logic are ready, but OTT must enable provider `10` on the MyMoolah account before another controlled test.

---

## Files Modified
- `docs/session_logs/2026-05-07_1133_ott-staging-payout-validation.md` - New session log with controlled staging test evidence.
- `docs/AGENT_HANDOVER.md` - Updated latest status and session-log pointer.
- `docs/CHANGELOG.md` - Added controlled staging payout validation entry.
- `docs/CURSOR_2.0_RULES_FINAL.md` - Updated tech debt from missing Nedbank terms to partner account enablement blocker.
- `docs/integrations/OTT_MOBILE_INTEGRATION_FRAMEWORK.md` - Documented the Nedbank provider-authorisation blocker.

---

## Code Changes Summary
No runtime code was changed in this session. Staging data changes were limited to the approved `users.idType` correction and the real staging payout attempts created by the OTT payout flow.

---

## Issues Encountered
- **Exact phone lookup failed**: The staging user is stored as `+27825571055`, not `0825571055`.
- **Verified profile incomplete**: The user was verified but missing `idType`; fixed only after André approved the staging profile correction.
- **Nedbank provider not authorised**: OTT rejected provider `10` with `Provider is not authorised on this account :MyMoolah (Pty) Ltd`. MMTP reversed the R50.00 withdrawal and R13.00 fee, then refunded R63.00.

---

## Testing Performed
- [x] Manual controlled ABSA staging payout submit.
- [x] Manual controlled Nedbank staging payout submit.
- [x] Manual ABSA status poll.
- [x] Read-only DB verification of payout rows, wallet state, transactions, and journal balance.
- [x] Test results: partial pass.

Results:
- ABSA payout `OTT-1778146534980-f2ff7a1e`: `completed`, OTT payment reference `118386`, R50.00 amount, R13.00 fee, R63.00 total debit.
- ABSA journal `OTT-PAYOUT-OTT-1778146534980-f2ff7a1e`: R63.00 debit and R63.00 credit.
- Nedbank payout `OTT-1778146545512-0600df80`: `reversed`, rejected by OTT account authorisation, full R63.00 refund transaction created as `OTT-REV-OTT-1778146545512-0600df80`.
- Staging wallet `WAL-1`: balance R53,357.70, restricted balance R0.00 after ABSA completion and Nedbank reversal/refund.

Customer/partner-side evidence supplied by André after the run:
- ABSA sent the customer payout notification for R50.00 with reference `MM-OTT-1778146534980-f2ff7a1e`.
- Absa sent the customer CashSend PIN SMS for `OTT_CashSend_118386`; PIN value is intentionally not recorded in this log.
- OTT sent a payout-failure email for Nedbank reference `MM-OTT-1778146545512-0600df80` with the same authorisation error captured in MMTP: `Provider is not authorised on this account :MyMoolah (Pty) Ltd`.

---

## Next Steps
- [ ] Ask OTT to enable Nedbank Cardless Withdrawal provider `10` for the MyMoolah account.
- [ ] After OTT confirms enablement, rerun exactly one controlled staging Nedbank R50.00 + R13.00 fee test.
- [ ] Keep Standard Bank hidden until Standard Bank approval is received and documented.
- [ ] Do not run production payout submits until André approves a controlled production window.

---

## Important Context for Next Agent
- ABSA staging payout integration is functionally validated end-to-end through submit, poll, wallet debit, and balanced ledger journal.
- Nedbank failed at the partner-account-authorisation layer, not because of MMTP fee terms or reversal handling.
- The failed Nedbank attempt proved MMTP's safe reversal/refund path for partner rejection after wallet debit.
- The staging-only `idType` correction was approved by André and should not be copied blindly to other environments.

---

## Questions/Unresolved Items
- When will OTT enable Nedbank Cardless Withdrawal for the MyMoolah account?
- Should the wallet keep Nedbank hidden until a fresh controlled staging success, or display it disabled with partner-enable pending copy during internal testing only?

---

## Related Documentation
- `docs/integrations/OTT_MOBILE_INTEGRATION_FRAMEWORK.md`
- `docs/CHANGELOG.md`
- `docs/AGENT_HANDOVER.md`
- `docs/CURSOR_2.0_RULES_FINAL.md`
