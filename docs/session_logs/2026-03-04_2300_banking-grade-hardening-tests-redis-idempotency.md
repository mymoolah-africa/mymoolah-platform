# Session Log: Banking-Grade Hardening — Tests, Redis Idempotency, Frontend Keys, OCR

**Date**: 2026-03-04 23:00  
**Agent**: Cursor (Claude 4.6 Opus)  
**Duration**: ~1 hour  
**Trigger**: User requested implementation of Items 1-4 from Claude codebase review

---

## Summary

Implemented four banking-grade hardening improvements based on a Claude code review
of the MyMoolah codebase. Also updated all 15 agent skill files for project alignment.

---

## Tasks Completed

### 1. Agent Skill Files Updated (15 files)
- Updated all `.agents/skills/*/SKILL.md` files with MyMoolah-specific context
- `robust-financial-forms`: Full rewrite for overlay architecture awareness
- All skills now reference actual codebase patterns, file locations, and current state

### 2. Test Infrastructure Created (Item 1)
- Installed `jest`, `supertest`, `nock` as devDependencies
- Created `jest.config.js` configuration
- Added `npm test` and `npm test:watch` scripts to `package.json`
- Created test helper: `tests/helpers/testSetup.js` (user creation, wallet seeding, JWT generation, `assertLedgerBalanced`)
- Created test suites:
  - `tests/wallet-send.test.js` — 8 tests (transfer, insufficient balance, idempotency double-submit, concurrent race condition, auth, validation)
  - `tests/easypay-webhook.test.js` — 4 tests (payment notification, unknown reference, duplicate handling, billpayment route)
  - `tests/flash-purchase.test.js` — 5 tests (auth, missing fields, zero/negative amounts)
  - `tests/idempotency-middleware.test.js` — 5 tests (pass-through, empty key, new key, duplicate key, key conflict)

### 3. Redis Idempotency Layer (Item 2)
- Enhanced `middleware/idempotency.js` from v1.0 to v2.0
- Added Redis as L1 fast-path cache before PostgreSQL L2 lookup
- Redis `SET NX` marks new keys as "processing" atomically
- Successful responses cached in both Redis (fast) and PostgreSQL (durable)
- Failed responses trigger Redis key deletion (allow retry)
- Graceful degradation: if Redis is unavailable, falls back to PostgreSQL-only
- "Processing" state returns 409 instantly for concurrent duplicate requests

### 4. Frontend Idempotency Keys (Item 3)
- Added `generateIdempotencyKey()` utility to `apiService.ts`
- Added `X-Idempotency-Key` header to ALL financial mutation methods:
  - `sendWalletToWallet`, `initiateTransfer`
  - `purchaseAirtimeVoucher`, `purchaseAirtimeTopUp`, `purchaseEeziAirtime`
  - `purchaseEeziToken` (was sending in body only, now also in header)
  - `initiateQRPayment`, `confirmQRPayment`
  - `purchaseVoucher` (general product purchase)

### 5. Sharp OCR Preprocessing (Item 4)
- Updated `kycService.js` `runTesseractOCR()` method
- Added `sharp` preprocessing before Tesseract: resize (1500px max), grayscale, normalize
- Reduces memory consumption and improves OCR accuracy on large ID photos
- `sharp` was already installed in the project

### 6. Scaling Prep Reminder
- Created `docs/TODO_SCALING_PREP.md` with due date 2026-03-11
- Documents Items 5 (cron extraction) and 6 (Redis wallet locks)
- Clearly states these are required before horizontal scaling

---

## Files Modified

| File | Change |
|------|--------|
| `.agents/skills/*/SKILL.md` (15 files) | Project-specific context and alignment |
| `package.json` | Added test scripts, jest/supertest/nock devDeps |
| `jest.config.js` | New: Jest configuration |
| `tests/helpers/testSetup.js` | New: shared test utilities |
| `tests/wallet-send.test.js` | New: wallet send integration tests |
| `tests/easypay-webhook.test.js` | New: EasyPay webhook tests |
| `tests/flash-purchase.test.js` | New: Flash purchase tests |
| `tests/idempotency-middleware.test.js` | New: idempotency middleware unit tests |
| `middleware/idempotency.js` | Redis L1 cache layer added (v1 → v2) |
| `mymoolah-wallet-frontend/services/apiService.ts` | X-Idempotency-Key on all financial mutations |
| `services/kycService.js` | sharp preprocessing in Tesseract OCR fallback |
| `docs/TODO_SCALING_PREP.md` | New: scaling prep reminder (due 2026-03-11) |

---

## Key Decisions

1. **Redis is optional**: The idempotency middleware degrades gracefully to PostgreSQL-only when Redis is not configured. No deployment change required.
2. **Tests use real models**: Integration tests import from `models/` and use Sequelize directly, matching the actual production code paths.
3. **Frontend idempotency keys are per-call**: Each API call generates a fresh key. For retry scenarios, the overlay would need to manage key persistence (documented in skill file).
4. **Tesseract Worker Threads not added**: `tesseract.js` v5 already uses internal WASM workers. Adding Node.js Worker Threads would be over-engineering.

---

## Testing Instructions

Run tests (requires database connection):
```bash
npm test
```

Run specific test suite:
```bash
npx jest tests/wallet-send.test.js --runInBand
npx jest tests/idempotency-middleware.test.js --runInBand
```

---

## Next Steps (Items 5-6, due 2026-03-11)

See `docs/TODO_SCALING_PREP.md`:
- Extract cron jobs from `server.js` into dedicated files with Redis locks
- Add Redis locks on wallet mutation controllers

---

## Context for Next Agent

- All 15 skill files have been updated — they now contain MyMoolah-specific context
- The idempotency middleware is now v2 with Redis support
- Frontend `apiService.ts` now sends `X-Idempotency-Key` on all financial mutations
- Test infrastructure is set up — future features should include tests
- `docs/TODO_SCALING_PREP.md` has items due 2026-03-11
