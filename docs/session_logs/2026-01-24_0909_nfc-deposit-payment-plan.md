# Session Log - 2026-01-24 - NFC Deposit/Payment Implementation Plan

**Session Date**: 2026-01-24 09:09  
**Agent**: Cursor AI Agent  
**User**: André  
**Session Duration**: ~20 minutes

---

## Session Summary
Drafted a banking-grade implementation plan for NFC deposits (SoftPOS inbound) and NFC payments (tokenized virtual card outbound) with Standard Bank T-PPP. The plan enforces MPoC/CPoC compliance, mandates native kernels (Android) and Tap to Pay on iPhone, and uses push provisioning to Apple/Google wallets for outbound payments. No code changes executed—plan documented for later execution.

---

## Tasks Completed
- [x] Authored end-to-end NFC plan covering SoftPOS deposits and tokenized outbound payments
- [x] Defined compliance, security, risk, and attestation requirements (MPoC/CPoC, PCI scope minimization)
- [x] Outlined data models, services, APIs, and rollout/testing strategy
- [ ] Began implementation or migrations (pending)
- [ ] Certification and issuer/acquirer onboarding (pending)

---

## Key Decisions
- **Certified kernel required**: Browser/Web NFC is non-compliant; use certified EMV L2/MPoC kernel on Android and Tap to Pay on iPhone for inbound deposits.
- **Tokenized outbound payments**: Issue virtual card via T-PPP, push-provision to Apple Pay/Google Wallet; no raw PAN/CVV storage anywhere in MyMoolah.
- **Strict ledger alignment**: Map all NFC events to existing double-entry patterns with idempotency keys; no parallel balance logic.
- **Secure webhooks**: All callbacks use mTLS/HMAC + idempotency; store audit trails for auth/settlement decisions.

---

## Files Modified
- `.cursor/plans/nfc-tppp-implementation_d579e17c.plan.md` - New implementation plan capturing architecture, services, compliance, testing, and ops for NFC deposits/payments. (Planning only; no app code changes.)

---

## Code Changes Summary
- Planning only. No application code or schema changes performed in this session.

---

## Issues Encountered
- None. This was a planning session.

---

## Testing Performed
- [ ] Unit tests written/updated
- [ ] Integration tests run
- [ ] Manual testing performed
- [ ] Test results: N/A (planning only)

---

## Next Steps
- [ ] Secure T-PPP issuing/acquiring agreements and Apple/Google wallet issuer entitlements.
- [ ] Add models/migrations for `VirtualCard`, `SoftPosDevice`, auth/callback logs, and new txn enums.
- [ ] Implement backend services: `NFCDepositService`, `VirtualCardService`, `CardAuthService`, provisioning controller, risk hooks.
- [ ] Build native bridges: Android MPoC terminal app and iOS Tap to Pay wrapper with deep links from PWA/TWA.
- [ ] Define and secure NFC webhooks (mTLS/HMAC, idempotency, attestation checks); add observability and runbooks.
- [ ] Run unit/integration/load tests and complete MPoC/CPoC + Apple/Google + Standard Bank UAT certifications.

---

## Important Context for Next Agent
- Full plan stored at `.cursor/plans/nfc-tppp-implementation_d579e17c.plan.md`; execute when cleared.
- Inbound deposits must use certified SoftPOS kernel (Android) or Tap to Pay on iPhone; no browser NFC.
- Outbound payments must use tokenized virtual card push provisioning; MyMoolah stores only tokens (no PAN/CVV).
- All ledger effects must follow existing double-entry patterns with idempotent keys and audit logs.

---

## Questions/Unresolved Items
- Awaiting Standard Bank T-PPP sandbox credentials/specs for issuing and acquiring webhooks.
- Confirm device attestation requirements/SDK versions from chosen SoftPOS kernel vendor (e.g., Halo Dot).
- Timeline for Apple/Google issuer entitlements and store deployment constraints.

---

## Related Documentation
- `.cursor/plans/nfc-tppp-implementation_d579e17c.plan.md`
- `docs/AGENT_HANDOVER.md`
