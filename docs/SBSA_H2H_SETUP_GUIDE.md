# SBSA Host-to-Host (H2H) Setup Guide

**Date**: 2026-03-13  
**Status**: ✅ PG15 submitted to Colette (SBSA) on 2026-03-13 — Port corrected to 5022 on 2026-03-17 per Colette's instruction — Statement format + delivery schedule confirmed 2026-03-19  
**Implementation Manager**: SBSA (assigned contact)  
**Services**: Credit Notifications via Webserver + H2H SFTP (Statements + Payments)

---

## 1. Our Infrastructure Details (Submit to SBSA)

### Credit Notifications via Webserver

| Field | Value |
|-------|-------|
| **Public IP** | `34.128.163.17` (GCP Load Balancer — static) |
| **Webhook URL** | `https://api-mm.mymoolah.africa/api/v1/standardbank/notification` |
| **Protocol** | HTTPS (TLS 1.3) |
| **Connection type** | Webservice over Open Internet (no VPN) |
| **SSL Common Name** | `api-mm.mymoolah.africa` |
| **SSL Organization** | MyMoolah |
| **SSL CA** | Google Trust Services (GCP-managed certificate) |
| **Response** | HTTP 200 acknowledgement only (async processing) |

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

## 6. PGP Encryption (Optional — for file encryption)

If SBSA will encrypt files they send us, we need to generate a PGP key pair and send them our public key.

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
- [ ] PGP public key (if encryption required — generate per Section 6)
- [ ] **SBSA to confirm**: Exact SFTP username for our account
- [ ] **SBSA to confirm**: Exact MT940/MT942 filename pattern they will use
- [ ] **SBSA to confirm**: Intraday statement frequency (e.g., every 2h, every 4h, or on-demand)

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

### Confirmed Decisions (2026-03-19)

| Parameter | Decision | Rationale |
|-----------|----------|-----------|
| **SFTP Method** | Push/Pull | MyMoolah pushes Pain.001 to SBSA Outbox; pulls MT940/MT942/Pain.002 from SBSA Inbox |
| **Statement format** | MT940 + MT942 | SWIFT ISO standard — banking-grade, Mojaloop-compatible, well-documented |
| **Delivery schedule** | Intraday + End-of-day | Both confirmed available by Colette |
| **Folder structure (SBSA side)** | Flat Inbox/Outbox | SBSA uses standard folders |
| **Folder structure (our GCS side)** | Sub-folders by type | `standardbank/inbox/statements/` and `standardbank/inbox/payments/` |

### File Types Expected in SFTP Inbox

| File | Format | Frequency | GCS Destination |
|------|--------|-----------|-----------------|
| Bank statement | MT940 | End-of-day | `standardbank/inbox/statements/` |
| Intraday statement | MT942 | Intraday (TBD freq.) | `standardbank/inbox/statements/` |
| Payment status report | Pain.002 | After Pain.001 processing | `standardbank/inbox/payments/` |

### Statement Processing Code

- **Parser**: `services/standardbank/mt940Parser.js` — Parses MT940/MT942 SWIFT files into structured transactions
- **Service**: `services/standardbank/sbsaStatementService.js` — Orchestrates: pull from GCS → parse → reconcile against ledger → create unallocated deposit records → archive

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

---

## Related Docs

- `docs/SBSA_PAYSHAP_UAT_GUIDE.md` — PayShap RPP/RTP integration (separate service)
- `docs/SBSA_PAYSHAP_UAT_ACTIVATION_PLAN.md` — PayShap activation checklist
- `docs/RECONCILIATION_QUICK_START.md` — SFTP reconciliation system
- `docs/session_logs/2025-12-08_1430_sftp-gcs-gateway.md` — Original SFTP VM setup
- `docs/session_logs/2026-01-14_flash_reconciliation_and_ip_updates.md` — SFTP IP standardization
