# Reply to Colette — SBSA H2H SFTP Round-Trip Closed on TEST

**To:** Colette Fourie  
**Cc:** Mark Jenner, Charles Sakyi, Marius Groenewald, Bronwyn Dean, Liezel McClure, Suzie Nanahra  
**Subject:** RE: MyMoolah (Pty) Ltd - SBSA File Upload Testing for your further review - Test Environment

---

Hi Colette,

Thank you — and please pass my thanks on to Jason and the H2H team for the quick diagnosis.

You were right: we were connecting with the wrong username. I was using MYMOOLAH (the filename prefix and our ISO-20022 party identifier) instead of mymoolahuser (the SFTP login user). I have re-run the full round-trip from our gateway at 34.35.137.166 and everything is working end-to-end on TEST.

Transport layer — 2026-04-17, 13:01 SAST:

- SSH public-key authentication on SBSA TEST (196.8.85.62:5022): PASS.
- SSH public-key authentication on SBSA PROD (196.8.86.53:5022): PASS — first successful authentication on PROD since your team imported the key.
- Directory listing on TEST: /Outbox, /Inbox and /BAS all accessible.
- Directory listing on PROD: /Outbox and /Inbox accessible.
- Pain.001 upload to TEST /Outbox: PASS — file MYMOOLAH_OWN11_Pain001v3_ZAR_TST_20260417110153RM1.xml (4,226 bytes) uploaded cleanly.
- File pickup by SBSA: PASS — /Outbox drained within 45 seconds.

Both servers accepted the same key fingerprint: SHA256:Lf5DQHTMC5Fn+ieSiJ+/cBEWcyme4SduIxuknBDa0X0.

Processor layer — responses received in /BAS and /Inbox:

- ACK (pain.002.001.03) at 13:14:08 SAST, MsgId 51885348, GrpSts RCVD — file received and validated by SBSA, original MsgId MM-TESTCONNECT20260416-MO18Y1MZ, 3 transactions, control sum R3.00, initiating party SBZAZAJJXXX.
- INTAUDTST at 13:14:20 SAST — all three transactions status PDNG (pending processing).
- FINAUDTST at 13:18:52 SAST — all three transactions status ACSP (Accepted for Settlement).

Full round-trip: 17 minutes from our upload to final ACSP. That closes the functional loop on TEST.

Where things stand overall: H2H SFTP is live on both TEST and PROD. Outbound Pain.001 disbursement flow is end-to-end functional on TEST, with RCVD → PDNG → ACSP all confirmed. Inbound ACK / INTAUDTST / FINAUDTST / MT940 / MT942 infrastructure on our side is ready and our pollers will pick everything up automatically once we flip them from "off" to "scheduler" mode in production.

From my side the next step is a small smoke upload to PROD in coordination with your team, to confirm the same cycle on the production processor before we start pointing real disbursement traffic at it. Happy to book a short call with Jason and whoever else on your side you would like in the loop to agree the approach and first smoke run.

Thank you again for your patience today, and for pushing the PROD key import through. Full log bundle and the three response XMLs are available on our side if your team would like them for your records.

Kind regards,  
André  
MyMoolah Treasury Platform
