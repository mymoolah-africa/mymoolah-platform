# SBSA H2H Wage Disbursement — Implementation Plan

**Date**: 2026-03-17  
**Status**: PLANNED — Not yet in development. Execute after Phase 2 (SFTP H2H) is stable and Melissa (SBSA) has signed on.  
**Rail**: EFT (primary) / RTC (urgent payments) via SBSA H2H SFTP Push/Pull  
**Portal**: Admin portal only — not exposed on wallet  
**Dependencies**: `docs/SBSA_H2H_SETUP_GUIDE.md`, `integrations/standardbank/builders/pain001Builder.js`

---

## Overview

Employers log into the MyMoolah admin portal, upload a payroll file (or build one in the UI), and disburse wages/salaries to employees' bank accounts or MyMoolah wallets via SBSA's H2H SFTP channel. The system handles:

- Maker/checker dual authorisation
- Pain.001 bulk payment file submission to SBSA via SFTP Outbox
- Pain.002 response file processing from SBSA via SFTP Inbox
- Per-payment status tracking and failure handling
- Results delivery to clients (webhook / SFTP / email)
- Audit trail (immutable, POPIA-compliant)

---

## Payment Rails

| Rail | Use case | Settlement | Limit | Cost |
|------|----------|------------|-------|------|
| EFT | Salary runs, bulk wages | Next business day (before 15:00 cut-off for same-day) | No practical limit | Cheapest |
| RTC | Urgent supplier payments | Within 60 seconds | R5 million | Higher |
| PayShap | Small disbursements (future) | Instant | R3,000 | Mid-range |

**Default rail for wage disbursement: EFT.**

---

## Architecture

```
Admin Portal (Maker)
  → Create disbursement run (upload CSV or build in UI)
  → System validates all accounts (AVS check — Phase 2 of this feature)

Admin Portal (Checker — different user, different role)
  → Reviews run summary (total, count, beneficiary list)
  → Approves or rejects

On Approval:
  → System ring-fences amount from employer's float account
  → Builds Pain.001 XML file (bulk, ISO 20022)
  → Uploads to SBSA SFTP Outbox via SbsaSftpClientService.uploadFile()

SBSA processes batch:
  → Places Pain.002 response file in SFTP Inbox

SFTP Inbox poller (sbsa-sftp-poller.js):
  → Downloads Pain.002
  → Parses per-payment statuses
  → Updates disbursement_payments table
  → Triggers results notification to employer

Results delivery to employer:
  → Webhook POST (if employer has registered URL)
  → SFTP results file (if employer has SFTP configured)
  → Email report (always — minimum baseline)
  → Admin portal shows real-time status per payment

Failed payments:
  → Employer sees failed list in admin portal
  → Corrects account details → clicks "Resubmit Failed"
  → System creates new disbursement run (linked to original) with only failed payments
```

---

## Database Schema

### `disbursement_runs`

```sql
id                    SERIAL PRIMARY KEY
client_id             INTEGER NOT NULL (FK: clients or users table)
run_reference         VARCHAR(50) UNIQUE NOT NULL  -- internal ID
rail                  ENUM('eft', 'rtc', 'payshap') DEFAULT 'eft'
pay_period            VARCHAR(20)  -- e.g. "2026-03"
total_amount          DECIMAL(15,2) NOT NULL
total_count           INTEGER NOT NULL
success_count         INTEGER DEFAULT 0
failed_count          INTEGER DEFAULT 0
pending_count         INTEGER DEFAULT 0
status                ENUM('draft','pending_approval','approved','submitted','processing','partial','completed','failed','cancelled')
pain001_filename      VARCHAR(255)
pain001_gcs_path      VARCHAR(500)
pain002_filename      VARCHAR(255)
pain002_gcs_path      VARCHAR(500)
maker_user_id         INTEGER NOT NULL  -- who created
checker_user_id       INTEGER           -- who approved
created_at            TIMESTAMP
submitted_at          TIMESTAMP
completed_at          TIMESTAMP
notification_channels JSONB  -- e.g. {"webhook": "https://...", "email": "hr@company.com"}
metadata              JSONB
```

### `disbursement_payments`

```sql
id                    SERIAL PRIMARY KEY
run_id                INTEGER NOT NULL (FK: disbursement_runs)
employee_ref          VARCHAR(100)  -- employer's employee ID
beneficiary_name      VARCHAR(140) NOT NULL
account_number        VARCHAR(20) NOT NULL
branch_code           VARCHAR(10) NOT NULL
bank_name             VARCHAR(100)
amount                DECIMAL(15,2) NOT NULL
reference             VARCHAR(35)  -- e.g. "SALARY MAR 2026 - EMP001"
status                ENUM('pending','accepted','rejected','resubmitted','cancelled')
rejection_code        VARCHAR(10)   -- ISO 20022 reason code (AC01, AC04, etc.)
rejection_reason      VARCHAR(255)  -- human-readable mapped from rejection_code
retry_of              INTEGER (FK: disbursement_payments.id, nullable)
processed_at          TIMESTAMP
created_at            TIMESTAMP
```

