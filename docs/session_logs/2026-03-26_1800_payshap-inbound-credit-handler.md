# Session Log - 2026-03-26 - PayShap Inbound Credit Handler

**Session Date**: 2026-03-26 18:00  
**Agent**: Cursor AI Agent  
**User**: André  

---

## Session Summary
Built a dedicated inbound PayShap credit handler to process third-party PayShap deposits to the MyMoolah treasury account — separate from the H2H SOAP notification channel. Added robust MSISDN extraction from references with extra digits (bank prefixes/suffixes), cross-channel idempotency to prevent double-crediting when both PayShap and H2H notify for the same deposit, and a fallback in the existing RPP callback handler for unmatched inbound credits. Also fixed the prior analysis that incorrectly assumed all deposit notifications come via H2H — André confirmed the PayShap team at Standard Bank is completely separate from the H2H team.

---

## Tasks Completed
- [x] Enhanced MSISDN extraction — `extractMsisdnFromReference()` function with sliding window to find valid SA mobile numbers within padded references
- [x] Added Phase 1.5 to `resolveReference()` — between exact match and float lookup, tries extracted MSISDN candidates
- [x] Built `handlePayshapInboundCredit()` controller handler with flexible field extraction for multiple payload formats
- [x] Added `POST /api/v1/standardbank/payshap/inbound-credit` route (auth: x-GroupHeader-Hash or X-Signature)
- [x] Modified `processRppCallback()` to detect unmatched ACCC/ACSP callbacks and route as inbound PayShap credits
- [x] Added cross-channel idempotency in `processDepositNotification()` — detects same ref+amount processed within 90s via different channel
- [x] Updated `docs/SBSA_PAYSHAP_UAT_GUIDE.md` with new endpoint documentation
- [x] Drafted email to Gustaf (SBSA PayShap team) requesting callback URL, payload format, and auth details

---

## Key Decisions
- **Separate endpoint for PayShap inbound**: Created `/payshap/inbound-credit` rather than overloading the H2H `/notification` endpoint. This reflects the architectural separation between SBSA's PayShap team and H2H team.
- **Flexible field extraction**: Handler accepts multiple possible payload field names (ISO 20022 camelCase, SBSA-specific, standard JSON) since exact payload format is TBC with Gustaf.
- **Dual auth support**: Handler accepts both `x-GroupHeader-Hash` (PayShap standard) and `X-Signature` (HMAC-SHA256) since we don't yet know which auth method the PayShap inbound notifications use.
- **RPP fallback routing**: Modified existing `processRppCallback()` so that if an RPP callback arrives with ACCC/ACSP but no matching MM-initiated transaction, it's routed to `processDepositNotification()` as an inbound credit. This catches scenarios where SBSA sends inbound credits to existing callback URLs.
- **Cross-channel idempotency window**: 90 seconds — conservative enough to catch PayShap+SOAP duplicate notifications while allowing legitimate rapid repeat deposits.
- **9-digit extraction limit**: The 9-digit MSISDN extraction (without leading zero) is only attempted when total digits ≤ 12, to avoid false positives in very long numeric references.

---

## Files Modified
- `services/standardbankDepositNotificationService.js` — Added `extractMsisdnFromReference()`, Phase 1.5 in `resolveReference()`, cross-channel idempotency check, exported new function
- `controllers/standardbankController.js` — Added `handlePayshapInboundCredit()` handler, modified `processRppCallback()` fallback, exported new handler
- `routes/standardbank.js` — Added `POST /payshap/inbound-credit` route
- `docs/SBSA_PAYSHAP_UAT_GUIDE.md` — Updated API endpoints table and added PayShap Inbound Credit section

---

