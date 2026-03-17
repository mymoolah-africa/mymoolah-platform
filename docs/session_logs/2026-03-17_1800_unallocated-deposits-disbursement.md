# Session Log — 2026-03-17 18:00 — Unallocated Deposits & Wage Disbursement

## Session Summary
Implemented all 5 items from the pending task list in one session:
1. Suspense account for unallocated SBSA deposits
2. Add Money via EFT wallet overlay
3. Fuzzy MSISDN matching
4. Admin portal Unallocated Deposits screen
5. Full SBSA H2H Wage/Salary Disbursement feature

## Tasks Completed

### 1. Suspense Account — `services/standardbankDepositNotificationService.js`
- When `resolveReference()` returns null (no wallet or float matches the deposit reference):
  - Creates `StandardBankTransaction` with `accountType: 'unallocated'`, `status: 'pending'`
  - Posts a double-entry to suspense ledger (DEBIT bank `1100-01-01`, CREDIT unallocated `2600-01-01`)
  - Sends ops alert email via `AlertService` (graceful no-op if SMTP not configured)
  - Returns `{ success: true, credited: 'suspense' }` — SBSA gets HTTP 200 (prevents retries)
- New env var: `LEDGER_ACCOUNT_UNALLOCATED=2600-01-01`, `OPS_ALERT_EMAIL=ops@mymoolah.africa`

### 2. Fuzzy MSISDN Matching — `services/standardbankDepositNotificationService.js`
- Phase 3 resolution (after exact + float prefix lookup):
  - `buildFuzzyMsisdnVariants()` generates up to 30 candidate E.164 numbers
  - Handles: formatting noise (stripped digits), missing leading zero, adjacent-digit transpositions
  - Logs `fuzzyMatch: true` + original ref when a fuzzy match is found
- `lookupWalletByE164()` extracted as a reusable helper to avoid duplicate DB queries

### 3. Add Money via EFT — `mymoolah-wallet-frontend/components/overlays/AddMoneyEftOverlay.tsx`
- New wallet overlay at route `/add-money-eft`
- Shows MM SBSA bank account details (env vars: `VITE_MM_BANK_NAME`, `VITE_MM_BANK_ACCOUNT`, `VITE_MM_BANK_BRANCH_CODE`, `VITE_MM_BANK_ACCOUNT_TYPE`, `VITE_MM_ACCOUNT_HOLDER`)
- Pre-fills the user's registered mobile number as the mandatory payment reference
- Copy-to-clipboard buttons for account number, branch code, and reference
- Step-by-step guide (5 steps) + disclaimer about processing times
- Registered in `components/overlays/index.ts` and `App.tsx`

### 4. Admin Portal — Unallocated Deposits Screen
**Backend:**
- `GET /api/v1/admin/unallocated-deposits` — list with pagination + summary (total pending amount)
- `POST /api/v1/admin/unallocated-deposits/:id/allocate` — manual allocation by mobile number
  - Calls `processDepositNotification` with corrected mobile number
  - Marks original record as `completed`
  - Body: `{ mobileNumber, notes? }`

**Frontend:**
- `portal/admin/frontend/src/components/admin-overlays/UnallocatedDepositsOverlay.tsx`
- Status filter (pending/completed/all), pagination, refresh button
- "Allocate →" button opens a modal to enter correct mobile number + notes
- Shows total pending amount in a red KPI banner
- Added to portal navigation and `RouteConfig.tsx` at `/admin/unallocated-deposits`

### 5. Wage/Salary Disbursement — Full Implementation

**Database:**
- `migrations/20260317_create_disbursement_tables.js` — creates `disbursement_runs` + `disbursement_payments`
- `models/DisbursementRun.js`, `models/DisbursementPayment.js`

**Backend Services:**
- `services/standardbank/pain001BulkBuilder.js` — ISO 20022 Pain.001.001.09 XML for bulk EFT/RTC
- `services/standardbank/pain002Parser.js` — lightweight regex-based Pain.002 XML parser
- `services/standardbank/disbursementService.js` — core business logic:
  - `createRun()` — maker creates run, bulk-creates payment records
  - `submitForApproval()` — maker submits
  - `approveRun()` — checker approves → builds Pain.001 → uploads to SBSA SFTP (graceful fallback to `/tmp`)
  - `rejectRun()` — checker rejects (returns to draft)
  - `processPain002Response()` — SFTP poller calls this; updates payment statuses + run counts; fires notification
  - `resubmitFailed()` — creates new run for rejected payments (linked via `retry_of`)
- `services/standardbank/disbursementNotificationService.js`:
  - Channel 1: Webhook POST (HMAC-SHA256 signed if `DISBURSEMENT_WEBHOOK_SECRET` set)
  - Channel 2: HTML email report with failure table + "Fix Failed Payments" link
  - Channel 3: SFTP results CSV (framework in place, implementation pending SFTP H2H)
