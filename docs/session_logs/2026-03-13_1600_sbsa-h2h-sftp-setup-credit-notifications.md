# Session Log - 2026-03-13 - SBSA Host-to-Host & Credit Notifications Setup

**Session Date**: 2026-03-13 ~10:00–16:00 SAST  
**Agent**: Cursor AI Agent  
**User**: André  
**Session Duration**: ~6 hours  
**Topic**: SBSA Host-to-Host (H2H) implementation — Credit Notifications via Webserver + SFTP setup

---

## Session Summary

SBSA assigned Colette as Implementation Manager for MyMoolah's H2H integration. She sent three documents (PG15 form, Credit Notifications PDF, Host Presentation PPTX) and requested our public IP address to begin the connectivity process. This session covered:

1. Reading and analysing all three SBSA documents
2. Identifying the correct IPs to provide (inbound webhook vs outbound SFTP)
3. Discovering the existing SFTP Gateway VM (`sftp-1-vm`, `34.35.137.166`) already in GCP
4. Starting the stopped VM
5. Generating SSH-RSA 2048 key pair for SBSA SFTP authentication
6. Creating GCP firewall rules to allow SBSA's SFTP servers
7. Updating firewall rules when admin IP changed
8. Recreating the SFTP Gateway VM (password was lost — fresh install)
9. Setting up SFTP Gateway: admin account, GCS connection, folders, SFTP users
10. Completing the PG15 form fields
11. Drafting the reply email to Colette

---

## Tasks Completed

- [x] Read and analysed all 3 SBSA documents (PDF readable; DOCX and PPTX extracted via python/screenshots)
- [x] Identified correct IP addresses: `34.128.163.17` (webhook) and `34.35.137.166` (SFTP)
- [x] Generated SSH-RSA 2048 key pair: `~/.ssh/sbsa_sftp_key` (private) and `~/.ssh/sbsa_sftp_key.pub` (send to SBSA)
- [x] Created GCP firewall rules: `allow-sbsa-sftp-test` (196.8.85.62) and `allow-sbsa-sftp-prod` (196.8.86.53)
- [x] Updated admin firewall rules (`sftp-1-tcp-22`, `sftp-1-tcp-443`) to current IP `169.0.184.203`
- [x] Deleted and recreated `sftp-1-vm` fresh (same image, same static IP, same service account)
- [x] SFTP Gateway configured: admin user `admin` / `MyMoolah@2026!`
- [x] GCS connection configured: `Default Storage` → `gs://mymoolah-sftp-inbound` via Attached Service Account
- [x] GCS folders created: `standardbank/`, `standardbank/inbox/statements/`, `standardbank/inbox/payments/`, `standardbank/outbox/`, `mobilemart/`, `flash/`
- [x] SFTP Gateway folders created: `standardbank`, `mobilemart`, `flash`
- [x] SFTP users created: `standardbank` (SSH key added), `mobilemart`, `flash`
- [x] PG15 form fields completed (awaiting SBSA account number + branch number from André)
- [x] Reply email to Colette drafted
- [x] Created `docs/SBSA_H2H_SETUP_GUIDE.md`
- [x] All changes committed to git

---

## Key Decisions

- **Two separate IPs**: `34.128.163.17` (load balancer, inbound webhook) and `34.35.137.166` (SFTP gateway, outbound/inbound SFTP) — these serve different purposes and must both be provided to SBSA
- **SSH key ownership**: We generated the key pair for the `standardbank` SFTP user because WE connect to SBSA's SFTP. MobileMart and Flash must provide their own keys (they connect to us)
- **Fresh VM recreation**: SFTP Gateway admin password was lost (set in Dec 2025, not documented). Safest fix was delete + recreate with same image, same static IP. GCS bucket and firewall rules were preserved
- **Connection type**: Webservice over Open Internet (not VPN, not MQ) — matches our cloud-hosted architecture
- **PG15 test endpoint**: Use `staging.mymoolah.africa` for TEST and `api-mm.mymoolah.africa` for PRODUCTION

---

## Files Modified / Created

- `docs/SBSA_H2H_SETUP_GUIDE.md` — NEW: complete H2H setup reference
- `~/.ssh/sbsa_sftp_key` — NEW: SSH private key (local only, never committed)
- `~/.ssh/sbsa_sftp_key.pub` — NEW: SSH public key to send to SBSA
- GCP: `sftp-1-vm` — recreated fresh
- GCP: firewall rules `allow-sbsa-sftp-test`, `allow-sbsa-sftp-prod` — NEW
- GCP: firewall rules `sftp-1-tcp-22`, `sftp-1-tcp-443` — updated to current admin IP
- GCS: `gs://mymoolah-sftp-inbound/standardbank/`, `mobilemart/`, `flash/` folders created

---

## Infrastructure State After Session

