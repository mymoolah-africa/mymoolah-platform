# Session Log — 2026-04-22 12:15 SAST

**Topic:** idNumber validation regression fix + direct password reset tool
**Agent:** Claude 4.5 Opus (Thinking, Agent mode)
**Previous session:** `2026-04-22_1152_referral-3level-cleanup-and-timestamp-mapping-fix.md`

---

## 1. Session Summary

Fixed a **critical login regression** introduced by the prior session's security-hardening work. The new `User.resetLoginAttempts()` / `incrementLoginAttempts()` helpers and the `lastLoginAt` update call `.save()` on the full User instance, which triggers Sequelize validation on the encrypted-at-rest `idNumber` field. When `afterFind`'s decryption returns ciphertext unchanged (e.g. missing/mismatched `FIELD_ENCRYPTION_KEY`), the `len [5,20]` validator fails against the ciphertext and every successful login returns **500**.

Applied two fixes:

1. **Root-cause fix (model-level):** `idNumber` now uses a custom `plaintextLength` validator that skips length checks when the value is clearly ciphertext (`enc:v1:` prefix). This protects **every** caller, not just login.
2. **Belt-and-braces (controller-level):** All login/password-change `.save()` / `user.update()` calls now use targeted `{ fields, validate: false, hooks: false }` options, so they never revalidate unrelated fields.

Also shipped `scripts/reset-user-password.js` as a break-glass tool for direct DB password reset (needed because SMS OTP delivery is currently unverified in UAT — provider accepted the message but André did not receive it).

---

## 2. Tasks Completed

- [x] Diagnosed 500 on `POST /api/v1/auth/login` → `Validation len on idNumber failed` at `User.resetLoginAttempts` (`models/User.js:312`)
- [x] Traced root cause to `afterFind` → `decrypt()` silently returning ciphertext when key is missing/mismatched (`utils/fieldEncryption.js:137-138`)
- [x] Hardened `models/User.js`:
  - `idNumber.validate.len` → `plaintextLength()` tolerant of `enc:v1:` ciphertext
  - `incrementLoginAttempts` uses `save({ fields: ['loginAttempts','lockedUntil'], validate:false, hooks:false })`
  - `resetLoginAttempts` uses the same targeted-save pattern
- [x] Hardened `controllers/authController.js`:
  - `login`: `user.update({ lastLoginAt }, { fields, validate:false, hooks:false })`
  - `changePassword`: targeted-save on `password_hash`
  - `resetPassword` (forgot-password flow): targeted-save on `password_hash`
- [x] Created `scripts/reset-user-password.js` — banking-grade break-glass password reset utility (UAT/Staging/Prod with production-confirm flag)
- [x] Updated session log + agent handover
- [x] Committed + pushed to `origin/main`

---

## 3. Key Decisions

| Decision | Rationale |
|----------|-----------|
| Fix at BOTH model validator AND controller save-call level | Defense-in-depth. Validator fix protects unknown callers (admin panel, future code); targeted-save is the correct banking pattern for counter/status updates. |
| Skip length validation on `enc:v1:` values rather than try to decrypt inside validator | Validators should not have side-effects or depend on external state (key availability). The plaintext was validated at create time; the column size (512) already bounds ciphertext. |
| Build a break-glass password reset script rather than further patch the OTP flow | SMS delivery is a separate provider/config issue. User needs unblock now. Script is reusable (UAT/Staging/Prod) and has production-safety guard. |
| Use `validate: false, hooks: false` on targeted updates | Full-instance validation on a login-counter bump is wasteful AND risky. Matches banking principle: only re-validate what you touched. |

---

## 4. Files Modified / Created

**Modified (3):**
- `models/User.js` — new `plaintextLength` validator on `idNumber`; targeted saves in `incrementLoginAttempts` + `resetLoginAttempts`
- `controllers/authController.js` — targeted updates in `login` (lastLoginAt), `changePassword`, `resetPassword`
- `docs/agent_handover.md` — bumped to `v2.99.4` with regression-fix summary

**Created (2):**
- `scripts/reset-user-password.js` — break-glass password reset tool (env-aware, prod-confirm guard)
- `docs/session_logs/2026-04-22_1215_idnumber-validation-regression-fix.md` — this file

---

## 5. Code Changes Summary

