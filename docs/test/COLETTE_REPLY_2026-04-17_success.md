# Reply to Colette — SBSA H2H SFTP Connectivity Confirmed

**To:** Colette Fourie  
**Cc:** Mark Jenner, Charles Sakyi, Marius Groenewald, Bronwyn Dean, Liezel McClure, Suzie Nanahra  
**Subject:** RE: MyMoolah (Pty) Ltd - SBSA File Upload Testing for your further review - Test Environment

---

Hi Colette,

Thank you — and please pass my thanks on to Jason and the H2H team for the quick diagnosis.

You were right: we were connecting with the wrong username. I was using `MYMOOLAH` (the filename prefix and our ISO-20022 party identifier) instead of `mymoolahuser` (the SFTP login user). I've re-run the full round-trip from our gateway at 34.35.137.166 and everything works.

**Just completed — 2026-04-17, 13:01 SAST**

| Test | Result |
|---|---|
| SSH public-key auth — **TEST** (196.8.85.62:5022) | PASS |
| SSH public-key auth — **PROD** (196.8.86.53:5022) | **PASS — first-ever successful auth since your PROD import** |
| Directory listing on TEST | `/Outbox`, `/Inbox`, `/BAS` all accessible |
| Directory listing on PROD | `/Outbox`, `/Inbox` accessible |
| Pain.001 upload to TEST `/Outbox/` | PASS — `MYMOOLAH_OWN11_Pain001v3_ZAR_TST_20260417110153RM1.xml` (4,226 bytes) |
| File pickup by SBSA | PASS — `/Outbox/` drained within 45 seconds |

Both servers accepted the same key fingerprint: `SHA256:Lf5DQHTMC5Fn+ieSiJ+/cBEWcyme4SduIxuknBDa0X0`

We are still waiting on the ACK / NACK / INTAUDTST drop in `/BAS/` for today's upload — the most recent files in that folder are still the 2026-03-30 round-trip responses. If convenient, could your team confirm that `MYMOOLAH_OWN11_Pain001v3_ZAR_TST_20260417110153RM1.xml` made it into the SBSA processing queue and when we should expect the response? No rush — I'll keep polling our side.

**Where things stand now**

- H2H SFTP connectivity: **live on TEST and PROD.**
- Outbound (Pain.001 disbursements): confirmed working end-to-end on TEST.
- Inbound (ACK / NACK / FINAUDTST / MT940 / MT942): infrastructure ready, awaiting today's TEST response to close the loop, then PROD smoke test.

Thank you again for your patience and for pushing the PROD key import through. I'll send a clean log bundle if your team would like it for your records.

Kind regards,
André  
MyMoolah Treasury Platform
