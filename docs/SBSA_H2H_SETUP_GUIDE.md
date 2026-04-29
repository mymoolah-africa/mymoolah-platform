# SBSA Host-to-Host (H2H) Setup Guide

**Date**: 2026-03-13 (Last UAT test: 2026-04-20, RM5v2 over-limit re-run)

---

## H2H Background-Service Environment Variables (v2.98.0, Apr 2026)

Every poller and scheduler-driven endpoint added by the Apr 2026 hardening release is gated by a unified `*_MODE` env var so nothing runs in production without explicit opt-in.

| Variable | Values | Default | Purpose |
|---|---|---|---|
| `SBSA_SFTP_UPLOAD_ENABLED` | `true` / `false` | `false` | When `false`, `sbsaSftpClientService.uploadPain001File` writes to `/tmp/sbsa-outbox/` instead of GCS. Flip to `true` only after UAT validates the full Pain.001 → GCS → Thorntech → SBSA chain. |
| `SBSA_STATEMENT_POLLER_MODE` | `cron` / `scheduler` / `off` | `off` (new in v2.98.0; was `cron` implicit) | `cron` = in-process `node-cron` every 2 min (Codespaces/local). `scheduler` = Cloud Scheduler drives `POST /api/v1/standardbank/scheduled-statement-poll`. Legacy `SBSA_STATEMENT_POLLER_ENABLED=false` still maps to `off`. |
| `SBSA_PAIN002_POLLER_MODE` | `cron` / `scheduler` / `off` | `off` | Legacy `SBSA_PAIN002_POLLER_ENABLED=true` maps to `cron`. `scheduler` = Cloud Scheduler drives `POST /api/v1/standardbank/scheduled-pain002-poll`. |
| `RECON_SFTP_WATCHER_MODE` | `cron` / `scheduler` / `off` | `off` | `cron` = in-process watcher every `RECON_SFTP_POLL_SECONDS` (default 60s). `scheduler` = Cloud Scheduler drives `POST /api/v1/reconciliation/scheduled-sftp-sweep`. |
| `RECON_SFTP_POLL_SECONDS` | integer | `60` | Poll cadence for `RECON_SFTP_WATCHER_MODE=cron` only. |

**Cloud Scheduler job creation** — once ready to flip an environment from `off` to `scheduler`:

```bash
./scripts/setup-cloud-scheduler.sh --staging      # or --production, --both
```

Creates/updates (idempotent):
- `sbsa-statement-poll-{env}` every 2 min
- `sbsa-pain002-poll-{env}` every 5 min
- `sftp-recon-sweep-{env}` every 2 min

All jobs authenticate to Cloud Run via OIDC (service-account email + service URL audience). No shared secrets.

---


**Status**: ✅ **SFTP TEST CONNECTIVITY CONFIRMED 2026-04-16** — SBSA firewall cleared (Colette confirmed freeze lifted Apr 16) — Full SFTP session working to SBSA TEST (196.8.85.62:5022) — Auth via RSA key PASS — Pain.001 uploaded to /Outbox/ for processing — SBSA PROD (196.8.86.53:5022) TCP reachable but key not loaded yet — SOAP credit notification endpoint PASS (HTTP 200) — 11 SBSA response files found in /BAS/ from Melanie's Mar 30 testing (ACK/NACK/INTAUD/FINAUD) — Pain.001 builder enhanced with ChrgBr and CdtrAcct/Tp fields — PG15 submitted 2026-03-13 — Pain.001 v3 passed SSVS validation 2026-03-30 — PayShap inbound credit sandbox 6/6 confirmed — **production PayShap inward queue: SBSA investigating (Louis Van Zyl)**  
**Implementation Manager**: SBSA (assigned contact)  
**Services**: Credit Notifications via Webserver + H2H SFTP (Statements + Payments)

---

## 1. Our Infrastructure Details (Submit to SBSA)

### Credit Notifications via Webserver (SOAP XML)

| Field | Value |
|-------|-------|
| **Public IP** | `34.128.163.17` (GCP Load Balancer — static) |
| **Webhook URL** | `https://api-mm.mymoolah.africa/api/v1/standardbank/notification` |
| **Protocol** | HTTPS (TLS 1.3) |
| **Connection type** | Webservice over Open Internet (confirmed with Colette 2026-03-24 — NOT VPN) |
| **Content-Type** | `text/xml` or `application/soap+xml` |
| **SOAP Action** | `SendTransactionNotificationAsync` |
| **WSDL** | `PaymentNotificationBaseV1_0.wsdl` (SBSA-provided, one-way async) |
| **SSL Common Name** | `api-mm.mymoolah.africa` |
| **SSL Organization** | MyMoolah |
| **SSL CA** | Google Trust Services (GCP-managed certificate) |
| **Response** | HTTP 200 with SOAP acknowledgement (async processing) |
| **Auth** | IP whitelisting (SBSA has whitelisted our IP) — no HMAC signature for SOAP |

