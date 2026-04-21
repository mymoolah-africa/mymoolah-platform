# Zapper SFTP — Provisioning Runbook

**Owner:** André
**Date authored:** 2026-04-21
**Last executed:** 2026-04-21 17:00 SAST — **Steps 1–5 complete**. Remaining work: Step 6 (E2E smoke test with Dillon) and Step 7 (post-test housekeeping, partially done as part of this session).
**Context:** Dillon Poultney delivered SSH public key + source IP on 2026-04-17.
**Status:** **ZAPPER SFTP USER IS LIVE** on `sftp-1-vm`. Go-live email drafted at `docs/integrations/ZAPPER_EMAIL_DILLON_GO_LIVE.md` — awaiting Dillon's test upload for smoke test.

---

## Inputs received from Zapper

| Item | Value | Source |
|------|-------|--------|
| SSH public key | `keys/zapper_dillon.pub` (RSA 2048) | Attached to Dillon's 17 Apr 2026 email |
| Source IP | `52.213.37.176` | Same email |
| Key fingerprint (SHA256) | `SHA256:EkGSJ40gqWvwpF+x1m30vB9t5duCBnU9xMUk8GA6Gl4` | `ssh-keygen -lf keys/zapper_dillon.pub` |
| Key fingerprint (MD5) | `MD5:06:87:19:ab:6b:ff:08:cd:f0:65:95:e6:34:c1:04:54` | `ssh-keygen -E md5 -lf keys/zapper_dillon.pub` |
| Key comment | `mymoolahftp@ip-172-31-43-145.eu-west-1.compute.internal` (AWS eu-west-1, matches source IP) | Key header |

## Inputs still nice-to-have (NOT blocking)

| Item | Status | Follow-up |
|------|--------|-----------|
| Sample mark-off CSV | Outstanding | Chased via `docs/integrations/ZAPPER_EMAIL_DRAFT_SFTP_FOLLOWUP.md` |
| Confirmed filename pattern | Outstanding | Same email |

---

## Execution order

```
1. Save Dillon's public key locally (prep)                           ✅ DONE 2026-04-21
2. Create GCS inbox directory for Zapper                             ✅ DONE 2026-04-21
3. Create firewall rule for Zapper's source IP                       ✅ DONE 2026-04-21
4. Apply sftp_path correction migration to UAT/staging/production    ✅ DONE 2026-04-21
5. Provision zapper SFTP user on sftp-1-vm                           ✅ DONE 2026-04-21 (Option B — direct SSH + DB insert, IPv6 on Mac blocked IAP)
6. End-to-end smoke test with Dillon                                 ⏳ PENDING — awaiting Dillon's test upload
7. Post-test: update AGENT_HANDOVER + CHANGELOG                      🔄 PARTIAL — done for Step 5 completion; will finalise after Step 6
```

Steps 1–5 executed non-interactively by the agent on 2026-04-21 (with André approving each gate). Step 6 requires Dillon; Step 7 (final) requires Step 6 evidence.

---

## Historical note (what actually happened vs. what we expected)

- The 2026-04-13 session log claimed migration `20260413_01` was **not yet applied** anywhere. Reality on 2026-04-21: it was already applied on UAT, staging, AND production — the session log was stale.
- Because the original seed migration had already run with the old `sftp_path = '/home/zapper'` value, we created a **forward-only follow-up migration** `20260421_01_fix_zapper_sftp_path.js` that issues an idempotent `UPDATE` to correct the value to `/home/zapper/inbox`. This is the banking-grade pattern — never edit an already-applied migration.
- The correction is cosmetic. `SFTPWatcherService` lists by `{supplier_code}/` in GCS and never reads `sftp_path` at runtime. But the DB now matches the documented SFTP drop convention and matches what we're telling Dillon.

---

## Step 1 — Save Dillon's public key ✅ DONE

File saved at `keys/zapper_dillon.pub` on 2026-04-21.

Verification (for cross-check on the gateway VM):

```bash
ssh-keygen -lf keys/zapper_dillon.pub
# Actual output on 2026-04-21:
# 2048 SHA256:EkGSJ40gqWvwpF+x1m30vB9t5duCBnU9xMUk8GA6Gl4 mymoolahftp@ip-172-31-43-145.eu-west-1.compute.internal (RSA)

ssh-keygen -E md5 -lf keys/zapper_dillon.pub
# 2048 MD5:06:87:19:ab:6b:ff:08:cd:f0:65:95:e6:34:c1:04:54 mymoolahftp@ip-172-31-43-145.eu-west-1.compute.internal (RSA)
```

