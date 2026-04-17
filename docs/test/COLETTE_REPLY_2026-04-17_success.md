# Reply to Colette — SBSA H2H SFTP Connectivity Confirmed

**To:** Colette Fourie  
**Cc:** Mark Jenner, Charles Sakyi, Marius Groenewald, Bronwyn Dean, Liezel McClure, Suzie Nanahra  
**Subject:** RE: MyMoolah (Pty) Ltd - SBSA File Upload Testing for your further review - Test Environment

---

Hi Colette,

Thank you — and please pass my thanks on to Jason and the H2H team for the quick diagnosis.

You were right: we were connecting with the wrong username. I was using `MYMOOLAH` (the filename prefix and our ISO-20022 party identifier) instead of `mymoolahuser` (the SFTP login user). I've re-run the full round-trip from our gateway at 34.35.137.166 and everything on the transport layer now works.

**Results — 2026-04-17, 13:01 SAST**

| Test | Result |
|---|---|
| SSH public-key auth — **TEST** (196.8.85.62:5022) | PASS |
| SSH public-key auth — **PROD** (196.8.86.53:5022) | **PASS — first successful auth on PROD** |
| Directory listing on TEST | `/Outbox`, `/Inbox`, `/BAS` all accessible |
| Directory listing on PROD | `/Outbox`, `/Inbox` accessible |
| Pain.001 upload to TEST `/Outbox/` | PASS — `MYMOOLAH_OWN11_Pain001v3_ZAR_TST_20260417110153RM1.xml` (4,226 bytes) |
| File pickup by SBSA | PASS — `/Outbox/` drained within 45 seconds |

Both servers accepted the same key fingerprint: `SHA256:Lf5DQHTMC5Fn+ieSiJ+/cBEWcyme4SduIxuknBDa0X0`

**One item for your team to please look at**

The ACK / NACK / INTAUDTST response for today's upload has not landed in `/BAS` yet. I polled again at 13:11 SAST (ten minutes after upload) and `/BAS` still only contains the 11 files from Melanie's 2026-03-30 round-trip.

For context, on 2026-03-30 during the 13:xx SAST slot, Melanie's responses arrived very quickly: NACKs within ~1 minute, and the full ACK + INTAUDTST + FINAUDTST cycle inside 5 minutes. We are now well past that window, which suggests something on the processor side. Transport is clearly fine — `/Outbox` emptied as expected — so I don't believe the file is stuck with us.

Could your H2H team please trace the file on your side and confirm:

- `MYMOOLAH_OWN11_Pain001v3_ZAR_TST_20260417110153RM1.xml` was ingested from the SFTP processor into your Pain.001 inbound pipeline;
- whether today's TEST processing queue is paused / backlogged; and
- whether the `mymoolahuser` account is routed to the same processor as Melanie's earlier test account, or to a different queue.

I'll keep polling `/BAS` on our side and will let you know the moment the response lands.

**Where things stand overall**

- H2H SFTP connectivity: **live on TEST and PROD.**
- Outbound (Pain.001 disbursements): transport confirmed end-to-end on TEST; awaiting your processor ACK to close the functional loop.
- Inbound (ACK / NACK / FINAUDTST / MT940 / MT942): gateway and GCS folders ready; our pollers will pick everything up automatically once the first TEST response closes.

Thank you again for your patience today, and for pushing the PROD key import through. Happy to share the full log bundle if it helps your team.

Kind regards,  
André  
MyMoolah Treasury Platform
