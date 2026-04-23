# SBSA H2H PROD Penny — Response Capture Directory

This folder is the destination for every XML response file SBSA emits after
the R1.00 PROD penny Pain.001 is uploaded on 2026-04-23 (or the actual date
the test is executed — rename this folder if the upload slips).

## What to drop here

On the SBSA PROD `/Inbox/` you will see response files named:

```
MYMOOLAH_OWN11_ACK_PRD_<timestamp>_<SBSAMsgId>.xml
MYMOOLAH_OWN11_INTAUD_PRD_<timestamp>_<SBSAMsgId>.xml
MYMOOLAH_OWN11_FINAUD_PRD_<timestamp>_<SBSAMsgId>.xml
```

(and, in edge cases, `NACK`, `UNP_DATA`, or `VET_DATA` — also copy them here
if they arrive).

Copy EVERY file into this folder exactly as received — preserve filenames so
timestamps and SBSA MsgIds are traceable.

## Note on `/BAS/`

The SBSA TEST profile also exposes `/BAS/` with duplicate responses. The PROD
profile does **not** have `/BAS/` — poll `/Inbox/` only (confirmed by SBSA
infrastructure team during UAT).

## Expected response cycle (based on UAT RM7 timings)

| Step         | Expected arrival          | GrpSts  |
|--------------|---------------------------|---------|
| Upload lands | T+0                       | —       |
| ACK          | ~30 s after upload        | RCVD    |
| INTAUD       | ~2 min after upload       | PDNG    |
| FINAUD       | ~4–5 min after upload     | ACSP    |

If FINAUD does not arrive within 20 minutes, stop and reach out to SBSA
(Colette + Melanie) before trying again.

## Next steps after capture

1. Write `../sbsa-sftp-prod-penny-report-2026-04-23.txt` using the template
   at `../sbsa-sftp-prod-penny-report-TEMPLATE.txt`.
2. Confirm the R1.00 debit on the MyMoolah PROD statement for account
   `272406481` next business day.
3. Email Colette + Melanie — see `../COLETTE_REPLY_2026-04-23_prod-penny.md`.
