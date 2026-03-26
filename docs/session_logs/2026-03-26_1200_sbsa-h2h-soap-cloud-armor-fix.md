# Session Log - 2026-03-26 - SBSA H2H SOAP Cloud Armor Fix & Spec Verification

**Session Date**: 2026-03-26 12:00  
**Agent**: Cursor AI Agent (Claude Opus)  
**User**: Andre  
**Session Duration**: ~2.5 hours

---

## Session Summary

Studied Colette's email + SBSA WSDL/XSD/SDD zip file (7 files). Verified our SOAP handler is 100% aligned with SBSA's Payment Notification SDD V1.3 spec. Discovered and fixed a critical Cloud Armor WAF issue: GCP Cloud Armor was blocking SOAP XML payloads with 403 Forbidden on both staging and production load balancers (OWASP CRS body-scanning rules flagging XML namespaces as XSS/injection). Added path-based ALLOW rules at priority 50 for `/api/v1/standardbank/notification`. SOAP notifications now pass through staging load balancer successfully (HTTP 200 + SOAP Ack confirmed). Updated H2H docs with new SFTP username `mymoolahuser` from Colette. SFTP connectivity to SBSA's TEST server timed out — needs Colette to confirm IP whitelisting.

---

## Tasks Completed
- [x] Studied all 7 files from Colette's zip (2 WSDLs, 3 XSDs, 1 SDD docx, 1 sample message)
- [x] Verified our `sbsaSoapParser.js` is 100% aligned with SBSA SDD V1.3 spec
- [x] Tested SOAP handler on staging Cloud Run directly — HTTP 200 with SOAP Ack
- [x] Identified Cloud Armor WAF blocking SOAP XML (403 Forbidden via load balancer)
- [x] Created `scripts/fix-cloud-armor-soap-exception.sh` — safe path-based exception
- [x] Applied Cloud Armor fix to both `mmtp-waf-staging` and `mmtp-waf-production`
- [x] Confirmed SOAP notification works via staging load balancer after fix (HTTP 200)
- [x] Updated `docs/SBSA_H2H_SETUP_GUIDE.md` with mymoolahuser, Melanie Block, WAF section, Cloud Run URLs
- [x] Deployed production backend (revision 00038-9jh) — SOAP handler now live in production
- [x] Tested production SOAP endpoint via load balancer — HTTP 200 + SOAP Ack confirmed
- [x] Redeployed wallet staging — fixed container start failure, all 4 Cloud Run services green
- [x] Created sample Pain.001 XML file (`docs/samples/MYMOOLAH_OWN11_Pain001v3_ZA_TST_*.xml`)
- [x] Created `scripts/generate-sbsa-test-notification.sh` — SDD V1.3 compliant test script
- [x] Drafted and Andre sent reply to Colette with Pain.001 sample attached
- [ ] SFTP to SBSA TEST server — connection timed out (IP not whitelisted, awaiting Colette)

---

## Key Decisions
- **Cloud Armor exception at priority 50**: Chosen as highest priority (before geo-restriction at 2000, SBSA callback IP allow at 500). Only matches `/api/v1/standardbank/notification` path — does not weaken WAF for any other endpoint.
- **Cloud Armor propagation delay**: Rules take ~2 minutes to propagate across Google's edge network. Initial test immediately after creation still showed 403; test 2 minutes later succeeded.
- **SFTP username is `mymoolahuser`**: Colette confirmed SBSA created this user on their server. Our docs previously referenced `standardbank` — updated.
- **Statements have no test environment**: Colette confirmed MT940/MT942 goes straight to Production. No UAT/staging test files from SBSA.

---

## Files Modified
- `scripts/fix-cloud-armor-soap-exception.sh` — NEW: Cloud Armor path exception script for SOAP XML
- `scripts/generate-sbsa-test-notification.sh` — NEW: SDD V1.3 compliant test XML generator + production tester
- `docs/samples/MYMOOLAH_OWN11_Pain001v3_ZA_TST_20260326120000000.xml` — NEW: sample Pain.001 for SBSA unit testing
- `docs/SBSA_H2H_SETUP_GUIDE.md` — Updated: mymoolahuser username, Melanie Block contact, no test env for statements, Cloud Armor WAF section (11), Cloud Run URLs (12)

---

## Code Changes Summary
- **No application code changes** — the SOAP handler built on Mar 24 is correct and fully aligned with the SBSA spec
- **Infrastructure change**: Cloud Armor WAF rules on both staging and production now allow SOAP XML through on the notification endpoint
- **Documentation**: H2H guide updated with latest info from Colette's email

---

## Issues Encountered
- **Issue 1 — Cloud Armor WAF blocking SOAP XML**: SBSA SOAP credit notifications were being rejected with 403 by Cloud Armor before reaching the backend. The OWASP CRS body-scanning rules (XSS/SQLi detection) flag XML namespaces as injection patterns. Fixed by adding a path-based ALLOW rule at priority 50.
- **Issue 2 — gcloud command error**: `gcloud compute security-policies rules list` is not a valid command. Fixed to use `gcloud compute security-policies describe` instead.
- **Issue 3 — SFTP to SBSA timed out**: Connection to 196.8.85.62:5022 timed out from both Codespaces (US datacenter) and local Mac. SBSA's SFTP firewall likely only allows specific whitelisted IPs.
- **Issue 4 — SFTP Gateway VM SSH blocked**: Cannot SSH into sftp-1-vm because the SFTP Gateway software intercepts port 22. Known issue — requires disk detach/mount approach.
- **Issue 5 — Production not deployed**: The SOAP handler code (built Mar 24) is in staging (20260325_v10) but NOT in the production Cloud Run image. Production needs redeployment.