> **Do not** commit the `.pub` file to git if the repo is public. If the repo is private and we've committed MobileMart/SBSA keys before, treat it consistently.

---

## Step 2 — Create GCS inbox directory for Zapper ✅ DONE

Executed 2026-04-21:

```bash
gsutil cp /dev/null gs://mymoolah-sftp-inbound/zapper/.keep
gsutil cp /dev/null gs://mymoolah-sftp-inbound/zapper/inbox/.keep
```

Current GCS state:

```
gs://mymoolah-sftp-inbound/zapper/.keep
gs://mymoolah-sftp-inbound/zapper/inbox/.keep
```

> IAM note: the bucket already grants `roles/storage.objectAdmin` to both `mymoolah-staging-sa@…` and `mymoolah-production-sa@…` (granted during SBSA onboarding). No new IAM needed.

---

## Step 3 — Firewall rule for Zapper's source IP ✅ DONE

Executed 2026-04-21:

```bash
gcloud compute firewall-rules create allow-zapper-sftp \
  --project=mymoolah-db \
  --allow=tcp:5022 \
  --source-ranges=52.213.37.176/32 \
  --target-tags=sftp-1-deployment \
  --description="Zapper SFTP access for daily mark-off files (port 5022)"
```

Verified rule (post-creation):

```
allowed:
- IPProtocol: tcp
  ports: ['5022']
description: Zapper SFTP access for daily mark-off files (port 5022)
name: allow-zapper-sftp
sourceRanges: ['52.213.37.176/32']
targetTags: ['sftp-1-deployment']
```

---

## Step 4 — sftp_path correction migration on UAT/staging/production ✅ DONE

Discovery on 2026-04-21: original seed migration `20260413_01` was already applied on all three environments, but the row had `sftp_path = /home/zapper` (the pre-fix value). Because we cannot edit an already-applied migration under banking-grade rules, we created a follow-up migration.

**Forward-only migration:** `migrations/20260421_01_fix_zapper_sftp_path.js`
- Idempotent (skips if `sftp_path` is already `/home/zapper/inbox`)
- Proper `down` that reverts to `/home/zapper`
- Only updates `recon_supplier_configs` row where `supplier_code = 'ZAPPER'`

**Applied 2026-04-21:**

```bash
./scripts/run-migrations-master.sh uat 20260421_01         # ✅ migrated (0.302s)
./scripts/run-migrations-master.sh staging 20260421_01     # ✅ migrated (0.192s)
./scripts/run-migrations-master.sh production 20260421_01  # ✅ migrated (0.189s)
```

Verified via `scripts/db-connection-helper.js` (the required helper for ALL DB access):

```
UAT:        sftp_path = /home/zapper/inbox  ✅
Staging:    sftp_path = /home/zapper/inbox  ✅
Production: sftp_path = /home/zapper/inbox  ✅
```

> **Rule:** All ad-hoc DB reads/writes during ops **must** go through `scripts/db-connection-helper.js` (`getUATClient`, `getStagingClient`, `getProductionClient`). UAT uses `.env`; staging/production pull passwords from Secret Manager (`db-mmtp-pg-staging-password`, `db-mmtp-pg-production-password`). Never hardcode passwords or use raw `psql`.

---

## Step 5 — Provision `zapper` SFTP user on the gateway VM ✅ DONE (2026-04-21)

### How it actually went (full record)

**Option A (admin UI) not attempted** — admin UI is on `https://34.35.137.166` but our current admin-SSH firewall rule (`allow-admin-ssh-2222-temp`) is scoped to the IAP range and Jarod's `169.1.133.121/32`, not the admin's browser IP. Adding a second rule for HTTPS admin would have expanded the attack surface for a one-off change.

**Option B (direct DB insert) executed** — but with a twist on the transport: **IAP was unreachable** from this Mac because `tunnel.cloudproxy.app` returns an AAAA (IPv6) record and the Mac has no IPv6 route (`Errno 51 Network unreachable` on WebSocket init). Workaround used: **temporarily added our public IPv4 `102.164.83.33/32` to `allow-admin-ssh-2222-temp`** so SSH on port 2222 works directly (IAP bypass). This follows the same IP-whitelist pattern already present on the rule for `169.1.133.121/32`. The temp /32 is logged under "Step 7 — Cleanup after Step 6" below.

### Actual inserts performed (inside one atomic transaction)