### H2H SFTP (Statements + Payments)

| Field | Value |
|-------|-------|
| **Public SFTP IP** | `34.35.137.166` (static, reserved: `sftp-gateway-static-ip`) |
| **Port** | `5022` |
| **Auth type** | SSH-RSA 2048 key only (no password) |
| **SFTP Username (our server)** | `standardbank` (created — SSH key added) |
| **SFTP Username (SBSA server)** | `mymoolahuser` (confirmed by Colette 2026-03-26) |
| **VM** | `sftp-1-vm` (GCP Compute Engine, africa-south1-a) |
| **GCS Bucket** | `mymoolah-sftp-inbound` |

### SBSA's SFTP Server IPs (from their presentation)

| Environment | IP |
|-------------|-----|
| TEST | `196.8.85.62` |
| PROD | `196.8.86.53` |

---

## 2. SSH Key Pair (Generated 2026-03-13)

**Key location** (local machine):
- Private key: `~/.ssh/sbsa_sftp_key` — **KEEP PRIVATE, never share**
- Public key: `~/.ssh/sbsa_sftp_key.pub` — **Send this to SBSA**

**Public key to send to SBSA:**
```
ssh-rsa AAAAB3NzaC1yc2EAAAADAQABAAABAQCnShKXgvzVXZL7EuzGWESMzp3xaim5I+1M682w5cJ3M4N4MBLNAWobX+S750hG569dCpB/vNBW2SXrTYhWHIGS01Crg4ULcZMxqAPmN5RZ/Zbiqc69ztjI2X3McYa79/lTrZ5+7YC9YmppgHLsFdcPzV4IfLrO9ZgRzNQ94QUBH7APYmBGxqqYo5m33/2XS4OFTVOZpxwxyTJfdrQGwcBS4mlLTtBPwHq/Fj2Sceu3vZBA933RjfC0b2OFIbmZfHkFe1aYGEmj3BvKip9Fxp7GOLV4YdiubIAF3oDVUVOEwoHBqvyZ6l3Z6TzUyNGqkVVJVqETOwChLU5jd4vHADgB mymoolah-sbsa-sftp
```

**Key fingerprint**: `SHA256:Lf5DQHTMC5Fn+ieSiJ+/cBEWcyme4SduIxuknBDa0X0`

---

## 3. SFTP Gateway — Create SBSA User

The SFTP Gateway admin UI is at: **https://34.35.137.166**

### Steps to create the `standardbank` user:

1. Open `https://34.35.137.166` in your browser (accept the self-signed cert warning)
2. Log in with the admin credentials you set during initial setup
3. Go to **Users** → **Add User**
4. Set:
   - **Username**: `standardbank`
   - **Authentication**: SSH Key only (no password)
   - **Public Key**: paste the public key from Section 2 above
   - **Home directory / GCS prefix**: `standardbank/` (maps to `gs://mymoolah-sftp-inbound/standardbank/`)
5. Create subfolders in the GCS bucket for SBSA file delivery:
   - `standardbank/inbox/statements/` — SBSA delivers MT940/MT942 here
   - `standardbank/inbox/payments/` — SBSA delivers payment status reports here
   - `standardbank/outbox/` — MyMoolah uploads payment files here
6. Save and confirm the user is active

---

## 4. GCP Firewall Rules — Allow SBSA IPs

Run these commands in your terminal (requires `gcloud auth login` first):

```bash
# Allow SBSA TEST server to connect to our SFTP
gcloud compute firewall-rules create allow-sbsa-sftp-test \
  --project=mymoolah-db \
  --allow=tcp:5022 \
  --source-ranges=196.8.85.62/32 \
  --target-tags=sftp-1-deployment \
  --description="SBSA H2H SFTP TEST server access (port 5022)"

# Allow SBSA PROD server to connect to our SFTP
gcloud compute firewall-rules create allow-sbsa-sftp-prod \
  --project=mymoolah-db \
  --allow=tcp:5022 \
  --source-ranges=196.8.86.53/32 \
  --target-tags=sftp-1-deployment \
  --description="SBSA H2H SFTP PROD server access (port 5022)"
```

**Verify rules were created:**
```bash
gcloud compute firewall-rules list \
  --project=mymoolah-db \
  --filter="targetTags:sftp-1-deployment" \
  --format="table(name,sourceRanges,allowed)"
```

---

## 5. Test SFTP Connectivity (After Firewall Rules Applied)

### Latest Test Results (2026-04-16)

| Target | IP:Port | TCP | Auth | SFTP | Notes |
|--------|---------|-----|------|------|-------|
| SBSA TEST | 196.8.85.62:5022 | PASS | PASS | PASS | Full session working, file upload confirmed |
| SBSA PROD | 196.8.86.53:5022 | PASS | FAIL | N/A | Key not loaded on PROD server yet |
| Our SFTP | 34.35.137.166:5022 | PASS | N/A | N/A | VM running, port listening, SBSA-only access |
| SOAP | api-mm.mymoolah.africa | N/A | N/A | N/A | HTTP 200, Ack OK in 168ms |

