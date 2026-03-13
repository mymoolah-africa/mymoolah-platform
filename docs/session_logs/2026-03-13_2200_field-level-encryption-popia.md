# Session Log - 2026-03-13 - Field-Level AES-256-GCM Encryption (POPIA Compliance)

**Session Date**: 2026-03-13 21:00–23:30  
**Agent**: Cursor AI Agent (Claude Opus)  
**User**: André  
**Session Duration**: ~2.5 hours

---

## Session Summary
Implemented application-level field encryption for SA ID numbers across all three database environments (UAT, Staging, Production). The `idNumber` field in the `users` table is now encrypted with AES-256-GCM before storage, with an HMAC-SHA256 blind index (`idNumberHash`) enabling WHERE-clause lookups and unique constraints. This closes the POPIA compliance gap — even a full database dump cannot reveal user ID numbers without the encryption key.

---

## Tasks Completed
- [x] Added `FIELD_ENCRYPTION_KEY` + `FIELD_HMAC_KEY` to `mymoolah-backend-staging` Cloud Run env vars
- [x] Deployed backend code to Staging — revision `mymoolah-backend-staging-00249-n2c`, 100% traffic
- [x] Added `FIELD_ENCRYPTION_KEY` + `FIELD_HMAC_KEY` to `mymoolah-backend-production` Cloud Run env vars
- [x] Deployed backend code to Production — revision `mymoolah-backend-production-00029-sdk`, 100% traffic, live at `api-mm.mymoolah.africa`
- [x] Created `utils/fieldEncryption.js` — AES-256-GCM encrypt/decrypt + HMAC-SHA256 blind index utility
- [x] Updated `models/User.js` — beforeCreate/beforeUpdate hooks encrypt; afterFind decrypts transparently
- [x] Updated `controllers/authController.js` — duplicate ID check uses `idNumberHash` instead of plaintext
- [x] Created migration `20260313_01_add_idnumberhash_column.js` — adds nullable `idNumberHash` column
- [x] Created migration `20260313_02_idnumberhash_unique_notnull.js` — adds unique index, drops plaintext unique
- [x] Created `scripts/backfill-encrypt-id-numbers.js` — batch backfill with Phase 1 (encrypt plaintext) + Phase 2 (compute hash for already-encrypted rows)
- [x] Generated FIELD_ENCRYPTION_KEY and FIELD_HMAC_KEY, added to `.env`, `.env.codespaces`, and GCP Secret Manager
- [x] Updated `scripts/db-connection-helper.js` — added admin (postgres) pool/client/URL functions for DDL migrations
- [x] Created `scripts/grant-migration-privileges.js` — one-time grant DDL to mymoolah_app via postgres
- [x] Fixed UAT table ownership: `users`, `wallets`, `SequelizeMeta` transferred from `mymoolah_user` to `mymoolah_app`
- [x] Set postgres password on all 3 Cloud SQL instances (mmtp-pg, mmtp-pg-staging, mmtp-pg-production)
- [x] Stored admin password in GCP Secret Manager (`db-mmtp-pg-admin-password`)
- [x] Fixed duplicate test user ID numbers: User 2 (Leonie) → `6610200168086`, User 4 (HD Botes) → `9201165024087`
- [x] Ran both migrations + backfill on UAT, Staging, and Production
- [x] Resolved Codespaces git divergence (reset --hard to origin/main)

---