Mirrored the MobileMart precedent (user id 4) exactly. New rows on `sftp-1-vm` Postgres DB `sftpgw`:

| Table | Row |
|-------|-----|
| `users` | id=5, username=`zapper`, enabled=true, user_type=`SFTP`, password=NULL (key-only), uses_password=false, uid=904, gid=904, home_folder_id=4 |
| `folder` | id=4, parent_id=0, name=`zapper`, absolute_path=`/zapper`, cloud_connection_inherited_id=1 (→ `gs://mymoolah-sftp-inbound/zapper/`), cloud_relative_path=`/zapper` |
| `user_folder_permission` | user_id=5, folder_id=4, permission=`READ_WRITE` |
| `authorities` | user_id=5, authority=`ROLE_SFTP` |
| `public_key` | id=3, user_id=5, name=`zapper-dillon-2026-04-21`, value_len=436, enabled=true, generated=false |

Side-by-side with prior suppliers after the insert:

```
 id |   username   | enabled | user_type |     home      | authority | active_keys
----+--------------+---------+-----------+---------------+-----------+-------------
  2 | standardbank | t       | SFTP      | /standardbank | ROLE_SFTP |           1
  3 | flash        | t       | SFTP      | /flash        | ROLE_SFTP |           0
  4 | mobilemart   | t       | SFTP      | /mobilemart   | ROLE_SFTP |           1
  5 | zapper       | t       | SFTP      | /zapper       | ROLE_SFTP |           1
```

### Anti-tamper verification (both ends)

```
Local Mac:  SHA256:EkGSJ40gqWvwpF+x1m30vB9t5duCBnU9xMUk8GA6Gl4
On sftp-1-vm /tmp/zapper_dillon.pub (pre-insert, post-scp):
            SHA256:EkGSJ40gqWvwpF+x1m30vB9t5duCBnU9xMUk8GA6Gl4   ← identical
```

Staging file `/tmp/zapper_dillon.pub` was removed from the VM immediately after the insert.

### Gotcha worth remembering

The first attempt used a single `WITH ... INSERT ... RETURNING` CTE to insert user + folder + link in one statement. CTE-sibling visibility rules meant the `UPDATE users SET home_folder_id = (SELECT id FROM new_folder) WHERE id = (SELECT id FROM new_user)` saw **zero rows** because the new user wasn't yet visible to the UPDATE. Caught in the first verification `SELECT` (`home_folder_id` was NULL) and fixed immediately with a second autocommit `UPDATE` that ran after the first transaction committed. Next time: either (a) use two statements explicitly, or (b) break the UPDATE into a DO block that executes after the INSERTs, rather than chaining via CTEs.

### Reference to original Option A/B instructions

Archived in git history (prior version of this file, commit before 2026-04-21 post-execution update) in case the admin UI becomes usable later.

---

## Step 6 — End-to-end smoke test with Dillon ⏳ PENDING

### 6a. Prep

- Test fixture: `integrations/zapper/samples/zapper_markoff_TESTHANDSHAKE.csv` (1 synthetic row, R1.00).
- See `integrations/zapper/samples/README.md` for what "success" looks like at each stage.

### 6b. Ask Dillon to connect

Send Dillon a short email / Slack once steps 1–5 are done:

> "Zapper SFTP is ready — please try `sftp -P 5022 zapper@34.35.137.166` with your key, then `put` any small CSV into `inbox/`. Even a 1-row dummy is fine. Ping me when it's done."

### 6c. On our side, verify

```bash
# File landed in GCS
gsutil ls gs://mymoolah-sftp-inbound/zapper/inbox/

# Watcher logs show pickup (look for "[SFTPWatcher] New file detected")
# Depending on where the watcher runs (Cloud Run Jobs / Cloud Scheduler) tail
# the relevant Cloud Logging stream. If watcher is not yet scheduled, run a
# one-shot locally from Codespaces:
node -e "
  const S = require('./services/reconciliation/SFTPWatcherService');
  (async () => { const w = new S(); await w.checkForNewFiles(); })();
"

# After successful processing the file should be at:
#   gs://mymoolah-sftp-inbound/processed/zapper/<filename>
# On failure:
#   gs://mymoolah-sftp-inbound/failed/zapper/<filename>
```

### 6d. DB verification

