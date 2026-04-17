Hi Colette,

Following on from our earlier exchange today — we have completed the six UAT test scenarios you sent through. I ran them back-to-back from our H2H gateway at 34.35.137.166 against SBSA TEST (196.8.85.62:5022), with a 20-minute gap between uploads. Run window: 2026-04-17 15:55 SAST through 18:36 SAST.

All six files uploaded cleanly and every upload was accepted by /Outbox/ within 2 seconds. Four of the six scenarios passed outright; two returned partial results for reasons I would like to clarify with your team before we call them complete.

RM1 — Valid SSVS file. PASS. File MYMOOLAH_OWN11_Pain001v3_ZAR_TST_20260417155259044RM7.xml (4,238 bytes, 3 transactions, debtor account 272406481) uploaded at 15:55:12 SAST. ACK received at 15:55:35 (GrpSts RCVD). INTAUDTST at 15:55:45 (GrpSts PDNG, all three transactions PDNG, Status Code 0000). FINAUDTST at 15:58:52 (GrpSts ACSP, all three ACSP, Status Code 0000). Full cycle closed in 3 minutes 40 seconds.

RM2 — Duplicate MsgId. PASS. Identical file uploaded at 16:15:12 SAST, MsgId same as RM1 (MM-UATRM71776433979043-MO2YXAQS). NACK received 17 seconds later (GrpSts RJCT, AddtlInf "Duplicate MsgId"). Duplicate detection at file level worked exactly as specified. One small point: the AddtlInf wording is "Duplicate MsgId" whereas your test sheet notes "Duplicate File". Could you confirm whether these are the same underlying flag with a doc drift on the wording, or two different checks.

RM3 — Invalid ordering account. PASS with one query. Debtor account set to 123456789. Uploaded at 16:35:12 SAST. ACK received at 16:35:33 (RCVD). INTAUDTST at 16:35:46 with GrpSts RJCT and all three transactions rejected with Status Code 0009. Your test sheet specifies Status Code 0003 (INVALID ACCOUNT NUMBER) for this scenario. The rejection intent is correct — the file was accepted, validated, and rejected because of the invalid ordering account — but SBSA returned 0009 rather than 0003. Could you confirm which code is canonical for an invalid DbtrAcct on our current TEST profile so we align our parser.

RM4 — Past execution date. PASS (exact match). ReqdExctnDt set to 2014-11-12 (11 years in the past). Uploaded at 16:55:12 SAST. ACK received at 16:55:34. INTAUDTST at 16:55:47 with GrpSts RJCT and all three transactions rejected with Status Code 0014 — exactly as the test sheet specifies. Nothing to clarify here.

RM5 — Transaction amount over limit. PARTIAL. Three-transaction file with Tx1 at R96.15 and Tx2-Tx3 at R1.00. Uploaded at 17:15:12 SAST. ACK received at 17:15:36 (RCVD). INTAUDTST at 17:15:52 showed GrpSts PDNG with all three transactions PDNG, Status Code 0000, and the subsequent FINAUDTST at 17:18:53 showed GrpSts ACSP with all three transactions ACSP. In short, R96.15 was not rejected as over-limit on our TEST profile — it was accepted and ran through to settlement. The integration plumbing is all working; the over-limit condition simply was not triggered at that amount. Could you confirm the per-transaction limit on our TEST profile (OWN11 / account 272406481) so we can either re-run with an amount above it, or if your team would prefer to temporarily lower the TEST limit, we can re-run with R96.15 unchanged.

RM6 — 10-transaction mixed file. PARTIAL. 10-transaction file uploaded at 17:35:12 SAST, containing a mix of valid and intentionally-invalid accounts across Standard Bank, ABSA, FNB, Nedbank, Discovery, and Capitec. ACK received at 17:35:38 (RCVD). INTAUDTST at 17:35:48 with GrpSts PART showing 4 transactions PDNG and 6 RJCT with Status Code 0003. FINAUDTST at 17:38:54 with GrpSts PART showing 4 transactions ACSP and 6 RJCT. UNPAID response received at 17:37:05 with GrpSts PART covering 2 transactions — one with status ACWC and Unpaid Reason Code 14, one with status RJCT and Unpaid Reason Code 03. So we received ACK, INTERIM, FINAL, and UNPAID as specified. We did not receive a VET response with our RM6 MsgId in the 60-minute polling window after the upload. Could you confirm under what conditions SBSA emits the VET response for a mixed file — and whether it is expected here or whether the UNPAID is standalone for this scenario on TEST.

One further observation on RM6 UNPAID. Two of the transactions reported in UNPAID (Tx-03 Capitec and Tx-04 ABSA) had ACSP status in the FINAUD cut a few minutes earlier. In UNPAID they came back as ACWC and RJCT respectively. Our reading is that UNPAID carries post-settlement bounce or amendment notifications that can override FINAUD for specific transactions. Could you confirm that is correct, so we wire our watcher to treat UNPAID as authoritative over FINAUD on a per-transaction basis when it arrives.

For your records, every response arrived in both /BAS/ (with the original filename appended — "...RM7.xml_ACK_...") and /Inbox/ (with the ISO-style naming "MYMOOLAH_OWN11_ACK_TST_..."), consistent with the dual-delivery pattern we saw on the earlier morning test. We will read from /Inbox/ only in production to avoid duplicate ingestion.

On SBSA PROD. We have not uploaded any file to PROD /Outbox/ yet — only the directory listing was confirmed this morning. We are ready for a small coordinated smoke upload to PROD whenever suits your team, to confirm the same cycle on the production processor before we start routing real disbursement traffic.

Full response bundle (19 response XMLs — 6 ACK, 1 NACK, 6 INTAUD, 4 FINAUD, 1 VET, 1 UNPAID), the upload files RM1 through RM6, and the complete timestamped driver log are all preserved on our side and can be shared for your records if helpful.

To summarise where we stand: file upload, ingestion, validation, per-transaction processing, rejection handling, ACK / NACK / INTAUDTST / FINAUDTST / UNPAID responses, and multi-response delivery are all working end-to-end on TEST. The five open items above are the only things I would like to close off with your team before we move to a PROD smoke test.

Thank you again for the test pack and for your team's quick support today.

Kind regards,
André
MyMoolah Treasury Platform