---

## Testing Performed
- [x] SOAP handler tested on staging Cloud Run directly (bypassing WAF) — HTTP 200 + SOAP Ack
- [x] SOAP handler tested via staging load balancer after Cloud Armor fix — HTTP 200 + SOAP Ack
- [x] Verified SOAP parser alignment against SBSA SDD V1.3 data dictionary (all fields match)
- [x] Production backend deployed (revision mymoolah-backend-production-00038-9jh, 100% traffic)
- [x] Production endpoint test via load balancer — HTTP 200 + SOAP Ack (api-mm.mymoolah.africa)
- [x] Wallet staging redeployed — green, serving correctly
- [x] Sample Pain.001 XML file created and emailed to Colette + Melanie Block
- [x] Test notification script created (`scripts/generate-sbsa-test-notification.sh`) — SDD V1.3 compliant
- [ ] SFTP connectivity to SBSA — pending IP whitelisting
- [ ] End-to-end deposit crediting — pending SBSA sending real test notifications

---

## Next Steps
- [ ] **Andre to reply to Colette**: Confirm SFTP user `mymoolahuser` noted, ask about IP whitelisting for SFTP, ask about notification traffic details
- [ ] **Deploy backend to production**: `./scripts/deploy-backend.sh --production` from Codespaces — needed for SOAP handler to work in production
- [ ] **Test production notification endpoint**: `curl -X POST https://api-mm.mymoolah.africa/api/v1/standardbank/notification -H "Content-Type: text/xml" -d @/tmp/sbsa-test-notification.xml`
- [ ] **SFTP connectivity**: Ask Colette to whitelist `34.35.137.166` on their SFTP firewall, or confirm which IP should connect
- [ ] **Contact Melanie Block**: Once SFTP is confirmed, coordinate unit testing
- [ ] **Fix voucherCode schema drift**: Production vouchers table missing `voucherCode` column (hourly error in logs)
- [ ] **Set up SMTP in production**: Needed for ops alert emails (unallocated deposits, float monitoring)

---

## Important Context for Next Agent
- **Cloud Armor WAF**: Priority 50 ALLOW rules exist on both `mmtp-waf-staging` and `mmtp-waf-production` for `/api/v1/standardbank/notification`. Do NOT remove these or SBSA notifications will be blocked.
- **SFTP username on SBSA's server is `mymoolahuser`** (not `standardbank` or `OWN11`). Updated in H2H guide.
- **Statements go straight to Production** — no test environment from SBSA's side.
- **Production backend needs redeployment** — the SOAP handler code is in staging (20260325_v10) but not in production.
- **SBSA says they've been sending notification traffic** but we found zero evidence in production logs. Likely because (a) production doesn't have the SOAP handler deployed, and/or (b) Cloud Armor was blocking the XML.
- **Cloud Run service names**: `mymoolah-backend-staging`, `mymoolah-backend-production`, `mymoolah-wallet-staging`, `mymoolah-wallet-production` (all in `africa-south1`).
- **SFTP Gateway VM** (`sftp-1-vm`) cannot be accessed via SSH — SFTP software intercepts port 22. Use disk detach/mount approach for config changes.
- **Production logs show `voucherCode` column missing** — schema drift, needs migration.
- **Colette's testing analyst**: Melanie Block — coordinate with her once SFTP connectivity is confirmed.
- **SBSA monthly freeze**: Thu Mar 27 → Apr 8 — any testing must happen before the freeze or after Apr 8.

---

## SBSA Zip File Analysis (for reference)

| File | Key Finding |
|------|------------|
| PaymentNotificationBaseV1_0.wsdl | One-way async (fire & forget), SendTransactionNotificationAsync |
| PaymentNotificationBaseV1_0SoapBinding.wsdl | SOAP 1.1 document/literal, soapAction matches our route |
| PaymentNotificationBaseSRVV1_0.xsd | ReferenceNumber and DebitCreditInd are optional (minOccurs=0) |
| PaymentNotificationIFXV2_2.xsd | Amt is Decimal_Type, AcctTrnId max 36 chars |
| MessageHeadersV2_0.xsd | RqUID is UUID_Type (36-char pattern) |
| PaymentNotification_SampleMessage.dat | Exact match with our test parser — all namespaces and fields align |
| Payment Notification SDD V1-3.docx | Amt ALWAYS in cents (revision 0.4); ReferenceNumber 0-45 chars; fire & forget pattern |

---

## Questions/Unresolved Items
- Has SBSA actually been sending notifications? Colette said "you should have been seeing traffic" — need her to confirm exact URL, IPs, and any error logs from their side
- Which IP should we use to connect to SBSA's SFTP? Our gateway (34.35.137.166) or another?
- Is the `mymoolahuser` SFTP user on SBSA's TEST server or PRODUCTION server (or both)?

---

## Related Documentation
- `docs/SBSA_H2H_SETUP_GUIDE.md` — Updated with Cloud Armor section, mymoolahuser, Cloud Run URLs
- `scripts/fix-cloud-armor-soap-exception.sh` — Cloud Armor fix script
- `docs/session_logs/2026-03-24_0900_sbsa-soap-credit-notification-handler.md` — Previous session: SOAP handler built
- `docs/session_logs/2026-03-23_1730_h2h-statement-pipeline-fix-valr-rmcp-tcib.md` — Previous session: statement pipeline fixed
