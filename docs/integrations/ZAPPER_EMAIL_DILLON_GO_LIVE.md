# Email — Zapper SFTP: Go-Live + Test-File Handshake Request

**Date sent:** 2026-04-21 (draft ready to send)
**From:** Andre Botes <andre@mymoolah.africa>
**To:** Dillon Poultney <Dillon.Poultney@zapper.com>
**CC:** Sarah-Lee Fortuin <sarahlee.ruiters@zapper.com>, Melissa Murray <melissa.murray@zapper.com>, Eric Herr <eric.herr@zapper.com>
**Subject:** Zapper SFTP — you're cleared to connect (test-file handshake request)
**Attachment:** `integrations/zapper/samples/zapper_markoff_TESTHANDSHAKE.csv`

---

## Context

This email is the go-live note to Dillon after the full SFTP user provisioning completed on 2026-04-21.

- SFTP Gateway user `zapper` created on `sftp-1-vm` (Thorntech gateway), id=5, home_folder=/zapper, role=ROLE_SFTP, enabled=true. `home_folder_id = 4`, uid/gid 904.
- Folder `/zapper` created, inherits cloud_connection 1 → `gs://mymoolah-sftp-inbound/zapper/`.
- `user_folder_permission` user 5 → folder 4 → `READ_WRITE`.
- `authorities` user 5 → `ROLE_SFTP`.
- `public_key` row id=3 — name=`zapper-dillon-2026-04-21`, enabled=true, fingerprint `SHA256:EkGSJ40gqWvwpF+x1m30vB9t5duCBnU9xMUk8GA6Gl4` (2048-bit RSA, provided by Dillon 2026-04-17).
- Firewall rule `allow-zapper-sftp` on `tcp:5022` scoped to Zapper's source IP `52.213.37.176/32` (created 2026-04-21).

The email asks Dillon to run a simple end-to-end SFTP handshake using the attached 1-row synthetic CSV, renamed to match the production filename pattern so the watcher picks it up automatically.

---

COPY BELOW THIS LINE:

---

Hi Dillon,

Good news — everything on our side is provisioned and you're cleared to connect. A quick summary of what's now in place, followed by a simple test-file handshake request.

1. WHAT'S LIVE

   - SFTP user `zapper` has been created on our gateway.
   - Your public key is loaded against that user — fingerprint SHA256:EkGSJ40gqWvwpF+x1m30vB9t5duCBnU9xMUk8GA6Gl4 (please confirm this matches the private key you'll be connecting with).
   - Your source IP 52.213.37.176 is whitelisted on our SFTP firewall rule.
   - Landing folder /zapper/inbox/ is ready on our side.

2. CONNECTION DETAILS

   Host:     34.35.137.166
   Port:     5022
   User:     zapper
   Auth:     SSH public-key (the key you sent us)
   Upload to: /zapper/inbox/

   Example (OpenSSH):
       sftp -P 5022 -i /path/to/your/private_key zapper@34.35.137.166
       sftp> cd inbox
       sftp> put zapper_markoff_20260422.csv
       sftp> quit

3. TEST-FILE HANDSHAKE — PLEASE RUN WHEN CONVENIENT

   I've attached a 1-row synthetic CSV (zapper_markoff_TESTHANDSHAKE.csv) built against the column structure Sarah-Lee shared in the January recon extract. It's purely there to prove the full pipeline works end-to-end before real daily files start flowing.

   Two small requests:

     (a) Please RENAME the attached file to   zapper_markoff_20260422.csv   before uploading. This matches the production filename pattern zapper_markoff_YYYYMMDD.csv that our watcher expects — so the test exercises the exact same code path a real production drop will take.

     (b) Upload it to /zapper/inbox/ on the host above.

   Once it lands I'll confirm on our side that:
     - the SFTP authentication succeeded,
     - the file arrived in our inbound storage,
     - our parser read all 11 columns cleanly (1 transaction, R1.00 total),
     - the row is correctly flagged as unmatched (expected — it's synthetic test data).

   I'll come back to you within an hour or so of the upload with the green-light confirmation (or, if anything misbehaves, exactly what I'm seeing so we can fix it together).

4. TWO NICE-TO-HAVES — NOT BLOCKERS FOR THE TEST

   (i)  Sample production file: once the synthetic handshake above is green, if you could share even one real day's mark-off file (any day, sanitised if you prefer) it lets us do a final sanity-check against live data. If a sample isn't readily to hand, we're comfortable going live off the Sarah-Lee structure and iterating if anything surprises us on the first production drop.

   (ii) Filename convention: we've defaulted our watcher to  zapper_markoff_YYYYMMDD.csv.  Please confirm that matches what your system will actually produce — or if it'll be something else (e.g. ZapperMarkoff_YYYY-MM-DD.csv, embedded timestamps, etc.). A one-liner back is enough; we can adjust the pattern to match whatever you produce.

No rush on any of this — whatever fits your schedule. Just let me know once you've uploaded the test file and I'll pick it up from there.

Best regards,

Andre Botes
andre@mymoolah.africa
www.mymoolah.africa

---

## Security note (internal)

The fingerprint `SHA256:EkGSJ40gqWvwpF+x1m30vB9t5duCBnU9xMUk8GA6Gl4` is a one-way hash, not the key itself. It is safe to send in email — it serves as a mutual-verification anchor (Dillon can re-compute it from his key and confirm we loaded the right one). The private key never leaves Dillon's machine; only he has it.