---

## ISO 20022 Rejection Codes → Human-Readable Messages

| Code | Meaning | Permanent? | Recommended action |
|------|---------|------------|-------------------|
| `AC01` | Invalid account number | Yes | Ask employee to verify account number |
| `AC04` | Account closed | Yes | Employee must provide new account details |
| `AC06` | Account blocked/frozen | Temporary | Retry after employee resolves with their bank |
| `AGNT` | Wrong branch code | Yes | Correct branch code and resubmit |
| `BE01` | Name does not match account | Yes | Verify employee name matches bank records |
| `AM04` | Insufficient funds (your side) | Temporary | Top up float account and resubmit |
| `DUPL` | Duplicate payment detected | Yes | Remove duplicate from run |
| `MD07` | Account holder deceased | Yes | Remove from payroll permanently |
| `FF01` | File format error (full batch) | Yes | Fix Pain.001 file format and resubmit |
| `MS02` | Unspecified reason | Unclear | Contact SBSA for clarification |

---

## Files to Create (when executing)

| File | Purpose |
|------|---------|
| `migrations/YYYYMMDD_create_disbursement_tables.js` | `disbursement_runs` + `disbursement_payments` tables |
| `services/standardbank/disbursementService.js` | Core business logic: create run, approve, build file, submit |
| `services/standardbank/pain001BulkBuilder.js` | Batch Pain.001 XML builder (extends existing `pain001Builder.js`) |
| `services/standardbank/pain002Parser.js` | Parse SBSA Pain.002 response files, extract per-payment statuses |
| `services/standardbank/disbursementNotificationService.js` | Route results to webhook / SFTP / email per client preference |
| `controllers/disbursementController.js` | API handlers for admin portal |
| `routes/disbursement.js` | Admin-only routes (maker/checker endpoints) |
| `docs/DISBURSEMENT_API.md` | API documentation for client webhook integration |

---

## Admin Portal UI (when executing)

### Pages needed (admin portal only)

1. **Disbursement Runs** — list of all runs with status, total, date
2. **Create Run** — upload CSV or add beneficiaries manually; choose rail and pay period
3. **Run Detail** — per-payment status table, download Pain.001/Pain.002, approve/reject (checker only)
4. **Failed Payments** — filtered view of `RJCT` payments; inline edit + bulk resubmit
5. **Client Notification Settings** — configure webhook URL, SFTP details, email per client

### Maker/Checker enforcement

- Separate portal roles: `DISBURSEMENT_MAKER`, `DISBURSEMENT_CHECKER`
- A user cannot hold both roles on the same run
- Approved runs lock beneficiary details (immutable after approval)
- All actions recorded with `user_id` + timestamp in `disbursement_runs`

---

## Results Delivery to Employers

### Channel 1 — Webhook (POST to client's registered URL)

```json
{
  "run_reference": "PAYROLL-MAR-2026-001",
  "submitted": 100,
  "successful": 97,
  "failed": 3,
  "failures": [
    {
      "employee_ref": "EMP042",
      "beneficiary_name": "John Smith",
      "amount": 8500.00,
      "rejection_code": "AC01",
      "rejection_reason": "Invalid account number — please verify with employee"
    }
  ]
}
```

### Channel 2 — SFTP results file (CSV, pushed to client's SFTP folder)

One row per payment. Compatible with standard payroll software (Sage, PaySpace, etc.).

### Channel 3 — Email report (always sent, minimum baseline)

HTML email with summary table + PDF attachment. Includes "Log in to fix failed payments" link back to admin portal.

---

## Resubmission Flow

```
Run #1: 100 payments → 97 success, 3 failed
                                    ↓
Admin portal: employer corrects 3 account numbers
                                    ↓
System creates Run #2 (retry_of = Run #1, 3 payments only)
                                    ↓
New Pain.001 submitted → Pain.002 received → 3 employees credited
```

- Original run (#1) keeps its `partial` status permanently (audit record)
- Resubmission creates a new run — never modifies the original
- DB: `disbursement_payments.retry_of` links retry records to originals

---

## Implementation Phases (within this feature)

| Sub-phase | Scope | Prerequisite |
|-----------|-------|-------------|
| A | DB migrations + core service + Pain.001 builder | Phase 2 SFTP stable |
| B | Pain.002 parser + payment status tracking | Melissa sign-on |
| C | Admin portal UI (create run, maker/checker, run detail) | Sub-phase A |
| D | Results notification (webhook + email) | Sub-phase B |
| E | SFTP results delivery to clients | Sub-phase D |
| F | Account Verification Service (AVS pre-check) | SBSA AVS access |

---

## Related Documents

- `docs/SBSA_H2H_SETUP_GUIDE.md` — SFTP infrastructure reference
- `integrations/standardbank/builders/pain001Builder.js` — existing single-payment Pain.001 builder
- `services/standardbank/sbsaSftpClientService.js` — SFTP client (Phase 2 of H2H go-live)
- `docs/SBSA_PAYSHAP_UAT_GUIDE.md` — PayShap integration (separate from H2H)