**Test report**: `docs/test/sbsa-sftp-test-report-2026-04-16.txt`

### SBSA TEST: Folders Visible
```
/ (root)
├── BAS/      — SBSA response files (ACK, NACK, INTAUD, FINAUD)
├── Inbox/    — Files from SBSA to MyMoolah (statements, Pain.002)
└── Outbox/   — Files from MyMoolah to SBSA (Pain.001 uploads)
```

### Connect to SBSA's SFTP (TEST environment):
**IMPORTANT**: Must run from GCP VM (`sftp-1-vm` / `34.35.137.166`), NOT from local machine.
```bash
# SSH into the VM first:
gcloud compute ssh sftp-1-vm --project=mymoolah-db --zone=africa-south1-a --tunnel-through-iap --ssh-flag="-p 2222"

# Then from the VM:
sftp -i ~/.ssh/sbsa_sftp_key -P 5022 mymoolahuser@196.8.85.62
```
> Note: SBSA uses port **5022** (not 22) on their side.
> **Username**: `mymoolahuser` — confirmed by Colette on 2026-03-26 (SBSA created this user after importing our SSH key).
> **Key must be on VM**: Copy with `base64` method (gcloud scp has port flag issues).

### Connect to SBSA's SFTP (PRODUCTION):
```bash
sftp -i ~/.ssh/sbsa_sftp_key -P 5022 mymoolahuser@196.8.86.53
```
> **STATUS**: TCP reachable but key rejected. Ask Colette to import `sbsa_sftp_key.pub` on PROD profile.

### SBSA connects to our SFTP:
```bash
# SBSA will test this from their side using their credentials
# Our SFTP: 34.35.137.166:5022
```

### SFTP Analyst Contact
- **Melanie Block** — assigned by Colette (2026-03-26) to assist with testing once SFTP connectivity is confirmed.

### Important: Statements Have No Test Environment
Colette confirmed (2026-03-26): **"Statements does not have a test environment, once development has been completed, we can move to Production, for statements only."** MT940/MT942 files will only flow in Production.

### SBSA Response Files — Melanie's Mar 30 testing (in /BAS/)

| File | Status | Meaning |
|------|--------|---------|
| RM1 ACK | RCVD | File received |
| RM2 NACK | RJCT | Duplicate MsgId |
| RM3 ACK + INTAUD + FINAUD | ACSP | ALL 3 txns processed successfully |
| RM4 NACK | RJCT | Duplicate MsgId |
| RM5 NACK | RJCT | Duplicate MsgId |
| RM6 ACK + INTAUD + FINAUD | ACSP | ALL 3 txns processed successfully |

### SBSA Response Files — Colette's Apr 17 UAT (6 scenarios, RM7–RM12)

Ran 2026-04-17 15:55–18:36 SAST, 20-min intervals. Full report: `docs/test/sbsa-sftp-uat-report-2026-04-17.txt`.

| Scenario | File | GrpSts | Status Code | Verdict |
|----------|------|--------|-------------|---------|
| RM7 Valid SSVS | ACK + INTAUD + FINAUD | ACSP | 0000 | PASS — 3 txns settled in 3m40s |
| RM8 Duplicate MsgId | NACK | RJCT | — | PASS — "Duplicate MsgId" in 17s |
| RM9 Invalid DbtrAcct (123456789) | ACK + INTAUD | RJCT | 0009 | PASS — all 3 txns rejected (expected 0003, got 0009; Colette confirmed 0009 is canonical) |
| RM10 Past date (2014-11-12) | ACK + INTAUD | RJCT | 0014 | PASS — exact match with test sheet |
| RM11 Over-limit R96.15 | ACK + INTAUD + FINAUD | ACSP | 0000 | PARTIAL — R96.15 below TEST profile limit (R500,000); over-limit path not triggered |
| RM12 10-tx mixed (7 valid, 3 invalid) | ACK + INTAUD + FINAUD + UNPAID | PART | 0003/0000 | PARTIAL — 4 ACSP, 6 RJCT; UNPAID overrode FINAUD for 2 txns; VET not received |

### SBSA Response Files — RM5v2 Over-Limit Re-run (2026-04-20)

Re-ran with R500,001 (R1 over confirmed Cr Transaction Limit). Full report: `docs/test/sbsa-sftp-uat-rm5v2-report-2026-04-20.txt`.

| Response | GrpSts | Status Code | Description |
|----------|--------|-------------|-------------|
| ACK (+18s) | RCVD | — | File received |
| INTAUDTST (+25s) | RJCT | 0009 | RUN EXCEEDS LIMIT — all 3 txns RJCT |
| FINAUDTST | not emitted | — | SBSA does not issue FINAUD after INTAUD RJCT |

Batch total R500,003 exceeded Sub Batch Limit (R500,000) → batch-level rejection before per-tx check. Code 0006 unreachable while both limits are equal.

