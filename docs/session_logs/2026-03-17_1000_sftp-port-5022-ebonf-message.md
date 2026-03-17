# Session Log — 2026-03-17 — SFTP Port 5022 & EBONF Banking Message

**Session Date**: 2026-03-17 ~09:00–11:00 SAST  
**Agent**: Cursor AI Agent  
**User**: André  
**Topic**: SBSA H2H SFTP port correction (22 → 5022) + EBONF daily-limit user notification

---

## Session Summary

Two independent tasks completed this session:

1. **EBONF daily-limit notification** — When a PayShap RTP is rejected with code `EBONF` (Capitec/bank daily limit), the user now receives a clear, professional banking-grade message instead of the generic "could not be delivered" error.

2. **SFTP Gateway port change 22 → 5022** — Colette (SBSA Implementation Manager) confirmed via email that SBSA's H2H Push/Pull method requires our SFTP server on port **5022**, not 22. All three required changes were implemented: docs updated, GCP firewall rules recreated, and the SFTP Gateway VM port changed.

The SFTP port change was complex — the Thorntech SFTP Gateway intercepts all SSH connections on port 22 (blocking IAP SSH access), startup scripts fail due to `/tmp noexec` on the Ubuntu 24.04 image, and the Admin UI has no port setting. The solution was to detach the VM's boot disk, mount it on a temporary Ubuntu VM, edit `/opt/sftpgw/application.properties` directly, reattach, and reboot.

---

## Tasks Completed

- [x] **EBONF notification** — `services/standardbankRtpService.js`: detect `codes.includes('EBONF')` in both the direct-rejection path and the PBAC-failure path; show title "PayShap Daily Limit Reached" + professional message with bank name and retry-tomorrow instruction
- [x] **Docs — SBSA H2H Setup Guide** — Port updated from `22` → `5022` in connectivity table, firewall rule examples, and checklist (`docs/SBSA_H2H_SETUP_GUIDE.md`)
- [x] **GCP Firewall rules** — Deleted `allow-sbsa-sftp-test` and `allow-sbsa-sftp-prod` (tcp:22), recreated on tcp:5022
- [x] **SFTP Gateway port** — Edited `/opt/sftpgw/application.properties`: `sftp.port=22` → `sftp.port=5022` via disk detach/mount/edit/reattach method
- [x] **Verified** — Port 5022 confirmed OPEN, port 22 confirmed CLOSED, admin UI (443) confirmed UP
- [x] **Cleanup** — Temp VM `sftp-temp-editor` deleted, temp firewall rule `sftp-admin-test-5022` deleted, metadata keys (`startup-script`, `startup-script-url`, `enable-oslogin`) removed, GCS temp script deleted
- [x] All changes committed to git

---

## Key Decisions

- **Why not change via SFTP Gateway admin UI?** — The web UI Settings page does not expose a port field (version 3.7.4). The Thorntech documentation confirms the port lives in `/opt/sftpgw/application.properties`.
- **Why not startup script?** — The Thorntech GCP image mounts `/tmp` with `noexec`. GCP's metadata script runner saves scripts to `/tmp` before executing, so all startup scripts fail with "Permission denied" regardless of language (bash, Python, etc.).
- **Why not IAP SSH?** — The SFTP Gateway daemon intercepts all connections on port 22 (including IAP-tunnelled connections). It presents its own SFTP banner and rejects OS-level SSH keys. OS Login does not help because the SFTP Gateway IS the SSH server.
- **Disk detach/edit approach chosen** — Clean, surgical, and leaves no persistent metadata side-effects. The VM's users, folders, GCS connection, and host keys were all untouched.
- **EBONF wording** — Uses `payerBankName` field (stored per-request) in the message so the user sees the specific bank name (e.g., "Capitec Bank has reached its daily PayShap transaction limit"). Falls back to "The payer's bank" if not set.

---

## Files Modified

| File | Change |
|------|--------|
| `services/standardbankRtpService.js` | EBONF detection + professional daily-limit message (both rejection paths) |
| `docs/SBSA_H2H_SETUP_GUIDE.md` | Port 22 → 5022 throughout |
| GCP: `allow-sbsa-sftp-test` | Recreated on tcp:5022 (was tcp:22) |
| GCP: `allow-sbsa-sftp-prod` | Recreated on tcp:5022 (was tcp:22) |
| VM: `/opt/sftpgw/application.properties` | `sftp.port=22` → `sftp.port=5022` |

---

