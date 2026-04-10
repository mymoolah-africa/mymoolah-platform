# Session Log - 2026-04-10 - EasyPay V5 Finalisation Plan

**Session Date**: 2026-04-10 14:00  
**Agent**: Cursor AI Agent (Claude)  
**User**: Andre  
**Session Duration**: ~45 minutes

---

## Session Summary

Post-EasyPay meeting planning session. Andre confirmed meeting outcomes: V5 is the only cash-in route (legacy routes to be removed), cash handling fee is variable per-merchant (comes in SFTP recon file, not in V5 payload), MMTP absorbs the handling cost as cost of revenue. Created comprehensive implementation plan (`docs/EASYPAY_V5_FINALISATION_PLAN.md`) covering 6 tasks for the next agent: new CoA account, fee model correction, legacy route removal, test PIN generation, SFTP credential delivery, and documentation sweep. Performed full sweep of `EasypayReceiverV5.yaml` and Postman collection to ensure all V5 payload fields and response schemas are accurately captured.

---

## Tasks Completed
- [x] Full sweep of `EasypayReceiverV5.yaml` OpenAPI spec — all schemas, fields, response codes documented
- [x] Full sweep of `EasyPay BillPayment Receiver API.postman_collection.json` — all 3 endpoints with request/response examples verified
- [x] CoA analysis — recommended `5000-10-02` (Cost of Sales: EasyPay Cash Handling Fee) as best banking practice
- [x] Created `docs/EASYPAY_V5_FINALISATION_PLAN.md` — comprehensive 6-task implementation brief for next agent
- [x] Documented V5 payload reference, JE pattern (2 realtime + 1 batch + 1 settlement), risk register, files map

---

## Key Decisions

- **New CoA account `5000-10-02`**: Cash handling fee is a direct cost of deposit service, not operating expense. Placed alongside `5000-10-01` (PayShap SBSA Fee) — same concept (variable third-party cost absorbed by MMTP). Andre agreed this is best banking practice.
- **Cash handling % is variable, NOT a fixed percentage**: Depends on merchant's acquiring bank/payment method. Will arrive in daily SFTP recon file. MMTP cannot calculate it at paymentNotification time.
- **User fee is flat R5.50 + VAT = R6.33**: No handling component charged to user. MMTP absorbs handling cost against revenue.
- **3-JE model at payment + 1 at recon + 1 at settlement**: JE1+JE2 at paymentNotification (gross deposit + user fee), JE3 batch from SFTP (cash handling cost), JE4 at T+2 bank settlement.
- **Legacy settlement routes to be removed**: `/api/v1/vouchers/easypay/topup/settlement` and `/api/v1/vouchers/easypay/settlement` — never used by EasyPay's switch; built on MMTP assumptions.

---

## Files Modified
- `docs/EASYPAY_V5_FINALISATION_PLAN.md` — **NEW** — comprehensive implementation plan for next agent

---

## Code Changes Summary
No code changes in this session — planning only. All implementation deferred to next agent per the plan document.

---

## Issues Encountered
- **No sandbox JSON files found**: The Postman collection has placeholder `<string>` values, not realistic test data. The plan accounts for this by defining the test data generation script.
- **V5 spec AccountNumber length discrepancy**: EasyPay examples show 13-digit AccountNumber, our PINs use 8-digit accounts. Documented in risk register; defensive parsing recommended.

---

## Testing Performed
- No testing — planning session only

---

## Next Steps
- [ ] **Next agent Task 1**: Create migration for `5000-10-02` ledger account
- [ ] **Next agent Task 2**: Update `easyPayDepositService.js` fee model (remove handling %, add batch JE function)
- [ ] **Next agent Task 3**: Remove legacy settlement routes from `routes/vouchers.js` and `controllers/voucherController.js`
- [ ] **Next agent Task 4**: Generate 50 test EasyPay PINs using script
- [ ] **Next agent Task 5**: Draft SFTP credentials email for EasyPay
- [ ] **Next agent Task 6**: Documentation sweep (CoA, Integration Guide, Checklist, Changelog, Handover)
- [ ] **Andre action**: Ask EasyPay for sample daily recon file (columns, format, timezone)
- [ ] **Andre action**: Ask EasyPay for their egress IP CIDRs for firewall allowlisting

---

## Important Context for Next Agent
- **Read `docs/EASYPAY_V5_FINALISATION_PLAN.md` FIRST** — it is the canonical implementation brief with exact file paths, JE patterns, and execution order
- V5 `Amount` field is **gross cents** — the handling cost is NOT in the payload and NOT known until SFTP recon
- `PaymentResponse` only requires `{ EchoData }` — receiver cannot decline a valid paymentNotification
- The Postman collection at `integrations/easypay/EasyPay BillPayment Receiver API.postman_collection.json` uses `{{baseUrl}}` and `{{apiKey}}` variables — set these when configuring EP's testing environment
- The PIN is 14 digits: `9` + `5063` (receiver ID) + 8-digit account + Luhn check digit. EasyPay's spec examples show longer PINs — that's fine, receiver defines length
- Cash handling cost JE (`5000-10-02`) can only be posted after SFTP recon file is parsed — build this as a batch job, not inline

---

## Questions/Unresolved Items
- EasyPay sample SFTP recon file — format/columns unknown (Andre to request)
- EasyPay egress IPs — needed for firewall allowlisting (Andre to request)
- Min/max deposit amounts — currently using Bill amounts as min/max; may need to support flexible amounts (EP to confirm)

---

## Related Documentation
- `docs/EASYPAY_V5_FINALISATION_PLAN.md` — implementation brief
- `docs/integrations/EasyPay_V5_PARTNER_QA_CHECKLIST.md` — meeting Q&A
- `docs/integrations/EasyPay_API_Integration_Guide.md` — partner integration guide
- `docs/CHART_OF_ACCOUNTS.md` — CoA with EasyPay section 3.1
- `integrations/easypay/EasypayReceiverV5.yaml` — official V5 OpenAPI spec
- `integrations/easypay/EasyPay BillPayment Receiver API.postman_collection.json` — Postman collection