### SBSA Pain.002 Status Code Reference (confirmed via UAT)

| Code | Description | Scenario | GrpSts | Notes |
|------|-------------|----------|--------|-------|
| 0000 | Success | RM7 valid, RM11 under-limit | ACSP / PDNG | PDNG at INTAUD, ACSP at FINAUD |
| 0003 | INVALID ACCOUNT NUMBER | RM12 invalid beneficiary accounts | PART | Per-tx RJCT within a mixed batch |
| 0009 | (no description) | RM9 invalid ordering account | RJCT | Whole batch rejected |
| 0009 | RUN EXCEEDS LIMIT | RM5v2 batch over sub-batch limit | RJCT | Whole batch rejected; 0009 is dual-purpose — disambiguate by `AddtlInf` |
| 0014 | ACTION DATE INVALID | RM10 past execution date | RJCT | Whole batch rejected |
| — | Duplicate MsgId | RM8 duplicate file | RJCT (NACK) | Detected at file level, no INTAUD/FINAUD |

**Poller implementation notes:**
- Status Code 0009 carries two distinct meanings; the `AddtlInf` Status Description is the authoritative differentiator.
- FINAUDTST is not emitted after INTAUD RJCT — treat INTAUD RJCT as a terminal state.
- UNPAID can override FINAUD on a per-transaction basis (observed in RM12).
- Read from `/Inbox/` only in production; `/BAS/` is TEST-only (dual-delivery, appended filenames).

**Parser/poller changes shipped 2026-04-23 (ahead of PROD penny, gated OFF until go-live):**
- `services/standardbank/pain002Parser.js` captures `<AddtlInf>` as `rejectionReasonDetail`; exposes `responseType` (ACK/NACK/INTAUD/FINAUD/UNPAID/VET) derived from the filename; surfaces group-level `addtlInf`; classifies `ACWC` as rejected only under UNPAID.
- `services/standardbank/pain002PollerService.js` filename filter widened to `/^MYMOOLAH_<user>_(ACK|NACK|INTAUD|FINAUD|UNP_DATA|VET_DATA)_(TST|PRD)_/i` and passes the filename into the parser.
- `services/standardbank/disbursementService.processPain002Response` now:
  - Treats `ACK`/`VET` as informational (no DB writes).
  - On `NACK` marks all pending payments in the run rejected with group `AddtlInf`.
  - Treats `INTAUD` `GrpSts=RJCT` as terminal and force-closes any residual pending txns.
  - Keeps `INTAUD PDNG` rows in `pending` until FINAUD.
  - Treats `UNPAID` as authoritative per-tx over prior FINAUD; preserves `pre_unpaid_status`, `unpaid_reason_code`, `unpaid_tx_status`, and `unpaid_applied_at` in `payment.metadata`.
  - Refuses to downgrade a UNPAID override when a later FINAUD row arrives for the same `endToEndId`.

### SBSA Response Files — PROD Penny Test (scheduled 2026-04-23, pending execution)

Single R1.00 penny: debtor `272406481 / 002154` → creditor `10111730633 / 051001`. Generator: `scripts/test-sbsa-penny-prod.js --confirm-prod`. Runbook: `docs/test/SBSA_PROD_PENNY_RUNBOOK.md`. Response capture: `docs/test/sbsa-prod-penny-responses-<YYYY-MM-DD>/`.

| Response | GrpSts | Status Code | Description |
|----------|--------|-------------|-------------|
| ACK | (pending) | — | (pending) |
| INTAUD_PRD | (pending) | — | (pending) |
| FINAUD_PRD | (pending) | — | (pending) |

PROD has **no `/BAS/` folder** — poll `/Inbox/` only. App-level GCS-gateway path (`scripts/test-sbsa-penny-prod-app.js`) runs as Penny #2 after Penny #1 PASS and env gates flipped (`SBSA_H2H_GO_LIVE=true` in `scripts/deploy-backend.sh`).

---

## 6. PGP Encryption (NOT REQUIRED — confirmed with Colette 2026-03-24)

> **Status**: PGP is NOT required for the SBSA H2H integration. Confirmed with Colette on 2026-03-24. SFTP SSH key auth provides sufficient transport security. Retained below for reference only if requirements change in the future.

If SBSA ever requires file encryption, generate a PGP key pair and send them our public key:

```bash
# Generate PGP key pair
gpg --full-generate-key
# Choose: RSA and RSA, 4096 bits, name: MyMoolah, email: andre@mymoolah.africa

# Export public key to send to SBSA
gpg --armor --export andre@mymoolah.africa > ~/mymoolah-pgp-public.asc
```

Recommended algorithm: **AES256** (strongest option SBSA supports)
Recommended signing: **SHA256**

---

## 7. What to Send SBSA — Summary Checklist