- `controllers/disbursementController.js`, `routes/disbursement.js`
  - Mounted at `/api/v1/disbursements`
  - Full validation with `express-validator`
  - Rate limited (standard + strict)

**Portal Frontend:**
- `DisbursementRunsOverlay.tsx` — lists all runs, status badges, KPIs, pagination
- `CreateDisbursementRunOverlay.tsx` — CSV upload (parses header row) or manual row-by-row entry; sends for approval on submit
- `DisbursementRunDetailOverlay.tsx` — full payment table, approve/reject (checker, 4-eyes), resubmit failed with inline correction inputs
- All three registered in `RouteConfig.tsx` and linked from portal nav

## Key Decisions
1. **Suspense returns HTTP 200**: SBSA should not retry failed notifications. We accept all deposits and park them for manual resolution.
2. **Fuzzy matching is done in app (not DB)**: generates ≤30 variants per reference and tries each. Acceptable for rare unresolved deposits.
3. **Pain.001 graceful SFTP fallback**: If SFTP H2H is not yet live, the XML is written to `/tmp` and logged for manual upload. No blocking error.
4. **Checker cannot approve own run**: Enforced at service layer (`maker_user_id !== checkerUserId`).
5. **Resubmission creates a new run**: Original run with `partial` status is immutable. Retries are a new run linked via `retry_of`.
6. **Admin portal uses its own JWT**: Portal backend calls `portalAuth('admin')` for all admin routes.

## Files Modified
- `services/standardbankDepositNotificationService.js` — major rewrite (fuzzy + suspense)
- `services/standardbank/pain001BulkBuilder.js` — NEW
- `services/standardbank/pain002Parser.js` — NEW
- `services/standardbank/disbursementService.js` — NEW
- `services/standardbank/disbursementNotificationService.js` — NEW
- `controllers/disbursementController.js` — NEW
- `routes/disbursement.js` — NEW
- `migrations/20260317_create_disbursement_tables.js` — NEW
- `models/DisbursementRun.js` — NEW
- `models/DisbursementPayment.js` — NEW
- `server.js` — added disbursement route registration
- `mymoolah-wallet-frontend/components/overlays/AddMoneyEftOverlay.tsx` — NEW
- `mymoolah-wallet-frontend/components/overlays/index.ts` — added export
- `mymoolah-wallet-frontend/App.tsx` — added /add-money-eft route
- `mymoolah-wallet-frontend/.env.local` — added VITE_MM_BANK_* env vars
- `portal/backend/controllers/adminController.js` — added getUnallocatedDeposits + allocateDeposit
- `portal/backend/routes/admin.js` — added unallocated deposits routes
- `portal/admin/frontend/src/components/admin-overlays/UnallocatedDepositsOverlay.tsx` — NEW
- `portal/admin/frontend/src/components/admin-overlays/DisbursementRunsOverlay.tsx` — NEW
- `portal/admin/frontend/src/components/admin-overlays/CreateDisbursementRunOverlay.tsx` — NEW
- `portal/admin/frontend/src/components/admin-overlays/DisbursementRunDetailOverlay.tsx` — NEW
- `portal/admin/frontend/src/components/routing/RouteConfig.tsx` — added all new routes
- `portal/admin/frontend/src/components/layout/AppLayoutWrapper.tsx` — added nav links
- `.env.codespaces` — added LEDGER_ACCOUNT_UNALLOCATED, OPS_ALERT_EMAIL, DISBURSEMENT_WEBHOOK_SECRET, PORTAL_URL

## Next Steps / Pending Actions
1. **Run migration**: `npx sequelize-cli db:migrate` on staging/prod to create disbursement tables
2. **Update `.env.local` and Secret Manager**: Set real bank account number in `VITE_MM_BANK_ACCOUNT`
3. **SFTP H2H go-live prerequisite**: `services/standardbank/sbsaSftpClientService.js` must be live before disbursement approval triggers real SFTP upload (graceful fallback to `/tmp` currently)
4. **SBSA Pain.002 file format**: Confirm exact XML structure with SBSA/Colette before Pain.002 parser is used in production
5. **Unallocated deposit ledger account**: Create `2600-01-01` in `ledger_accounts` table if it doesn't exist
6. **Wallet frontend bank details**: Update `VITE_MM_BANK_ACCOUNT` with real MM SBSA account number
7. **Test the allocate endpoint**: Simulate a deposit with wrong reference and verify suspense posting + manual allocation
8. **Disbursement notification webhook**: Set `DISBURSEMENT_WEBHOOK_SECRET` for HMAC signing

## Restart Requirements
- Main backend: restart required (new route `disbursement.js` registered in `server.js`)
- Portal backend: restart required (new admin routes)
- Wallet frontend: rebuild required (new overlay and route)
- Portal frontend: rebuild required (new overlays and routes)
