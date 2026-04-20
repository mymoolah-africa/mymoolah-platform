Hi Colette,

Thank you for the detailed responses on Friday. I re-ran Scenario 5 this morning as you suggested, and wanted to share the results straight away together with one profile-related point that I'd like your view on before we close out the UAT.

The re-run file was uploaded at 10:47:04 SAST to /Outbox/ on TEST (196.8.85.62:5022, user mymoolahuser). It is a three-transaction file with Tx1 at R500,001.00 (intentionally R1 over the per-tx limit you quoted) and Tx2 and Tx3 at R1.00 each — so the batch total is R500,003.00. Debtor account 272406481, ReqdExctnDt 2026-04-21, MsgId MM-UATRM5v21776672704334-MO6X20CU, filename MYMOOLAH_OWN11_Pain001v3_ZAR_TST_20260420101144335RM5v2.xml.

ACK came back at 10:47:22 (+18 seconds), GrpSts RCVD — clean.

INTAUDTST came back at 10:47:29 (+25 seconds). GrpSts RJCT (not PART), Status Code 0009, Status Description "RUN EXCEEDS LIMIT". All three transactions were reported individually as TxSts RJCT with the same 0009 / "RUN EXCEEDS LIMIT".

FINAUDTST was not received. We polled the /Inbox/ and /BAS/ directories every 60 seconds for 45 minutes. This is consistent with what we observed on RM9 and RM10 in the 2026-04-17 UAT — whenever INTAUD returns GrpSts RJCT, SBSA appears to not emit FINAUD at all. Could you confirm that is by design, so we can bake it into our pain.002 poller as an expected terminal state.

The result is internally consistent but it does not exercise the per-transaction over-limit path (code 0006). The reason is profile-related: with both Cr Transaction Limit and Sub Batch Limit set to R500,000, any file containing a single transaction above R500,000 will automatically exceed the sub-batch limit as well, so the batch-level check fires first and the whole file is rejected on code 0009 "RUN EXCEEDS LIMIT" before the per-tx (0006) check is reached. In other words, it's arithmetically impossible to build a test Pain.001 that triggers 0006 before 0009 while both limits are equal.

There are two ways to actually demonstrate the 0006 per-tx path on TEST, and either would work for us:

• Option A — lower the Cr Transaction Limit on our TEST profile (OWN11 / 272406481) below the Sub Batch Limit, for example per-tx R100,000 and batch R500,000. We can then re-run with a file of, say, R100,001 + R1 + R1 (total R100,003), which trips the per-tx limit on Tx1 while leaving the batch well under the sub-batch limit, and should return GrpSts PART with Tx1 code 0006 and Tx2-Tx3 proceeding to ACSP at FINAUD.

• Option B — leave the profile as-is and accept that on TEST (and on production if the same profile applies) any submission over R500,000 will be rejected at file level with 0009 "RUN EXCEEDS LIMIT" rather than at transaction level with 0006. This is arguably the safer operational behaviour, but it means we won't see 0006 in UAT at all, and we'd prefer to have observed both codes before go-live so our parser is proven against real samples.

A small separate point on status code mapping. Status Code 0009 is now confirmed to carry two quite different meanings on the same profile — in RM9 (2026-04-17) it was returned for "invalid ordering account" with a different AddtlInf description, and in RM5v2 today it was returned for "RUN EXCEEDS LIMIT". Our reading is that 0009 is a generic "file cannot proceed" code and the AddtlInf Status Description is the authoritative differentiator of the root cause. Could you confirm, so we wire our poller to key off the description rather than the numeric code.

To close the remaining open items from Friday: everything else in your reply is clear and will be implemented on our side. Specifically we will (a) treat 0009 as the canonical code for invalid ordering account (parsing the description as well), (b) treat UNPAID as authoritative over FINAUD on a per-transaction basis, and (c) read from /Inbox/ only and remove the /BAS/ watcher path since /BAS/ is TEST-only.

PROD smoke test. With the above, from our side we are ready to schedule a small, low-value, single-transaction Pain.001 upload to PROD /Outbox/ to confirm the end-to-end cycle on the production processor. We would propose a window at your team's convenience this week — a single R1.00 transaction debtor 272406481 → a controlled creditor of your choice, and we step through ACK → INTAUD → FINAUD under your supervision. Please just let us know the date/time that suits and whether you would like us to pre-share the file for review before the upload.

All artefacts from today's run (the original Pain.001, the ACK XML, and the INTAUD XML) are preserved on our side under docs/test/sbsa-uat-rm5v2-responses-2026-04-20/ and a full test report with timestamps is in docs/test/sbsa-sftp-uat-rm5v2-report-2026-04-20.txt. Happy to forward any of that to your team if useful.

Thank you again for the very quick turnaround on Friday's questions.

Kind regards,
André
MyMoolah Treasury Platform