### Immediate (Credit Notifications / PG15 form):
- [x] Public IP: `34.128.163.17`
- [x] Webhook URL: `https://api-mm.mymoolah.africa/api/v1/standardbank/notification`
- [x] SSL Common Name: `api-mm.mymoolah.africa`
- [x] SSL Organization: `MyMoolah`
- [x] Connection type: Webservice over Open Internet
- [x] **PG15 completed and emailed to Colette — 2026-03-13** ✅
- [x] SSH public key (`sbsa_sftp_key.pub`) attached and sent ✅

### For SFTP H2H (once Melissa signs):
- [x] SFTP IP: `34.35.137.166`
- [x] SFTP Port: `5022`
- [x] SSH Public Key (Section 2 above)
- [x] SFTP Username: `standardbank` (SBSA to confirm exact username once their setup is complete)
- [x] **Folder structure**: Inbox / Outbox is sufficient from SBSA side. MyMoolah uses sub-folders internally in GCS for separation: `standardbank/inbox/statements/` (MT940/MT942) and `standardbank/inbox/payments/` (Pain.002). SBSA delivers all files to our flat SFTP Inbox — we route internally. ✅ (Confirmed with Colette 2026-03-17)
- [x] **Statement format: MT940 (end-of-day) + MT942 (intraday)** — SWIFT ISO standard. MyMoolah confirmed this choice. ✅ (Confirmed with Colette 2026-03-17)
- [x] **Delivery schedule: Both intraday and end-of-day** — Colette confirmed both options available. ✅ (Confirmed 2026-03-17)
- [x] **PGP**: Not required — confirmed with Colette 2026-03-24. SFTP SSH key auth provides sufficient transport security. ✅
- [x] **SFTP username**: `OWN11` — confirmed on SBSA info sheet ✅
- [x] **MT940/MT942 filename pattern**: `MYMOOLAH_OWN11_FINSTMT_...` / `MYMOOLAH_OWN11_PROVSTMT_...` — confirmed on SBSA info sheet ✅
- [x] **Intraday statement frequency**: Every 15 minutes (Mon–Sat) — confirmed on SBSA info sheet ✅
- [x] **File names and directories**: Confirmed and accepted as per info sheet (2026-03-24) ✅
- [x] **Connection type**: Open Internet (NOT VPN) — confirmed with Colette 2026-03-24 ✅

### Pain.001 / PayShap / H2H payments progress (2026-03-30)

- [x] **Pain.001 v3** (`pain.001.001.03`): SBSA **SSVS** validation passed (2026-03-30)
- [x] **Debit account** for Pain.001 profile: **272406481** (branch **002154**) — confirmed for submissions
- [x] **PayShap inbound credit (sandbox)**: **6/6** callbacks confirmed working
- [x] **PayShap inbound credit (production)**: Callback URL registered — `https://api-mm.mymoolah.africa/api/v1/standardbank/payshap/inbound-credit`
- [ ] **SFTP H2H payments channel**: Enablement **in progress** — requested from **Melanie Block**
- [ ] **PayShap production inward queue**: **SBSA investigating** — **Louis Van Zyl**
- [ ] **H2H statements on SFTP**: MT940/MT942 parsers ready — **awaiting SFTP statement channel** (statements have no UAT; production flow per Colette)

---

## 8. Implementation Timeline (from SBSA presentation)

| Phase | Duration |
|-------|----------|
| Solution Design | 3–5 days |
| Solution Activation (sign docs, complete take-on form) | 2–3 days |
| Profile Set-up (bank process) | As per take-on doc |
| Configuration + Development (bank process) | 10–15 days |
| Testing | 5–10 days |
| Sign-off to promote to production | 3–5 days |
| Penny testing in production | Agreed period |
| Go live | — |

**Total estimated**: ~4–6 weeks from submission of all required info.

---

## 9. Existing SFTP Users (for reference)

| Username | Purpose | Status |
|----------|---------|--------|
| `mobilemart` | MobileMart daily recon files | Configured |
| `flash` | Flash daily recon files | Configured |
| `standardbank` | SBSA H2H statements + payments | ✅ Created (SSH key added) |

---

## 10. Statement Processing Architecture

### Confirmed Decisions (updated 2026-03-23 from SBSA info sheet)

| Parameter | Decision | Rationale |
|-----------|----------|-----------|
| **SFTP Method** | Push/Pull | MyMoolah pushes Pain.001 to SBSA Outbox; pulls MT940/MT942/Pain.002 from SBSA Inbox |
| **Statement format** | MT940 + MT942 | SWIFT ISO standard — banking-grade, Mojaloop-compatible, well-documented |
| **MT940 delivery** | Once daily, Mon–Sat, 06:00 | End-of-day final statement, early morning for reconciliation |
| **MT942 delivery** | Every 15 minutes, Mon–Sat | Intraday provisional — near-real-time deposit detection |
| **MT942 polling** | Every 2 minutes | Catches new files within 2 min of SFTP delivery → fastest wallet crediting |
| **Folder structure (SBSA side)** | Flat Inbox/Outbox | SBSA uses standard folders |
| **Folder structure (our GCS side)** | Sub-folders by type | `standardbank/inbox/statements/` and `standardbank/inbox/payments/` |
| **Encryption** | Not Required (PGP available later) | Confirmed on info sheet |
| **Compression** | Not Required | MT940/MT942 files are small text |
| **H2H User ID** | OWN11 | Assigned by SBSA |
| **Authorisation** | Zero Release | All payments require authorisation |