| Resource | Value | Status |
|----------|-------|--------|
| SFTP Gateway VM | `sftp-1-vm`, `africa-south1-a` | ✅ Running |
| SFTP Static IP | `34.35.137.166` | ✅ Reserved |
| SFTP Admin URL | `https://34.35.137.166` | ✅ Accessible |
| SFTP Admin Credentials | `admin` / `MyMoolah@2026!` | ✅ Set |
| GCS Bucket | `gs://mymoolah-sftp-inbound` | ✅ Connected |
| SFTP Users | `standardbank`, `mobilemart`, `flash` | ✅ Created |
| SSH Key (SBSA) | `~/.ssh/sbsa_sftp_key` | ✅ Generated |
| Firewall — SBSA TEST | `196.8.85.62/32 → tcp:22` | ✅ Active |
| Firewall — SBSA PROD | `196.8.86.53/32 → tcp:22` | ✅ Active |
| Webhook IP | `34.128.163.17` (LB) | ✅ Static |
| Webhook URL (PROD) | `https://api-mm.mymoolah.africa/api/v1/standardbank/notification` | ✅ Live |
| Webhook URL (TEST) | `https://staging.mymoolah.africa/api/v1/standardbank/notification` | ✅ Live |

---

## Issues Encountered

- **SFTP Gateway admin password lost**: VM had been stopped since Dec 2025. Password set during initial setup was never documented. SSH is blocked by SFTP Gateway software (intercepts port 22). Serial console was disabled. Solution: enable serial console, then recreate VM fresh.
- **Admin IP changed**: `169.0.101.162` → `169.0.184.203` (ISP dynamic IP). Updated firewall rules accordingly.
- **gcloud auth expired**: Required `gcloud auth login` mid-session. All subsequent commands worked after re-auth.
- **GCS folders not visible in SFTP Gateway**: Folders created via `gsutil` were not visible in the home directory picker. Had to create folders through the SFTP Gateway UI (Folders → Add Folder) to register them properly.
- **PG15 .docx unreadable**: Binary format not supported by file reader. Extracted via Python zipfile/XML parsing. All fields identified and completed.

---

## Pending Items

- [ ] **André to provide**: SBSA Treasury account number and branch number to complete PG15
- [ ] **Send email to Colette**: With completed PG15, SSH public key (`~/.ssh/sbsa_sftp_key.pub`) attached
- [ ] **SBSA to install**: Our SSH public key on their SFTP server for `standardbank` user
- [ ] **SBSA to provide**: PG15 back with connectivity confirmed; TEST environment details
- [ ] **MobileMart SSH key**: Awaiting their public key to add to `mobilemart` SFTP user
- [ ] **Flash SSH key**: Awaiting their public key to add to `flash` SFTP user
- [ ] **H2H Statements/Payments**: Await Melissa sign-on; statement format and schedule to be decided (MT940/MT942, daily, what time)
- [x] **Capitec RTP confirmed working** — tested 2026-03-13, worked 100% ✅. EBONF on Mar 12 was Capitec daily limit, not a code issue.
- [ ] **SBSA hash algorithm**: Ask Gustaf for exact HMAC spec for `x-GroupHeader-Hash`

---

## Important Context for Next Agent

- **Two separate SBSA integrations running in parallel**:
  1. **PayShap RPP/RTP** (OneHub API, Gustaf's team) — already live on staging, production credentials set up
  2. **H2H Credit Notifications + SFTP** (Colette's team) — NEW, just started, connectivity in progress
- **SFTP Gateway admin password**: `admin` / `MyMoolah@2026!` at `https://34.35.137.166`
- **SSH key for SBSA SFTP**: `~/.ssh/sbsa_sftp_key` — private key stays on André's Mac only
- **Credit notification endpoint** is already built and deployed: `POST /api/v1/standardbank/notification` in `standardbankController.js` — it receives XML SOAP notifications, parses the reference number (MSISDN), and credits the correct wallet
- **H2H timeline**: ~4–6 weeks total (solution design → activation → configuration → testing → go live)
- **SFTP Gateway admin IP is dynamic**: If André's IP changes, update firewall rules `sftp-1-tcp-22` and `sftp-1-tcp-443` with new IP

---

## Related Documentation

- `docs/SBSA_H2H_SETUP_GUIDE.md` — Full H2H setup reference (NEW this session)
- `docs/SBSA_PAYSHAP_UAT_GUIDE.md` — PayShap RPP/RTP integration (separate service)
- `docs/SBSA_PAYSHAP_UAT_ACTIVATION_PLAN.md` — PayShap activation checklist
- `docs/session_logs/2025-12-08_1430_sftp-gcs-gateway.md` — Original SFTP VM setup
- `docs/session_logs/2026-03-12_*` — RTP rollback and Capitec debugging session