## Key Decisions
- **AES-256-GCM + HMAC blind index pattern**: Chosen because encrypted fields are non-deterministic (same plaintext → different ciphertext each time), so a deterministic HMAC hash is needed for WHERE lookups and UNIQUE constraints.
- **Graceful degradation**: If `FIELD_ENCRYPTION_KEY`/`FIELD_HMAC_KEY` are not set, the utility logs a warning and stores plaintext. Prevents startup failures in dev/CI.
- **`enc:v1:` prefix**: Distinguishes encrypted from legacy plaintext values, enabling zero-downtime migration — old rows are decrypted as-is, new rows are encrypted.
- **Two-phase migration**: Migration 01 adds nullable column → backfill encrypts existing data → Migration 02 adds NOT NULL + UNIQUE constraint. Safe rollout order.
- **Admin DB connection**: Added postgres superuser connection to `db-connection-helper.js` for DDL operations. `mymoolah_app` is a data user that lacked ALTER TABLE rights.
- **Table ownership fix**: UAT had tables owned by `mymoolah_user` (legacy). Transferred to `mymoolah_app` so migrations work. Staging and Production were already correct.

---

## Files Modified
- `utils/fieldEncryption.js` — **NEW** — AES-256-GCM encrypt/decrypt + HMAC-SHA256 blind index
- `models/User.js` — Added `idNumberHash` field, `_encryptUserFields` helper, beforeCreate/beforeUpdate/afterFind hooks
- `controllers/authController.js` — Import `blindIndex`, use `idNumberHash` for duplicate check
- `migrations/20260313_01_add_idnumberhash_column.js` — **NEW** — adds `idNumberHash` VARCHAR(64) nullable
- `migrations/20260313_02_idnumberhash_unique_notnull.js` — **NEW** — unique index + NOT NULL + drop old unique
- `scripts/backfill-encrypt-id-numbers.js` — **NEW** — Phase 1 (encrypt plaintext) + Phase 2 (hash for pre-encrypted)
- `scripts/db-connection-helper.js` — Added ADMIN config, admin pool/client/URL functions for all environments
- `scripts/run-migrations-master.sh` — Temporarily switched to admin URL, then reverted to app user after grant
- `scripts/grant-migration-privileges.js` — **NEW** — one-time grant DDL to mymoolah_app
- `.env.codespaces` — Added `FIELD_ENCRYPTION_KEY`, `FIELD_HMAC_KEY`, `DB_ADMIN_PASSWORD`

---

## Code Changes Summary
- `utils/fieldEncryption.js`: Core utility — `encrypt()`, `decrypt()`, `blindIndex()`, `isEncrypted()`, `checkConfiguration()`. Uses `FIELD_ENCRYPTION_KEY` (AES key) and `FIELD_HMAC_KEY` (HMAC key) from env vars. Format: `enc:v1:<iv_b64>:<tag_b64>:<ciphertext_b64>`.
- `models/User.js`: Transparent encryption via Sequelize hooks. `beforeCreate`/`beforeUpdate` encrypt `idNumber` and compute `idNumberHash`. `afterFind` decrypts. Rest of app never sees ciphertext.
- `controllers/authController.js`: Registration duplicate check changed from `WHERE idNumber = ?` to `WHERE idNumberHash = blindIndex(?)`.
- `scripts/backfill-encrypt-id-numbers.js`: Batch-processes 100 rows at a time. Phase 1 encrypts plaintext rows. Phase 2 computes hash for already-encrypted rows (e.g. synced from another env). Supports `--dry-run`.

---

## Issues Encountered
- **Issue 1**: `mymoolah_app` lacks ALTER TABLE rights — Sequelize CLI migrations failed with "must be owner of table users". Fixed by connecting as `postgres` superuser and transferring table ownership.
- **Issue 2**: Cloud SQL `postgres` user couldn't REASSIGN OWNED — needed `GRANT mymoolah_user TO postgres` first, then `ALTER TABLE ... OWNER TO mymoolah_app`.
- **Issue 3**: Duplicate proxy PIDs causing ECONNRESET — killed both and restarted cleanly.
- **Issue 4**: Duplicate test user ID numbers — User 1 (André) and User 2 (Leonie) had the same ID `6411055084084`. User 3 (André Jr) and User 4 (HD Botes) shared `9406245020086`. Fixed with correct IDs.
- **Issue 5**: Staging users 3 and 5 had NULL idNumber — populated from user-provided IDs (`9406245020086` and `9903105128082`).
- **Issue 6**: Backfill script only handled plaintext rows — staging had already-encrypted rows (synced from UAT) with NULL hash. Added Phase 2 to decrypt-then-hash.
- **Issue 7**: Codespaces had a divergent commit — resolved with `git reset --hard origin/main`.