### SBSA Filename Patterns (from info sheet)

| File Type | Pattern | Example |
|-----------|---------|---------|
| MT940 (end-of-day) | `MYMOOLAH_OWN11_FINSTMT_YYYYMMDD_HHMMSS` | `MYMOOLAH_OWN11_FINSTMT_20260323_060000` |
| MT942 (intraday) | `MYMOOLAH_OWN11_PROVSTMT_YYYYMMDD_HHMMSS` | `MYMOOLAH_OWN11_PROVSTMT_20260323_141500` |
| Pain.001 (outbound payment) | `CLNT_USERID_Pain001v3_CountryCode_TST/PRD_yyyymmddhhmmssSSS.xml` | Per SBSA spec |
| ACK response | `MYMOOLAH_OWN11_ACK_TST/PRD_yyyymmddhhmmssSSS.xml` | Confirmation of file receipt |
| NACK response | `MYMOOLAH_OWN11_NACK_TST/PRD_yyyymmddhhmmssSSS.xml` | Rejection notification |
| Interim Audit | `MYMOOLAH_OWN11_INTAUD_TST/PRD_yyyymmddhhmmssSSS.xml` | Mid-batch processing status |
| Final Audit | `MYMOOLAH_OWN11_FINAUD_TST/PRD_yyyymmddhhmmssSSS.xml` | Final processing outcome |
| VET Data | `MYMOOLAH_OWN11_VET_DATA_TST/PRD_yyyymmddhhmmssSSS.xml` | Validation results |
| Unpaid Data | `MYMOOLAH_OWN11_UNP_DATA_TST/PRD_yyyymmddhhmmssSSS.xml` | Failed/returned payments |

### Pain.001 v3 (outbound payments) — SSVS validation & channel (2026-03-30)

- **Pain.001 v3** (`pain.001.001.03`) passed **SBSA SSVS** validation on **2026-03-30**.
- **Debit account** must be **272406481** (branch **002154**) — profile account.
- **SFTP channel enablement** for payments (H2H) **requested from Melanie Block**.
- **Test file** used for validation: `MYMOOLAH_OWN11_Pain001v3_ZAR_TST_20260330150000000.xml`
- **CSV template** for building payment batches: `docs/templates/pain001_payment_template.csv`

### File Types Expected in SFTP Inbox

| File | Format | Frequency | GCS Destination |
|------|--------|-----------|-----------------|
| Bank statement | MT940 | Once daily at 06:00 (Mon–Sat) | `standardbank/inbox/statements/` |
| Intraday statement | MT942 | Every 15 minutes (Mon–Sat) | `standardbank/inbox/statements/` |
| Payment status report | Pain.002 | After Pain.001 processing | `standardbank/inbox/payments/` |
| ACK/NACK/Audit/VET/Unpaid | ISO 20022 XML | Event-driven | `standardbank/inbox/payments/` |

### Statement Processing Pipeline

- **Gateway sync**: `scripts/sbsa-h2h-gateway-sync.sh` — Dry-run-first helper for `sftp-1-vm` to copy SBSA external `/Inbox` files into GCS. It skips zero-byte inbound files and routes `FINSTMT`/`PROVSTMT` to `standardbank/inbox/statements/`, and `ACK`/`NACK`/`INTAUD`/`FINAUD`/`UNP_DATA`/`VET_DATA` to `standardbank/inbox/payments/`.
- **Parser**: `services/standardbank/mt940Parser.js` — Parses real SBSA MT940/MT942 SWIFT files, including wrapped SWIFT envelopes and MT942 `:34F:` intraday balances without `:60M:`/`:62M:`.
- **Service**: `services/standardbank/sbsaStatementService.js` — Orchestrates: poll GCS → parse → match known references → credit wallet EFT deposits via deposit notification service → archive
- **Poller cron**: `server.js` — Runs every 2 minutes (configurable via `SBSA_STATEMENT_POLL_SCHEDULE`)
- **Deposit crediting**: `services/standardbankDepositNotificationService.js` — Resolves MSISDN reference → wallet credit, or parks in suspense for ops review
- **Idempotency**: Files tracked by MD5 hash in `SBSAStatementRun` table; statement deposits tracked by a stable bank-line hash in `StandardBankTransaction.transactionId`, not by statement run ID. This prevents the same bank line appearing in multiple PROVSTMT/FINSTMT files from crediting twice.
- **Credit safety**: Statement auto-crediting is limited to `DEP` lines such as `IB PAYMENT FROM`. `TRF` credits are skipped in the statement path to avoid double-crediting realtime PayShap/RPP rails.