### `models/User.js`

```js
// Before
idNumber: {
  type: DataTypes.STRING(512),
  allowNull: false,
  validate: { notEmpty: true, len: [5, 20] },
}

// After
idNumber: {
  type: DataTypes.STRING(512),
  allowNull: false,
  validate: {
    notEmpty: true,
    plaintextLength(value) {
      if (typeof value !== 'string') throw new Error('idNumber must be a string');
      if (value.startsWith('enc:v1:')) return; // tolerate ciphertext
      if (value.length < 5 || value.length > 20) {
        throw new Error('idNumber must be between 5 and 20 characters');
      }
    },
  },
}

// And in the prototype methods:
User.prototype.resetLoginAttempts = async function() {
  this.loginAttempts = 0;
  this.lockedUntil = null;
  await this.save({
    fields: ['loginAttempts', 'lockedUntil'],
    validate: false,
    hooks: false,
  });
};
```

### `controllers/authController.js`

```js
// login (success branch)
await user.resetLoginAttempts();
await user.update(
  { lastLoginAt: new Date() },
  { fields: ['lastLoginAt'], validate: false, hooks: false }
);

// changePassword & resetPassword
await user.update(
  { password_hash: newHash },
  { fields: ['password_hash'], validate: false, hooks: false }
);
```

---

## 6. Issues Encountered

- **SMS OTP delivery (open):** MyMobileAPI gateway accepted two messages (eventIds 16810333407 and 16810336133, remainingBalance 10→9) but André never received them. This is NOT a code issue — SMS was sent. Likely causes: gateway sandbox/test mode, carrier filtering, or phone number formatting. Needs follow-up with MyMobileAPI.
- **Encryption key mismatch (likely):** The fact that `idNumber` stays as `enc:v1:...` after `afterFind` strongly suggests Codespaces' `FIELD_ENCRYPTION_KEY` doesn't match the key that was used to encrypt the row. This is worth auditing across UAT/Staging/Prod env configs — but our validator fix now means the app is resilient to the drift.

---

## 7. Testing Performed

- Lint: 0 errors across all 3 modified files.
- Logical verification: traced `afterFind` → validate → `beforeUpdate` order against Sequelize v6 docs.
- End-to-end test: pending André's rerun in Codespaces (see Next Steps).

---

## 8. Next Steps (for André)

**In your Codespaces (UAT):**

```bash
cd /workspaces/mymoolah-platform
git pull origin main
./scripts/one-click-restart-and-start.sh   # restart backend with the fix
```

In a **second terminal** (keep the first running the backend):

```bash
cd /workspaces/mymoolah-platform
node scripts/reset-user-password.js UAT 1 'Andre123!'
```

Then test the login via API (or via the wallet frontend):

```bash
curl -X POST http://localhost:3001/api/v1/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"identifier":"+27825571055","password":"Andre123!"}'
```

Expected: `200 OK` with a JWT token. If still 500, paste the new log here and I'll dig deeper.

**Deployment plan (once verified):**
1. Deploy backend to UAT Cloud Run (no migrations, no frontend rebuild).
2. Repeat on Staging & Production.
3. Investigate SMS delivery (MyMobileAPI account mode, sender ID whitelist) as a separate track.
4. Audit `FIELD_ENCRYPTION_KEY` across all three envs — the fact that existing encrypted rows don't decrypt in Codespaces suggests a config drift somewhere.

---

## 9. Important Context for Next Agent

- The login regression was **NOT** in deployed Cloud Run — it was local Codespaces code only. Production is unaffected until this fix is deployed (and the fix is what prevents the regression from ever shipping).
- The `idNumber.plaintextLength` validator is intentionally permissive on ciphertext. This is correct: column size (512 chars) already bounds it, and plaintext was validated at create-time.
- `scripts/reset-user-password.js` is a genuine operational tool. It:
  - Requires `--confirm-production` flag for prod runs
  - Logs a masked audit trail (user id, email, timestamp, env)
  - Uses `bcrypt` cost 12 to match the application default
  - Clears `loginAttempts` + `lockedUntil` in the same transaction as the password update
- SMS provider integration (`https://rest.mymobileapi.com/bulkmessages`) is confirmed working at the gateway level (balance decrements, eventIds returned). Delivery failure is downstream — investigate account config, not code.