## Code Changes Summary
- **`extractMsisdnFromReference(ref, alreadyTried)`**: Sliding window scanner that finds valid SA mobile numbers (10-digit local, 11-digit international, 9-digit without leading zero) within a reference that may have extra bank-added digits
- **Phase 1.5 in `resolveReference()`**: Between exact MSISDN (Phase 1) and float lookup (Phase 2), tries extracted candidates from padded references
- **`handlePayshapInboundCredit()`**: Dedicated endpoint for inbound PayShap credits with flexible JSON field extraction, dual auth (GroupHeader-Hash or X-Signature), routes to `processDepositNotification()` with `PAYSHAP-IN-` prefix
- **RPP callback fallback**: `processRppCallback()` now detects unmatched ACCC/ACSP callbacks and routes them as inbound PayShap credits instead of silently dropping them
- **Cross-channel idempotency**: New check in `processDepositNotification()` that detects if same reference+amount was processed within 90 seconds via a different channel (prevents double-crediting when both PayShap and H2H SOAP notify for the same deposit)

---

## Issues Encountered
- **Architectural misunderstanding**: Initial analysis assumed all deposit notifications come through the H2H SOAP channel. André corrected this — the PayShap team at SBSA is completely separate from the H2H team (Colette), and PayShap has its own real-time notification system for all PayShap transactions (including inbound credits from third parties).

---

## Testing Performed
- [x] Linter check — zero errors on all modified files
- [ ] Integration testing — requires SBSA PayShap team to send test inbound credit notification (pending Gustaf's response)
- [ ] Cross-channel idempotency testing — requires both PayShap and H2H to notify for the same deposit

---

## Next Steps
- [ ] **André**: Send email to Gustaf requesting: callback URL, payload format, auth method, and PayShap proxy registration API
- [ ] **André**: Deploy to staging and production after Gustaf confirms details
- [ ] **Gustaf/SBSA**: Confirm which callback URL inbound PayShap credits are sent to
- [ ] **Gustaf/SBSA**: Provide sample payload for inbound PayShap credit notification
- [ ] **Gustaf/SBSA**: Clarify PayShap proxy registration — do we need to register user MSISDNs as proxies?
- [ ] Refine `handlePayshapInboundCredit()` field extraction once exact payload format is confirmed

---

## Important Context for Next Agent
- The PayShap team at SBSA (Gustaf) is **completely separate** from the H2H team (Colette). Do not assume PayShap notifications come through the H2H SOAP channel.
- The `handlePayshapInboundCredit()` handler has flexible field extraction to accommodate multiple possible payload formats. Once Gustaf confirms the exact format, this can be tightened.
- The RPP callback fallback (`processRppCallback()` → `processDepositNotification()`) is a safety net — it catches inbound credits even if SBSA sends them to existing callback URLs instead of the dedicated endpoint.
- Cross-channel idempotency uses a 90-second window. If this proves too short or too long, adjust the `crossChannelCutoff` value in `processDepositNotification()`.
- PayShap proxy registration for user MSISDNs may be required for third-party PayShap deposits to work. This is a question for Gustaf.

---

## Questions/Unresolved Items
- Which callback URL does SBSA PayShap use for inbound credit notifications?
- What is the exact JSON payload format for inbound PayShap credits?
- Does SBSA use `x-GroupHeader-Hash` or a different auth method for inbound credit notifications?
- Do we need to register MyMoolah users' MSISDNs as PayShap proxies? If so, is there a bulk registration API?
- The `x-GroupHeader-Hash` algorithm is still unconfirmed (soft_fail in current code) — pending Gustaf's response on exact HMAC spec

---

## Related Documentation
- `docs/SBSA_PAYSHAP_UAT_GUIDE.md` — Updated with new endpoint
- `docs/SBSA_H2H_SETUP_GUIDE.md` — H2H SOAP notification (separate channel)
- Session: `docs/session_logs/2026-03-26_1200_sbsa-h2h-soap-cloud-armor-fix.md`
- Session: `docs/session_logs/2026-03-25_1100_payshap-rtp-fixes-pasa-tppp-withdrawal.md`