### Gateway Sync Operations

Run from `sftp-1-vm` or pipe the script over IAP. The script is dry-run by default:

```bash
SBSA_H2H_MAX_FILES=20 bash scripts/sbsa-h2h-gateway-sync.sh --inbound
```

Apply mode copies files from SBSA `/Inbox` to GCS and records processed filenames in `/var/lib/mymoolah-sbsa-h2h/production-inbox-processed.txt`:

```bash
SBSA_H2H_MAX_FILES=20 bash scripts/sbsa-h2h-gateway-sync.sh --inbound --apply
```

Outbound mode uploads files from GCS outbox to SBSA `/Outbox`; use only after explicit production approval because outbound Pain.001 files move real money:

```bash
bash scripts/sbsa-h2h-gateway-sync.sh --outbound --apply
```

### Wallet Crediting Flow (MT942 → wallet credit in < 5 minutes)

```
SBSA delivers MT942 to our SFTP (every 15 min)
  → SFTP Gateway syncs to GCS bucket (immediate)
    → Statement poller detects new file (within 2 min)
      → MT940 parser extracts credit transactions
        → For each credit:
          1. Try match against pending Transaction (by reference)
          2. If no match and SWIFT type is DEP → depositNotificationService:
             a. Resolve reference (MSISDN → wallet, float prefix, fuzzy match)
             b. Credit wallet (locked row + ledger journal entry)
             c. Or park in suspense (ops alert email)
          3. Skip non-DEP credits so PayShap/realtime rails are not credited twice
        → Archive file to processed/ folder
```

**Maximum latency**: MT942 arrives every 15 min + 2 min poll cycle = **17 minutes worst case** from bank deposit to wallet credit. Average: ~9 minutes.

### Environment Isolation (Banking-Grade)

Each environment processes statements from its own isolated GCS folder. This prevents test files from accidentally crediting production wallets and vice versa.

| Environment | `STANDARDBANK_ENVIRONMENT` | GCS Statements Path | Database |
|-------------|---------------------------|---------------------|----------|
| UAT | `uat` | `standardbank/uat/inbox/statements/` | UAT (test users, test APIs) |
| Staging | `staging` | `standardbank/staging/inbox/statements/` | Staging (test users, live APIs) |
| Production | `production` | `standardbank/inbox/statements/` | Production (real users, live APIs) |

**How it works:**
- SBSA places files in its external SFTP `/Inbox`.
- `scripts/sbsa-h2h-gateway-sync.sh` runs on `sftp-1-vm` to copy files to the correct environment sub-folder in GCS.
- Each environment's poller only reads from its own path
- Archived files go to `processed/standardbank/{env}/statements/`

**For UAT testing:**
- Drop sample MT940/MT942 files into `gs://mymoolah-sftp-inbound/standardbank/uat/inbox/statements/`
- Enable poller: `SBSA_STATEMENT_POLLER_ENABLED=true` in UAT `.env`
- UAT poller picks up the file and credits the UAT wallet

**For production:**
- SBSA delivers real files to SFTP `/Inbox`
- Route to `standardbank/inbox/statements/` (no env prefix for production — backward compatible)
- Production poller credits real wallets

### MT940 Field Reference

```
:20:  Transaction Reference (our identifier)
:25:  Account (SBSA account number)
:28C: Statement number / sequence
:60F: Opening balance  (F=final/end-of-day, M=midday/intraday)
:61:  Statement line   (one per transaction — YYMMDD, CR/DR, amount, type, reference)
:86:  Narrative        (free text description per :61:)
:62F: Closing balance
:64:  Available balance (optional)
```

### Credit Notification Webservice (SOAP XML)

SBSA sends real-time credit notifications via SOAP XML when deposits hit our account.
This is the fastest crediting path — near real-time vs. MT942 (up to 17 min).

**WSDL**: `PaymentNotificationBaseV1_0.wsdl` (one-way async — no response message in WSDL)
**Operation**: `SendTransactionNotificationAsync`

**SOAP XML Field Mapping:**

| SOAP XML Path | Our Field | Description |
|---------------|-----------|-------------|
| `TrnNotificationInfo/TrnData/AcctTrnId` | `transactionId` | Unique SBSA transaction ID (idempotency key) |
| `TrnNotificationInfo/ReferenceNumber` | `referenceNumber` | Payment reference (MSISDN for wallet credit) |
| `TrnNotificationInfo/TrnData/TrnAmt/Amt` | `amount` | Amount in CENTS (15-char zero-padded, e.g. `000000000300000` = R3,000) |
| `TrnNotificationInfo/TrnData/TrnAmt/CurCode/CurCodeValue` | `currency` | Currency code (default: ZAR) |
| `TrnNotificationInfo/DebitCreditInd` | `debitCreditInd` | `CR` = credit, `DR` = debit (we only process CR) |
| `TrnNotificationInfo/FullAcctNumber` | `fullAcctNumber` | Our SBSA account number |
| `TrnNotificationInfo/TrnData/TrnDt` | `trnDate` | Transaction date (YYYY-MM-DD) |
| `TrnNotificationInfo/TrnData/TrnTime` | `trnTime` | Transaction time (HH:MM:SS) |
| `TrnNotificationInfo/TrnData/BalAmt/Amt` | `balanceAmount` | Account balance after transaction |
| `TrnNotificationInfo/FIData/Name` | `fiName` | Originating bank name |
| `TrnNotificationInfo/FIData/BranchIdent` | `branchIdent` | Branch code |
| `RqUID` | `rqUID` | SBSA's unique request UUID (for tracing) |

