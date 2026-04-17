# Session Log - 2026-04-17 - SBSA SFTP Key Rejected by Server (IT Log Prepared)

**Session Date**: 2026-04-17 09:30 SAST
**Agent**: Cursor AI Agent
**User**: Andre
**Session Duration**: ~20 minutes

---

## Session Summary

Following Colette's 08:20 email ("nothing changed on our side, please try again, if still failing, attach logs for IT"), re-tested SFTP connectivity from our whitelisted GCP VM (34.35.137.166) to both SBSA TEST (196.8.85.62:5022) and SBSA PROD (196.8.86.53:5022). Both fail with identical symptoms: TCP/SSH handshake succeeds, but the server rejects our public key at the "offer" stage (SSH_MSG_USERAUTH_FAILURE type 51 returned before any signature is requested). This is definitively a server-side issue — our private key file is unchanged since 2026-03-13 and the same key worked on 2026-04-16. Captured full OpenSSH verbose logs into `docs/test/sbsa-sftp-test-report-2026-04-17.txt` for attachment to the reply to Colette's IT team.

---

## Tasks Completed

- [x] Redeployed SBSA SSH key to GCP VM via IAP tunnel (port 2222)
- [x] Verified key fingerprint on VM: `SHA256:Lf5DQHTMC5Fn+ieSiJ+/cBEWcyme4SduIxuknBDa0X0` (unchanged)
- [x] TCP connectivity tests to both TEST and PROD: PASS
- [x] Full SSH handshake captured for both servers: PASS
- [x] SFTP auth tests with `-vvv` verbose logging: both FAIL at publickey offer stage
- [x] Created consolidated IT-ready log: `docs/test/sbsa-sftp-test-report-2026-04-17.txt` (346 lines)
- [x] Drafted copy-and-paste reply to Colette with log analysis

---

## Key Findings

- **Protocol-level diagnostic**: server returns SSH `USERAUTH_FAILURE` (packet type 51) immediately after we advertise the public key, *before* the signature round. In standard SSH publickey auth, a recognised key would trigger `PK_OK` (type 60) first. Type 51 here means the key itself is not on the authorized list for user MYMOOLAH.
- **Likely causes** (all server-side, none on our side):
  1. Public key removed from `authorized_keys`
  2. MYMOOLAH account locked/disabled
  3. Home or `.ssh` permissions changed (sshd StrictModes)
- **Server host keys unchanged**: TEST `x8moEzWPauOv6jQKZS70vDJIWhsG8aV2IaANVcVVfQw`, PROD `Wvqj3tjuQq4vUffdiC+XYcN/9HqNr4pQcNMTphtdvZk` — so the servers themselves have not been replaced/rebuilt.
- Our private key file (mod date 2026-03-13) and public key haven't changed since PG15 submission.

---

## Files Created

- `docs/test/sbsa-sftp-test-report-2026-04-17.txt` — NEW: 346-line consolidated report with summary + full OpenSSH verbose logs for both TEST and PROD, ready to attach to reply

---

## Next Steps

- [ ] Andre to send reply + attach `docs/test/sbsa-sftp-test-report-2026-04-17.txt` to Colette
- [ ] Await SBSA IT investigation of MYMOOLAH user's `authorized_keys` / account / permissions
- [ ] Once auth is restored → check `/Inbox` for response files to `MYMOOLAH_OWN11_Pain001v3_ZAR_TST_20260416105757707.xml`
- [ ] Download response files and parse with `pain002Parser.js`
- [ ] Confirm receipt back to Colette

---

## Important Context for Next Agent

- **Same key that worked yesterday is now rejected**: this is the critical piece of evidence. No changes on our side since 2026-03-13.
- **GCP VM access**: `gcloud compute ssh sftp-1-vm --project=mymoolah-db --zone=africa-south1-a --tunnel-through-iap --ssh-flag="-p 2222"`
- **SSH key still not persistent on VM**: must be redeployed each session (base64 method in session log from 2026-04-16_1100)
- **Log file attached to reply**: `docs/test/sbsa-sftp-test-report-2026-04-17.txt` contains the exact OpenSSH packet sequence (type 51 at the critical point) that proves server-side rejection
- **Correlation with previous email thread**: this is the same "HCTTK-2260" thread with Colette Moosa (Implementation Manager) and Melanie Block (test analyst); Roshan Rama handles SOAP credit notifications.