```sql
-- One new ReconRun row for ZAPPER
SELECT id, supplier_id, file_hash, status, created_at
  FROM recon_runs
 WHERE supplier_id = (SELECT id FROM recon_supplier_configs WHERE supplier_code='ZAPPER')
 ORDER BY created_at DESC LIMIT 3;

-- One ReconTransaction (unmatched, because the test ZapperId has no counterpart)
SELECT status, supplier_transaction_id, supplier_amount
  FROM recon_transactions
 WHERE run_id = <run_id_from_above>;
```

Expected: `status = 'completed'` on the run, `1 unmatched` transaction for the synthetic test row. This is a good outcome — it proves the unmatched-handling path too.

---

## Step 7 — Post-execution housekeeping

### 7a. Done in this session (2026-04-21 17:00 SAST)

- [x] `docs/AGENT_HANDOVER.md` updated — new "Latest Achievement" block for Zapper SFTP user provisioning.
- [x] `docs/changelog.md` — 2026-04-21 entry added (key fingerprint, DB rows, firewall rule, gotchas).
- [x] `integrations/zapper/ZAPPER_REFERENCE.md` — status line updated (SFTP user live, pending smoke test only).
- [x] Session log `docs/session_logs/2026-04-21_1725_zapper-sftp-user-provisioned.md` created.
- [x] `docs/integrations/ZAPPER_EMAIL_DILLON_GO_LIVE.md` saved — the go-live email to Dillon, ready to send.
- [x] `.gitignore` updated to exclude `keys/` (the `.pub` key stays local — repo is public).

### 7b. Pending (after Step 6 smoke test succeeds)

- [ ] Remove temporary IP `102.164.83.33/32` from firewall rule `allow-admin-ssh-2222-temp` on `mymoolah-db` project. Exact command:
  ```bash
  gcloud compute firewall-rules update allow-admin-ssh-2222-temp \
    --project=mymoolah-db \
    --source-ranges=35.235.240.0/20,169.1.133.121/32
  ```
- [ ] Update this runbook — mark Step 6 ✅ with the actual file, landing path, watcher pickup timestamp, and recon_run row id.
- [ ] Add a second `docs/changelog.md` entry summarising the successful smoke test.
- [ ] Add a second session log summarising Dillon's test upload + reconciliation outcome.
- [ ] Tell Dillon daily cadence can start.

---

## Appendix — What the code already has in place

- Adapter: `services/reconciliation/adapters/ZapperAdapter.js` (header-based, tolerant to column reordering; parses Zapper's `"MMM D, YYYY h:mma"` date format and several fallback formats).
- Migration: `migrations/20260413_01_add_zapper_reconciliation_config.js` (seeds `recon_supplier_configs.ZAPPER` row; `sftp_path` now points at `/home/zapper/inbox`).
- Watcher: `services/reconciliation/SFTPWatcherService.js` lists everything under `{supplier_code}/` in GCS, so files dropped into `zapper/inbox/...` are picked up automatically. `sftp_path` in the DB is informational metadata only.
- Setup guide: `docs/integrations/ZAPPER_SFTP_SETUP_GUIDE.md` (generic reference).
- This runbook: step-by-step commands for the current rollout.

---

## Appendix — Why the `sftp_path` fix was cosmetic

- `SFTPWatcherService.checkForNewFiles` derives the GCS listing prefix as `supplier.supplier_code.toLowerCase() + '/'` — i.e. it calls `bucket.getFiles({ prefix: 'zapper/' })` and walks all children.
- `sftp_path` is **never read** at runtime — it's a human-readable hint stored in `recon_supplier_configs` about the remote drop path on the gateway VM.
- Originally I tried to fix this via an in-place edit to the pending seed migration (`20260413_01`). On 2026-04-21 we discovered that migration had already been applied on all three environments, so the in-place edit was reverted and a proper forward-only correction migration (`20260421_01_fix_zapper_sftp_path`) was created and applied instead.

## Appendix — DB access convention

All reconciliation ops / verification queries **must** go through `scripts/db-connection-helper.js`:

```js
const h = require('./scripts/db-connection-helper');
const c = await h.getUATClient();        // UAT  — .env
// or h.getStagingClient();               // Staging — Secret Manager db-mmtp-pg-staging-password
// or h.getProductionClient();            // Production — Secret Manager db-mmtp-pg-production-password
try {
  const { rows } = await c.query('SELECT ... FROM recon_supplier_configs WHERE supplier_code = $1', ['ZAPPER']);
} finally { c.release(); }
```

The helper auto-detects the correct Cloud SQL proxy port (6543/6544/6545) and pulls the password from the right source for the environment. Never shell out to `psql` with hardcoded passwords.