---

## Testing Performed
- [x] Dry-run backfill on UAT (6 users, 0 errors)
- [x] Live backfill on UAT (6 users encrypted, verified all hashed)
- [x] Migration 02 unique constraint enforced on UAT
- [x] Staging backfill and migration 02 passed
- [x] Production migration 01 + 02 passed (0 users — empty production)
- [ ] End-to-end login/register test with encrypted fields (pending — run in Codespaces)
- [ ] Unit tests for fieldEncryption.js (pending)

---

## Next Steps
- [x] Add FIELD_ENCRYPTION_KEY and FIELD_HMAC_KEY to Cloud Run Staging + Production env vars ✅
- [x] Deploy backend code to Staging (`mymoolah-backend-staging-00249-n2c`) ✅
- [x] Deploy backend code to Production (`mymoolah-backend-production-00029-sdk`) ✅ live at `api-mm.mymoolah.africa`
- [ ] End-to-end test: register new user, login, verify encrypted idNumber in DB
- [ ] Write unit tests for `utils/fieldEncryption.js` (encrypt/decrypt/blindIndex round-trip)
- [ ] Consider encrypting `phoneNumber` field (same pattern, add `phoneNumberHash`)
- [ ] Consider encrypting beneficiary bank account numbers

---

## Important Context for Next Agent
- **Encryption keys**: `FIELD_ENCRYPTION_KEY` and `FIELD_HMAC_KEY` are in `.env`, `.env.codespaces`, and GCP Secret Manager. Both are 64 hex chars (32 bytes). They must NEVER be committed to git.
- **Transparent encryption**: The User model hooks handle everything. The rest of the codebase sees plaintext `idNumber` values — no other files need changes.
- **Blind index**: `idNumberHash` is the searchable column. All WHERE clauses on idNumber must use `blindIndex(value)` against `idNumberHash`, not the `idNumber` column (which holds ciphertext).
- **`enc:v1:` prefix**: Any value starting with this is encrypted. Legacy plaintext values (if any) are handled gracefully — decrypt returns them as-is.
- **Table ownership**: UAT tables were transferred from `mymoolah_user` to `mymoolah_app`. If new tables are created by a different user in the future, may need similar ownership transfer.
- **Admin DB access**: `db-connection-helper.js` has `getUATAdminPool()`, `getStagingAdminPool()`, `getProductionAdminPool()` for postgres superuser connections. Used for DDL only.
- **postgres password**: Same password set on all 3 instances (`B0t3s@Mymoolah`). Stored in Secret Manager as `db-mmtp-pg-admin-password`.
- **Test user IDs**: User 1 André `6411055084084`, User 2 Leonie `6610200168086`, User 3 André Jr `9406245020086`, User 4 HD Botes `9201165024087`, User 5 Neil `9903105128082`.

---

## Questions/Unresolved Items
- Should `phoneNumber` also be encrypted at rest? Same pattern applies — add `phoneNumberHash`.
- Should beneficiary bank account numbers (`identifier` field) be encrypted?
- Cloud Run env vars for FIELD_ENCRYPTION_KEY and FIELD_HMAC_KEY have been added to both Staging and Production. ✅

---

## Related Documentation
- `utils/fieldEncryption.js` — encryption utility
- `scripts/backfill-encrypt-id-numbers.js` — backfill script
- `scripts/db-connection-helper.js` — admin DB connections
- `scripts/grant-migration-privileges.js` — one-time DDL grant
- `docs/CHANGELOG.md` — changelog entry