## Infrastructure State After Session

| Resource | Value | Status |
|----------|-------|--------|
| SFTP Gateway VM | `sftp-1-vm`, `africa-south1-a` | ✅ Running |
| SFTP Static IP | `34.35.137.166` | ✅ Reserved |
| SFTP Port | **5022** | ✅ Confirmed OPEN |
| Admin UI | `https://34.35.137.166` (port 443) | ✅ Up |
| Firewall — SBSA TEST | `196.8.85.62/32 → tcp:5022` | ✅ Active |
| Firewall — SBSA PROD | `196.8.86.53/32 → tcp:5022` | ✅ Active |
| SFTP admin credentials | `admin` / `MyMoolah@2026!` | ✅ Unchanged |
| SFTP user `standardbank` | SSH key + /standardbank folder | ✅ Unchanged |
| GCS Bucket | `gs://mymoolah-sftp-inbound` | ✅ Connected |

---

## Issues Encountered

- **SFTP Gateway blocks SSH on port 22** — IAP SSH tunnel gets intercepted and treated as an SFTP login attempt (shows SFTP banner, asks for SFTP password). OS Login keys are rejected.
- **Ubuntu 24.04 `/tmp noexec`** — Multiple GCP startup script attempts all failed with `exit status 126: Permission denied`. Both `startup-script` (inline bash) and `startup-script-url` (from GCS) failed. Python shebang didn't help — the restriction is on the file itself in `/tmp`, not the interpreter.
- **Thorntech API backup/restore doesn't include port setting** — The `/backend/3.0.0/backup` export endpoint returns users, folders, hostkeys, and encryption algorithms, but NOT application-level properties like `sftp.port`.
- **OAuth2 API auth discovered** — Token obtained via `POST /backend/login` with `Authorization: Basic <base64(clientid:clientsecret)>` and `grant_type=password`. Useful for future API automation.

---

## Pending Items / Next Agent Actions

- [ ] **Reply to Colette (SBSA)** — Confirm port 5022 is ready, send updated connectivity table (IP: `34.35.137.166`, Port: `5022`, Auth: SSH-RSA 2048, Username: `standardbank`)
- [ ] **SBSA connectivity test** — SBSA TEST server (`196.8.85.62`) needs to attempt SFTP connection to verify end-to-end. Await Colette's confirmation.
- [ ] **Admin IP firewall** — André's home IP is dynamic (`169.0.73.54` as of this session). If SFTP Gateway admin UI becomes inaccessible, update `sftp-1-tcp-22` and `sftp-1-tcp-443` firewall rules with new IP.
- [ ] **SBSA hash algorithm** — Ask Gustaf for exact HMAC spec for `x-GroupHeader-Hash` mismatch warning (soft_fail, non-blocking for now).
- [ ] **Production deploy** — Push commits and redeploy backend to production to activate the EBONF daily-limit user message.
- [ ] **H2H Statements/Payments** — Awaiting Melissa's sign-on confirmation before SBSA can proceed with statement delivery configuration.

---

## Important Context for Next Agent

- **Two separate SBSA integrations running in parallel**:
  1. **PayShap RPP/RTP** (Gustaf's team, OneHub API) — Live on staging and production
  2. **H2H Credit Notifications + SFTP** (Colette's team) — Connectivity in progress, port now corrected to 5022
- **SFTP Gateway admin credentials**: `admin` / `MyMoolah@2026!` at `https://34.35.137.166`
- **SFTP port is now 5022** — If SBSA cannot connect, verify firewall rules are still active (`gcloud compute firewall-rules list --project=mymoolah-db --filter="targetTags:sftp-1-deployment"`)
- **How to SSH into the SFTP VM in future**: You **cannot** SSH directly. Use the disk detach/mount/edit approach on a temporary Ubuntu VM, or use the Thorntech OAuth2 API (token: `POST /backend/login` with Basic auth using `clientid:clientsecret` from `/webconfig.js`)
- **EBONF message is live after backend redeploy** — The new professional daily-limit message is in the code but the backend needs to be redeployed to staging/production

---

## Related Documentation

- `docs/SBSA_H2H_SETUP_GUIDE.md` — Full H2H setup reference (port now 5022)
- `docs/session_logs/2026-03-13_1600_sbsa-h2h-sftp-setup-credit-notifications.md` — Original SFTP VM setup
- `docs/session_logs/2026-03-16_2132_rtp-callback-uetr-fix.md` — Previous session (RTP UETR fix)