**Implementation:**

- **Parser**: `services/standardbank/sbsaSoapParser.js` — Parses SOAP XML, extracts all fields, converts SBSA cent-encoded amounts to rands
- **Controller**: `controllers/standardbankController.js` → `handleDepositNotification()` — Detects SOAP vs JSON, routes accordingly
- **Route**: `routes/standardbank.js` → `POST /notification` — Accepts `text/xml`, `application/xml`, `application/soap+xml`, and `application/json`
- **Deposit service**: `services/standardbankDepositNotificationService.js` — Same service used by both SOAP and MT942 statement processing

**Crediting flow (SOAP):**

```
SBSA sends SOAP XML to /api/v1/standardbank/notification
  → Route middleware captures raw body
    → Controller detects XML (vs JSON)
      → sbsaSoapParser parses SOAP envelope
        → Filters: only CR (credit), amount > 0
          → processDepositNotification:
            1. Idempotency check (transactionId = SBSA-SOAP-{AcctTrnId})
            2. Resolve reference (MSISDN → wallet, or suspense)
            3. Credit wallet + ledger journal entry
          → HTTP 200 SOAP acknowledgement
```

**Latency**: Near real-time — SBSA pushes notification immediately on deposit. Wallet credited within seconds.

### PayShap inbound credit (callback — separate from SOAP credit notification)

- **Sandbox**: Inbound credit callback **confirmed working** via SBSA sandbox (**6/6** callbacks received).
- **Production callback URL**: `https://api-mm.mymoolah.africa/api/v1/standardbank/payshap/inbound-credit`
- **Production inward queue**: Issue under investigation by **SBSA** (**Louis Van Zyl**); callback URL is registered — awaiting queue-side resolution.
- **Handler**: `controllers/standardbankController.js` → `handlePayshapInboundCredit()`

---

## 11. Cloud Armor WAF Exception (CRITICAL)

GCP Cloud Armor WAF blocks SOAP XML payloads by default (OWASP CRS rules flag XML namespaces as XSS/injection). A path exception is **required** for the notification endpoint on both staging and production.

**Fix script**: `scripts/fix-cloud-armor-soap-exception.sh`

```bash
# Dry run first to see current rules:
bash scripts/fix-cloud-armor-soap-exception.sh --dry-run

# Apply the fix:
bash scripts/fix-cloud-armor-soap-exception.sh
```

This adds an ALLOW rule at priority 50 for `request.path.matches('/api/v1/standardbank/notification')` on both `mmtp-waf-staging` and `mmtp-waf-production` policies. Does NOT modify or remove any existing rules.

**Verification** (after fix):
```bash
curl -v -X POST https://staging.mymoolah.africa/api/v1/standardbank/notification \
  -H "Content-Type: text/xml" -d @/tmp/sbsa-test-notification.xml
```

Should return HTTP 200 with SOAP `<Ack>OK</Ack>`.

**Without this fix**: SBSA notifications receive `403 Forbidden` from Cloud Armor before reaching the application.

---

## 12. Cloud Run Service URLs (Direct — Bypasses WAF)

Use these to test the application directly when Cloud Armor is blocking:

| Service | URL |
|---------|-----|
| Staging backend | `https://mymoolah-backend-staging-4ekgjiko5a-bq.a.run.app` |
| Production backend | `https://mymoolah-backend-production-4ekgjiko5a-bq.a.run.app` |
| Staging wallet | `https://mymoolah-wallet-staging-4ekgjiko5a-bq.a.run.app` |
| Production wallet | `https://mymoolah-wallet-production-4ekgjiko5a-bq.a.run.app` |

---

## Related Docs

- `docs/SBSA_PAYSHAP_UAT_GUIDE.md` — PayShap RPP/RTP integration (separate service)
- `docs/SBSA_PAYSHAP_UAT_ACTIVATION_PLAN.md` — PayShap activation checklist
- `docs/RECONCILIATION_QUICK_START.md` — SFTP reconciliation system
- `docs/session_logs/2025-12-08_1430_sftp-gcs-gateway.md` — Original SFTP VM setup
- `docs/session_logs/2026-01-14_flash_reconciliation_and_ip_updates.md` — SFTP IP standardization
