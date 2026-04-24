# Email to Colette + Melanie — Penny #1 SUCCESS + Penny #2 Proposal

**To**: Colette Moosa (SBSA), Block, Melanie MB (SBSA), Melisa (cc)
**From**: André Botes, MyMoolah
**Date**: 2026-04-24
**Subject (suggested)**: Re: SBSA H2H PROD Penny test — round-trip confirmed, proceeding with Penny #2

---

Hi Melanie and Colette,

Thank you very much — please pass our thanks to your developer as well. Your fix and the quick turnaround have gotten us across the line on the first Production H2H round-trip.

I can confirm the full round-trip for Penny Test #1 has completed successfully on our side, exactly as you described:

- **ACK PRD** at 2026-04-23 11:56:47 SAST — GrpSts `RCVD`
- **INTAUD PRD** at 2026-04-23 11:56:51 SAST — GrpSts `PDNG` / TxSts `PDNG`, Status Code `0000` "NO ERROR FOUND — PROCESSED SUCCESSFULLY"
- **FINAUD PRD** overnight at 2026-04-24 05:56:06 SAST — GrpSts `ACSP` / TxSts `ACSP`, Status Code `0000` "NO ERROR FOUND-PROCESSED SUCCESSFULLY"
- **/Outbox is empty** — the Pain.001 was fully consumed after your processing-rule fix at 11:54 SAST
- **Settlement verified on both statements today (2026-04-24)**: R1.00 debit on `272406481` (MyMoolah Treasury), R1.00 credit on `10111730633` (my personal account). Real money has moved end-to-end exactly as expected.

So the only issue on Penny #1 was the 60-minute delay caused by the missing processing rule on your side, which is now corrected. The file shape, credentials, profile, gateway, and sender behaviour are all confirmed good.

**Penny Test #2**

Per Melanie's invitation, we will run a second penny test today (2026-04-24, Friday) from the same `sftp-1-vm` gateway, using:

- Same profile: OWN11, debtor 272406481
- Same creditor: 10111730633 (Andre Botes, SBSA)
- Same amount: R1.00, ZAR
- **New MsgId** (generated fresh at run time)
- **ReqdExctnDt = 2026-04-27 (Monday)** — deliberately chosen to avoid weekend settlement ambiguity, so BOL settles Monday night and FINAUD arrives Tuesday morning

Expected timelines now that the processing rule is in place:
- Pickup from `/Outbox` within ~1 minute of upload
- ACK within ~1 minute of pickup
- INTAUD within ~5 minutes of pickup
- FINAUD after BOL's overnight cycle on ReqdExctnDt (so Tuesday 2026-04-28 early hours)

I'll send a short note when the file is uploaded so you have the exact timestamp and MsgId for your logs, in case you want to eyeball the processor pickup timing from your side. We will poll `/Inbox` end-to-end and share the capture timings afterwards. If anything unexpected happens we will pause immediately and come back to you before re-uploading — same discipline as yesterday.

**After Penny #2 passes**

Once we have Penny #2 cleanly round-tripping we will move to the next phases on our side:
1. Enable our scheduler-driven pollers in Production (currently intentionally gated off).
2. Run a third penny via the app-level path (GCS-gateway + our Cloud Run upload service) to validate the automated end-to-end flow, not just the manual SFTP path.

Thanks again for your patience and the fast turnaround — it has been a pleasure working with both of you and the dev team on this.

Kind regards,
André

---

## Quick facts — Penny #1 disposition

| Field | Value |
|---|---|
| MsgId | `MM-PRODPENNY1776933922946-MOB8KTXF` |
| EndToEndId | `PROD-PENNY-1776933922946-01` |
| Pain.001 upload | 2026-04-23 10:55:37 SAST (exit 0, MD5 `e5f0cefb86fd09d9e130d3b6011d14ef`) |
| SBSA pickup | 2026-04-23 ~11:55 SAST (post rule-fix at 11:54) |
| ACK `RCVD` | 2026-04-23 11:56:47 SAST |
| INTAUD `PDNG`/`0000` | 2026-04-23 11:56:51 SAST |
| FINAUD `ACSP`/`0000` | 2026-04-24 05:56:06 SAST |
| Settlement | R1.00 debit + R1.00 credit confirmed on both statements 2026-04-24 |
| Verdict | ✅ SUCCESS — root cause on SBSA side, corrected 11:54 SAST |
