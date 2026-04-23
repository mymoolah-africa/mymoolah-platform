Hi Colette and Melanie,

Thank you again for confirming on 2026-04-22 that H2H is live in production. We ran the first penny test today and I wanted to share the status immediately — we're seeing something unexpected on your side and would really appreciate a quick sanity-check from your team before we do anything further.

We uploaded a single R1.00 Pain.001 to SBSA PROD /Outbox at 10:55:37 SAST today (2026-04-23), from the same sftp-1-vm gateway and with the same SBSA SSH key we used for the UAT RM7 round-trip on 2026-04-17. The file structure is identical to RM7 — pain.001.001.03, ChrgBr CRED, InstrPrty NORM, BtchBookg true, single <CdtTrfTxInf>, R1.00 in ZAR. Debtor 272406481 branch 002154 (our MyMoolah PROD profile). Beneficiary 10111730633 branch 051001 (my personal SBSA current account — the proven-good creditor from RM7). MsgId MM-PRODPENNY1776933922946-MOB8KTXF. EndToEndId PROD-PENNY-1776933922946-01. ReqdExctnDt 2026-04-24. Filename MYMOOLAH_OWN11_Pain001v3_ZAR_PRD_20260423104522947.xml (2344 bytes, MD5 e5f0cefb86fd09d9e130d3b6011d14ef).

What we're seeing:

The SFTP upload itself was clean — sftp exit code 0 at 10:55:37 SAST, and the file is still visible in /Outbox with the correct ownership (200:100) and size. We then polled /Inbox every 60 seconds for the full 30-minute window (10:52:51 SAST through 11:22:51 SAST) and captured no ACK, no NACK, no INTAUD, no FINAUD, no UNP_DATA, no VET_DATA — nothing on our MsgId at all. Meanwhile /Inbox is very much alive on our side: we see fresh PROVSTMT files landing every 15 minutes right through the test window, including at 11:05 SAST and 11:20 SAST, so the inbound pipe is healthy, this is isolated to the pain.002 response for our file.

On UAT RM7 (2026-04-17) the same sender-and-creditor pair produced ACK in roughly 30 seconds, INTAUD inside 2 minutes, and FINAUD ACSP in 4-5 minutes. Here we're at T+30 minutes with no movement on /Outbox either — our file is sitting there untouched.

Could you please check on your end whether:

1. The file has been picked up by the PROD payments processor, and if not, whether there is a manual release / first-use approval step that still needs to happen on your side for this profile.
2. The MsgId MM-PRODPENNY1776933922946-MOB8KTXF shows up anywhere in your internal processing logs or DLQ.
3. There is anything in the file structure, the profile setup, or the BOL user that you would like us to adjust before we re-upload.

We have deliberately NOT re-uploaded and will not do so until you confirm the disposition of this first file. The R1.00 is also not a concern — we are happy for it to process normally if it eventually clears, or to have it NACK'd if something is off. We just want to make sure we don't leave a zombie file in your processor or create duplicate work on your side.

Some context on our posture: we have deliberately left the scheduled pollers and the app-level SFTP upload path gated OFF in production for this first penny and done the upload manually from our sftp-1-vm gateway, exactly as in UAT. Nothing downstream has consumed this file on our side — it's purely a file-level round-trip test.

All artefacts are preserved on our side: the full 30-minute poll log (every 60s attempt to /Inbox), the original Pain.001 XML, and the manual /Outbox and /Inbox listings at 10:55, 11:00, 11:07 and 11:22 SAST. I'm happy to forward any of those directly if it would help your investigation — just let me know.

Thank you very much for the quick eyes on this. Once we understand what's happening on the PROD side we'll plan the next step together (most likely a second R1.00 penny after any config adjustment, or moving on to the app-level GCS-gateway path once this first one clears).

Kind regards,
André
MyMoolah Treasury Platform
