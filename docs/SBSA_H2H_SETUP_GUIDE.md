# SBSA Host-to-Host (H2H) Setup Guide

**Date**: 2026-03-13  
**Status**: ✅ PG15 submitted to Colette (SBSA) on 2026-03-13 — Port corrected to 5022 on 2026-03-17 per Colette's instruction — Statement format + delivery schedule confirmed 2026-03-19 — **SOAP credit notification handler built 2026-03-24** — VPN clarified as Open Internet (confirmed with Colette 2026-03-24) — PGP confirmed Not Required (2026-03-24) — File names/directories confirmed (2026-03-24) — Awaiting SBSA test traffic before freeze (Thu Mar 27 → Apr 8)  
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
| **SFTP Username** | `standardbank` (to be created — see Step 3 below) |
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

Test that our server can connect to SBSA's SFTP (TEST environment):
```bash
sftp -i ~/.ssh/sbsa_sftp_key -P 5022 standardbank@196.8.85.62
```
> Note: SBSA uses port **5022** (not 22) on their side.

Test that SBSA can connect to our SFTP (once they have our public key):
```bash
# From any machine — SBSA will test this from their side
sftp -i ~/.ssh/sbsa_sftp_key standardbank@34.35.137.166
```

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

### File Types Expected in SFTP Inbox

| File | Format | Frequency | GCS Destination |
|------|--------|-----------|-----------------|
| Bank statement | MT940 | Once daily at 06:00 (Mon–Sat) | `standardbank/inbox/statements/` |
| Intraday statement | MT942 | Every 15 minutes (Mon–Sat) | `standardbank/inbox/statements/` |
| Payment status report | Pain.002 | After Pain.001 processing | `standardbank/inbox/payments/` |
| ACK/NACK/Audit/VET/Unpaid | ISO 20022 XML | Event-driven | `standardbank/inbox/payments/` |

### Statement Processing Pipeline

- **Parser**: `services/standardbank/mt940Parser.js` — Parses MT940/MT942 SWIFT files into structured transactions (576 lines, production-quality)
- **Service**: `services/standardbank/sbsaStatementService.js` — Orchestrates: poll GCS → parse → match known references → credit wallets via deposit notification service → archive
- **Poller cron**: `server.js` — Runs every 2 minutes (configurable via `SBSA_STATEMENT_POLL_SCHEDULE`)
- **Deposit crediting**: `services/standardbankDepositNotificationService.js` — Resolves MSISDN reference → wallet credit, or parks in suspense for ops review
- **Idempotency**: Files tracked by MD5 hash in `SBSAStatementRun` table; deposits tracked by synthetic transaction ID in `StandardBankTransaction` table

### Wallet Crediting Flow (MT942 → wallet credit in < 5 minutes)

```
SBSA delivers MT942 to our SFTP (every 15 min)
  → SFTP Gateway syncs to GCS bucket (immediate)
    → Statement poller detects new file (within 2 min)
      → MT940 parser extracts credit transactions
        → For each credit:
          1. Try match against pending Transaction (by reference)
          2. If no match → depositNotificationService:
             a. Resolve reference (MSISDN → wallet, float prefix, fuzzy match)
             b. Credit wallet (locked row + ledger journal entry)
             c. Or park in suspense (ops alert email)
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
- SBSA delivers files to our SFTP flat `/Inbox`
- An SFTP trigger script (or manual placement for testing) routes files to the correct environment sub-folder in GCS
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

---

## Related Docs

- `docs/SBSA_PAYSHAP_UAT_GUIDE.md` — PayShap RPP/RTP integration (separate service)
- `docs/SBSA_PAYSHAP_UAT_ACTIVATION_PLAN.md` — PayShap activation checklist
- `docs/RECONCILIATION_QUICK_START.md` — SFTP reconciliation system
- `docs/session_logs/2025-12-08_1430_sftp-gcs-gateway.md` — Original SFTP VM setup
- `docs/session_logs/2026-01-14_flash_reconciliation_and_ip_updates.md` — SFTP IP standardization
