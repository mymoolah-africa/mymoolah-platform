# SBSA H2H PROD Penny Test — Operator Runbook

**Status**: Ready to execute.
**Author**: MyMoolah Treasury Platform
**Date**: 2026-04-23

This runbook is the single source of truth for the PROD Penny test: a single
R1.00 Pain.001 upload to SBSA PRODUCTION H2H SFTP, to prove the end-to-end
round-trip before enabling the scheduler-driven pollers and the app-level
GCS-gateway upload path.

---

## Pre-flight

- [ ] Confirm Colette's 2026-04-22 email confirming PROD is live.
- [ ] Confirm PROD firewall rule `allow-sbsa-sftp-prod` is active on
      GCP project `mymoolah-db` (allows SBSA IPs → sftp-1-vm:5022 inbound).
- [ ] Confirm `~/.ssh/sbsa_sftp_key` exists on `sftp-1-vm` (same key as UAT;
      SBSA confirmed 2026-04-22).
- [ ] All Phase 1 parser fixes merged and deployed (poller gates still OFF).
- [ ] `/tmp/sbsa-prod-penny/` removed from local laptop if present.
- [ ] Calendar block ~30 min for the test window.

---

## Step 1 — Generate the Pain.001 locally

From the repo root on your laptop:

```bash
node scripts/test-sbsa-penny-prod.js --confirm-prod
```

Expected:

- File written to `/tmp/sbsa-prod-penny/MYMOOLAH_OWN11_Pain001v3_ZAR_PRD_<ts>.xml`.
- XML dumped to stdout for review.
- Single R1.00 transaction, debtor 272406481 / 002154, creditor 10111730633 / 051001.

**Review check (must pass before upload):**

- [ ] `<Document xmlns="urn:iso:std:iso:20022:tech:xsd:pain.001.001.03">` header.
- [ ] Filename contains `_PRD_` (not `_TST_`).
- [ ] `<NbOfTxs>1</NbOfTxs>`, `<CtrlSum>1.00</CtrlSum>`, `<InstdAmt Ccy="ZAR">1.00</InstdAmt>`.
- [ ] Debtor `<Id>272406481</Id>`, `<MmbId>002154</MmbId>`.
- [ ] Creditor `<Id>10111730633</Id>`, `<MmbId>051001</MmbId>`.
- [ ] Reference `MMTP PROD PENNY R1`, `InstrPrty NORM`, `ChrgBr CRED`, `BtchBookg true`, `Ccy ZAR`.
- [ ] EndToEndId is `PROD-PENNY-<timestamp>-01`.

## Step 2 (recommended) — Share for sanity check

Email the generated XML to `colette.louw2@standardbank.co.za` and
`melanie.ellis@standardbank.co.za` for a 5-minute eyeball before upload.
This is explicitly something Colette has offered. Wait for their reply
before Step 3 if you're at all unsure.

## Step 3 — Copy the file onto sftp-1-vm

```bash
FNAME=$(ls /tmp/sbsa-prod-penny/MYMOOLAH_OWN11_Pain001v3_ZAR_PRD_*.xml | head -1)
echo "Uploading: $FNAME"

gcloud compute scp "$FNAME" sftp-1-vm:/tmp/ \
  --project=mymoolah-db \
  --zone=africa-south1-a \
  --tunnel-through-iap

# Also copy the polling helper:
gcloud compute scp scripts/sbsa-prod-penny-poll.sh sftp-1-vm:/tmp/sbsa-prod-penny-poll.sh \
  --project=mymoolah-db \
  --zone=africa-south1-a \
  --tunnel-through-iap
```

## Step 4 — SSH into sftp-1-vm

```bash
gcloud compute ssh sftp-1-vm \
  --project=mymoolah-db \
  --zone=africa-south1-a \
  --tunnel-through-iap \
  --ssh-flag="-p 2222"
```

## Step 5 — Start the polling loop (in a separate terminal on the VM)

On the VM, open a second SSH session and start the poller FIRST so you don't
miss the ACK:

```bash
chmod +x /tmp/sbsa-prod-penny-poll.sh
/tmp/sbsa-prod-penny-poll.sh
```

The poller:

- Polls SBSA PROD `/Inbox` every 60s for up to 30 min.
- Downloads `MYMOOLAH_OWN11_{ACK,NACK,INTAUD,FINAUD,UNP_DATA,VET_DATA}_PRD_*.xml`
  to `/tmp/sbsa-prod-penny-responses/` on the VM.
- Exits early as soon as FINAUD is seen.

## Step 6 — Upload the Pain.001

In the first SSH session on the VM:

```bash
sftp -i ~/.ssh/sbsa_sftp_key -P 5022 mymoolahuser@196.8.86.53
```

At the `sftp>` prompt:

```
cd /Outbox
put /tmp/MYMOOLAH_OWN11_Pain001v3_ZAR_PRD_<timestamp>.xml
ls -la
bye
```

**Record the upload timestamp** (SAST) — you will need it for the report.

## Step 7 — Watch the poller capture responses

Expected cycle on the PROD profile (based on UAT RM7 timings 2026-04-17):

| Arrival | File | GrpSts | Action |
|---------|------|--------|--------|
| ~30 s   | `ACK_PRD_*` | RCVD | File received OK |
| ~2 min  | `INTAUD_PRD_*` | PDNG | Interim audit — Tx1 PDNG |
| ~4–5 min| `FINAUD_PRD_*` | ACSP | Final audit — Tx1 ACSP (authoritative) |

PROD has **no `/BAS/` folder** — `/Inbox` only.

If FINAUD does not arrive within 20 minutes, STOP. Do NOT re-upload. Contact
Colette and Melanie with the captured ACK + INTAUD for guidance.

## Step 8 — Copy responses back to the laptop

From the laptop:

```bash
gcloud compute scp --recurse \
  sftp-1-vm:/tmp/sbsa-prod-penny-responses \
  docs/test/sbsa-prod-penny-responses-$(date +%F)/_vm-capture \
  --project=mymoolah-db \
  --zone=africa-south1-a \
  --tunnel-through-iap
```

Then move the XML files out of `_vm-capture/` into
`docs/test/sbsa-prod-penny-responses-<date>/` itself (keep file names as-is).

## Step 9 — Write the formal report

Copy `docs/test/sbsa-sftp-prod-penny-report-TEMPLATE.txt` to
`docs/test/sbsa-sftp-prod-penny-report-<date>.txt` and fill in every field.
Treat it as an auditable record.

## Step 10 — Confirm settlement (next business day)

On the MyMoolah PROD bank statement for account **272406481**:

- [ ] R1.00 debit dated the PROD penny run date.
- [ ] Narrative reflects `MMTP PROD PENNY R1` (or SBSA's mapping of it).

Record the statement line in the report (Step 9) and attach a screenshot in
`docs/test/sbsa-prod-penny-responses-<date>/statement-screenshot.png`.

## Step 11 — Email Colette + Melanie (sign-off request)

Fill in `docs/test/COLETTE_REPLY_<date>_prod-penny.md` from the template
already drafted in this folder. Send as plain prose (no tables). Request
formal PROD go-live sign-off.

---

## Rollback / abort paths

| Condition | Action |
|-----------|--------|
| XML review in Step 1 looks wrong | Delete `/tmp/sbsa-prod-penny/*.xml`, fix generator, re-run. No bank impact. |
| Upload rejected by SFTP (auth/IP) | Fix on VM / firewall. File not delivered, no bank impact. |
| ACK arrives as NACK | Capture the NACK, report to SBSA. No settlement. |
| INTAUD RJCT terminal | SBSA will NOT emit FINAUD. Treat as failed penny; no settlement. |
| FINAUD ACSP received but no statement line | Escalate to Colette next business day — potentially a settlement bug; do NOT re-run. |
| Cannot reverse a successful R1.00 debit | None — R1.00 is an accepted cost of proving PROD. |

---

## Phases 5 and 6 — DO NOT RUN UNTIL PHASE 3 PASSES AND STEP 10 CONFIRMS SETTLEMENT

See the post-penny checklist in the report template, and follow
`docs/test/SBSA_PROD_POST_PENNY_ENABLEMENT.md` for the exact commands to
flip env gates, deploy, create Cloud Scheduler jobs, and execute the
app-level penny.
