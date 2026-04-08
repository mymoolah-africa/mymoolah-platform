# MyMoolah Disbursement Service — API Documentation

> **Version**: 1.0.0  
> **Base URL**: `https://api-mm.mymoolah.africa/api/v1`  
> **Access**: Admin portal users only (JWT-authenticated)  
> **Last updated**: 2026-04-07

---

## Quick Start

```bash
# 1. Authenticate — obtain a JWT token
curl -X POST https://api-mm.mymoolah.africa/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "admin@company.co.za", "password": "••••••••"}'

# 2. Create a disbursement run (maker role)
curl -X POST https://api-mm.mymoolah.africa/api/v1/disbursements \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "rail": "eft",
    "payPeriod": "2026-04",
    "beneficiaries": [
      {
        "name": "Jane Doe",
        "accountNumber": "1234567890",
        "branchCode": "051001",
        "amount": 15000.00
      }
    ]
  }'

# 3. Submit for approval (maker)
curl -X POST https://api-mm.mymoolah.africa/api/v1/disbursements/1/submit \
  -H "Authorization: Bearer <token>"

# 4. Approve the run (checker — different user)
curl -X POST https://api-mm.mymoolah.africa/api/v1/disbursements/1/approve \
  -H "Authorization: Bearer <checker_token>"
```

---

## Table of Contents

1. [Overview](#1-overview)
2. [Authentication](#2-authentication)
3. [Disbursement Runs API](#3-disbursement-runs-api)
4. [Disbursement Clients API](#4-disbursement-clients-api)
5. [Webhook Integration](#5-webhook-integration)
6. [ISO 20022 Rejection Codes](#6-iso-20022-rejection-codes)
7. [CSV File Format](#7-csv-file-format)
8. [Rate Limits](#8-rate-limits)

---

## 1. Overview

The MyMoolah Disbursement Service enables employers and corporates to disburse wages, salaries, and bulk payments to employee bank accounts or MyMoolah wallets. It is exposed exclusively through the MMTP Admin Portal.

### What it does

- **Bulk payment processing** — upload a payroll CSV/Excel file or build a beneficiary list in the portal UI
- **Maker/checker dual authorisation** — one user creates the run, a different user approves it
- **ISO 20022 Pain.001/Pain.002** — generates SWIFT-compliant payment instruction files submitted to SBSA via H2H SFTP
- **Per-payment status tracking** — each beneficiary payment is tracked individually through acceptance or rejection
- **Automatic failure handling** — failed payments can be corrected and resubmitted as a linked follow-up run
- **Multi-channel results delivery** — webhook, SFTP results file, and email reports

### Payment Rails

| Rail | Use Case | Settlement | Limit | Cost |
|------|----------|------------|-------|------|
| **EFT** | Salary runs, bulk wages | Next business day (same-day if before 15:00 cut-off) | No practical limit | Lowest |
| **RTC** | Urgent supplier payments | Within 60 seconds | R5,000,000 | Higher |
| **PayShap** | Small disbursements (future) | Instant | R3,000 | Mid-range |

Default rail for wage disbursement is **EFT**.

### Run Lifecycle

```
draft → pending_approval → approved → submitted → processing → completed / partial / failed
                 ↓                                                      ↓
              rejected                                          resubmit-failed → new run
                 ↓
              cancelled
```

| Status | Description |
|--------|-------------|
| `draft` | Run created by maker, not yet submitted |
| `pending_approval` | Submitted by maker, awaiting checker review |
| `approved` | Checker approved; Pain.001 being generated |
| `submitted` | Pain.001 uploaded to SBSA SFTP Outbox |
| `processing` | SBSA is processing the batch |
| `completed` | All payments accepted |
| `partial` | Some payments accepted, some rejected |
| `failed` | All payments rejected or batch-level error |
| `cancelled` | Run cancelled before submission |
| `rejected` | Checker rejected the run |

---

## 2. Authentication

All disbursement endpoints require a valid JWT Bearer token obtained from the portal login endpoint.

### Login

```
POST /api/v1/auth/login
```

**Request body:**

```json
{
  "email": "admin@company.co.za",
  "password": "your-password"
}
```

**Response:**

```json
{
  "success": true,
  "token": "eyJhbGciOiJIUzUxMiIs...",
  "user": {
    "id": 1,
    "email": "admin@company.co.za",
    "isAdmin": true
  }
}
```

### Using the Token

Include the token in the `Authorization` header on every request:

```
Authorization: Bearer eyJhbGciOiJIUzUxMiIs...
```

**Token details:**

| Property | Value |
|----------|-------|
| Algorithm | HS512 |
| Expiry | Short-lived (configurable) |
| Transport | TLS 1.3 enforced |

---

## 3. Disbursement Runs API

**Base path:** `/api/v1/disbursements`

### 3.1 Create Run

Creates a new disbursement run in `draft` status. The authenticated user becomes the **maker**.

```
POST /api/v1/disbursements
```

**Rate limit:** Strict (20 requests / 15 min)

**Request body:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `beneficiaries` | array | Yes | Array of 1–10,000 beneficiary objects |
| `beneficiaries[].name` | string | Yes | Beneficiary full name (max 140 chars) |
| `beneficiaries[].accountNumber` | string | Yes | Bank account number (6–20 digits) |
| `beneficiaries[].branchCode` | string | Yes | Universal branch code (6 digits) |
| `beneficiaries[].amount` | number | Yes | Payment amount in ZAR (> R0.00) |
| `rail` | string | No | Payment rail: `eft` (default) or `rtc` |
| `payPeriod` | string | No | Pay period in `YYYY-MM` format |
| `notificationChannels` | object | No | Override notification delivery (see [Webhooks](#5-webhook-integration)) |

**Example request:**

```bash
curl -X POST https://api-mm.mymoolah.africa/api/v1/disbursements \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "rail": "eft",
    "payPeriod": "2026-04",
    "beneficiaries": [
      {
        "name": "Jane Doe",
        "accountNumber": "1234567890",
        "branchCode": "051001",
        "amount": 15000.00
      },
      {
        "name": "John Smith",
        "accountNumber": "9876543210",
        "branchCode": "250655",
        "amount": 22500.50
      }
    ],
    "notificationChannels": {
      "webhook": "https://payroll.company.co.za/hooks/mymoolah",
      "email": "hr@company.co.za"
    }
  }'
```

**Success response (201):**

```json
{
  "success": true,
  "data": {
    "id": 42,
    "run_reference": "DISB-2026-04-001",
    "rail": "eft",
    "pay_period": "2026-04",
    "total_amount": 37500.50,
    "total_count": 2,
    "status": "draft",
    "maker_user_id": 1,
    "created_at": "2026-04-07T10:30:00.000Z"
  }
}
```

**Error responses:**

| Status | Condition |
|--------|-----------|
| 400 | Validation errors (missing fields, invalid formats) |
| 401 | Missing or invalid JWT token |
| 429 | Rate limit exceeded |

---

### 3.2 List Runs

Returns a paginated list of disbursement runs. Admin users see all runs; non-admin users see only their own client's runs.

```
GET /api/v1/disbursements
```

**Rate limit:** Standard (100 requests / 15 min)

**Query parameters:**

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `page` | integer | No | 1 | Page number (min: 1) |
| `limit` | integer | No | 20 | Results per page (1–100) |
| `status` | string | No | — | Filter by run status |

**Example request:**

```bash
curl "https://api-mm.mymoolah.africa/api/v1/disbursements?page=1&limit=10&status=completed" \
  -H "Authorization: Bearer <token>"
```

**Success response (200):**

```json
{
  "success": true,
  "data": {
    "runs": [
      {
        "id": 42,
        "run_reference": "DISB-2026-04-001",
        "rail": "eft",
        "pay_period": "2026-04",
        "total_amount": 37500.50,
        "total_count": 2,
        "success_count": 2,
        "failed_count": 0,
        "pending_count": 0,
        "status": "completed",
        "maker_user_id": 1,
        "checker_user_id": 3,
        "submitted_at": "2026-04-07T11:00:00.000Z",
        "completed_at": "2026-04-07T14:30:00.000Z",
        "created_at": "2026-04-07T10:30:00.000Z"
      }
    ],
    "pagination": {
      "total": 1,
      "page": 1,
      "limit": 10,
      "totalPages": 1
    }
  }
}
```

---

### 3.3 Get Run Detail

Returns a single run with all associated payment lines.

```
GET /api/v1/disbursements/:id
```

**Rate limit:** Standard (100 requests / 15 min)

**Path parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `id` | integer | Disbursement run ID |

**Example request:**

```bash
curl https://api-mm.mymoolah.africa/api/v1/disbursements/42 \
  -H "Authorization: Bearer <token>"
```

**Success response (200):**

```json
{
  "success": true,
  "data": {
    "id": 42,
    "run_reference": "DISB-2026-04-001",
    "rail": "eft",
    "pay_period": "2026-04",
    "total_amount": 37500.50,
    "total_count": 2,
    "success_count": 1,
    "failed_count": 1,
    "pending_count": 0,
    "status": "partial",
    "maker_user_id": 1,
    "checker_user_id": 3,
    "payments": [
      {
        "id": 101,
        "employee_ref": "EMP001",
        "beneficiary_name": "Jane Doe",
        "account_number": "1234567890",
        "branch_code": "051001",
        "bank_name": "Standard Bank",
        "amount": 15000.00,
        "reference": "SALARY APR 2026 - EMP001",
        "status": "accepted",
        "rejection_code": null,
        "rejection_reason": null,
        "processed_at": "2026-04-07T14:30:00.000Z"
      },
      {
        "id": 102,
        "employee_ref": "EMP002",
        "beneficiary_name": "John Smith",
        "account_number": "9876543210",
        "branch_code": "250655",
        "bank_name": "FNB / First National Bank",
        "amount": 22500.50,
        "reference": "SALARY APR 2026 - EMP002",
        "status": "rejected",
        "rejection_code": "AC01",
        "rejection_reason": "Invalid account number",
        "processed_at": "2026-04-07T14:30:00.000Z"
      }
    ],
    "created_at": "2026-04-07T10:30:00.000Z",
    "submitted_at": "2026-04-07T11:00:00.000Z",
    "completed_at": "2026-04-07T14:30:00.000Z"
  }
}
```

**Error responses:**

| Status | Condition |
|--------|-----------|
| 404 | Run not found |

---

### 3.4 List Payments for a Run

Returns payment lines for a specific run with optional status filtering.

```
GET /api/v1/disbursements/:id/payments
```

**Rate limit:** Standard (100 requests / 15 min)

**Path parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `id` | integer | Disbursement run ID |

**Query parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `status` | string | No | Filter by payment status: `pending`, `accepted`, `rejected`, `resubmitted`, `cancelled` |

**Example request:**

```bash
curl "https://api-mm.mymoolah.africa/api/v1/disbursements/42/payments?status=rejected" \
  -H "Authorization: Bearer <token>"
```

**Success response (200):**

```json
{
  "success": true,
  "data": [
    {
      "id": 102,
      "run_id": 42,
      "employee_ref": "EMP002",
      "beneficiary_name": "John Smith",
      "account_number": "9876543210",
      "branch_code": "250655",
      "amount": 22500.50,
      "status": "rejected",
      "rejection_code": "AC01",
      "rejection_reason": "Invalid account number",
      "retry_of": null,
      "processed_at": "2026-04-07T14:30:00.000Z"
    }
  ]
}
```

---

### 3.5 Submit for Approval

Maker submits a `draft` run for checker review. Transitions the run to `pending_approval`.

```
POST /api/v1/disbursements/:id/submit
```

**Rate limit:** Strict (20 requests / 15 min)

**Path parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `id` | integer | Disbursement run ID |

**Request body:** None

**Example request:**

```bash
curl -X POST https://api-mm.mymoolah.africa/api/v1/disbursements/42/submit \
  -H "Authorization: Bearer <token>"
```

**Success response (200):**

```json
{
  "success": true,
  "message": "Run submitted for approval",
  "data": {
    "id": 42,
    "status": "pending_approval",
    "submitted_at": "2026-04-07T11:00:00.000Z"
  }
}
```

**Error responses:**

| Status | Condition |
|--------|-----------|
| 400 | Run is not in `draft` status, or caller is not the maker |

---

### 3.6 Approve Run

Checker approves a `pending_approval` run. This triggers:

1. Float ring-fencing from the employer's account
2. Pain.001 XML file generation (ISO 20022)
3. Upload to SBSA SFTP Outbox

The checker **must be a different user** from the maker.

```
POST /api/v1/disbursements/:id/approve
```

**Rate limit:** Strict (20 requests / 15 min)

**Path parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `id` | integer | Disbursement run ID |

**Request body:** None

**Example request:**

```bash
curl -X POST https://api-mm.mymoolah.africa/api/v1/disbursements/42/approve \
  -H "Authorization: Bearer <checker_token>"
```

**Success response (200):**

```json
{
  "success": true,
  "message": "Run approved and submitted to SBSA",
  "data": {
    "id": 42,
    "status": "submitted",
    "checker_user_id": 3,
    "pain001_filename": "pain001_DISB-2026-04-001.xml"
  }
}
```

**Error responses:**

| Status | Condition |
|--------|-----------|
| 400 | Run is not `pending_approval`, checker is the same as maker, or insufficient float |

---

### 3.7 Reject Run

Checker rejects a `pending_approval` run, optionally providing a reason.

```
POST /api/v1/disbursements/:id/reject
```

**Rate limit:** Strict (20 requests / 15 min)

**Path parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `id` | integer | Disbursement run ID |

**Request body:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `reason` | string | No | Rejection reason (max 500 chars) |

**Example request:**

```bash
curl -X POST https://api-mm.mymoolah.africa/api/v1/disbursements/42/reject \
  -H "Authorization: Bearer <checker_token>" \
  -H "Content-Type: application/json" \
  -d '{"reason": "Amounts do not match approved payroll schedule"}'
```

**Success response (200):**

```json
{
  "success": true,
  "message": "Run rejected",
  "data": {
    "id": 42,
    "status": "rejected",
    "checker_user_id": 3
  }
}
```

---

### 3.8 Resubmit Failed Payments

Maker creates a new disbursement run containing only the failed payments from a `partial` or `failed` run. The new run is linked to the original via internal references. Optionally, corrected account details can be supplied.

```
POST /api/v1/disbursements/:id/resubmit-failed
```

**Rate limit:** Strict (20 requests / 15 min)

**Path parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `id` | integer | Original disbursement run ID |

**Request body:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `corrections` | array | No | Array of corrections for specific failed payments |
| `corrections[].paymentId` | integer | No | ID of the failed payment to correct |
| `corrections[].correctedAccountNumber` | string | No | New account number (6–20 digits) |
| `corrections[].correctedBranchCode` | string | No | New branch code (6 digits) |

**Example request:**

```bash
curl -X POST https://api-mm.mymoolah.africa/api/v1/disbursements/42/resubmit-failed \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "corrections": [
      {
        "paymentId": 102,
        "correctedAccountNumber": "5551234567",
        "correctedBranchCode": "250655"
      }
    ]
  }'
```

**Success response (201):**

```json
{
  "success": true,
  "message": "Resubmission run created: DISB-2026-04-002",
  "data": {
    "run": {
      "id": 43,
      "run_reference": "DISB-2026-04-002",
      "status": "draft",
      "total_count": 1,
      "total_amount": 22500.50
    },
    "originalRunId": 42
  }
}
```

**Error responses:**

| Status | Condition |
|--------|-----------|
| 400 | Original run has no failed payments, or run status does not allow resubmission |

---

## 4. Disbursement Clients API

**Base path:** `/api/v1/disbursement-clients`

The Clients API manages employer/corporate onboarding, KYB (Know Your Business) compliance, fee configuration, and beneficiary file parsing.

### 4.1 List Clients

Returns a paginated list of disbursement clients. Admin users see all clients; non-admin users see only clients they created.

```
GET /api/v1/disbursement-clients
```

**Rate limit:** Standard (100 requests / 15 min)

**Query parameters:**

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `page` | integer | No | 1 | Page number (min: 1) |
| `limit` | integer | No | 20 | Results per page (1–100) |
| `status` | string | No | — | Filter: `pending`, `active`, `suspended`, `closed` |
| `kyb_status` | string | No | — | Filter by KYB verification status |

**Example request:**

```bash
curl "https://api-mm.mymoolah.africa/api/v1/disbursement-clients?status=active&page=1" \
  -H "Authorization: Bearer <token>"
```

**Success response (200):**

```json
{
  "success": true,
  "data": {
    "clients": [
      {
        "id": 5,
        "client_code": "ACMECORP",
        "company_name": "Acme Corporation (Pty) Ltd",
        "entity_type": "company",
        "status": "active",
        "kyb_status": "verified",
        "contact_email": "payroll@acme.co.za",
        "created_at": "2026-03-15T08:00:00.000Z"
      }
    ],
    "pagination": {
      "total": 1,
      "page": 1,
      "limit": 20,
      "totalPages": 1
    }
  }
}
```

---

### 4.2 Get Client Detail

Returns a single client with current fee configuration, notification preferences, and KYB document summary.

```
GET /api/v1/disbursement-clients/:clientId
```

**Rate limit:** Standard (100 requests / 15 min)

**Example request:**

```bash
curl https://api-mm.mymoolah.africa/api/v1/disbursement-clients/5 \
  -H "Authorization: Bearer <token>"
```

**Success response (200):**

```json
{
  "success": true,
  "data": {
    "id": 5,
    "client_code": "ACMECORP",
    "company_name": "Acme Corporation (Pty) Ltd",
    "entity_type": "company",
    "status": "active",
    "kyb_status": "verified",
    "contact_email": "payroll@acme.co.za",
    "contact_name": "Sarah Johnson",
    "contact_phone": "+27821234567",
    "registration_number": "2020/123456/07",
    "float_limit": 500000.00,
    "white_label_slug": "acme",
    "fees": [
      {
        "rail": "eft",
        "fee_type": "flat",
        "flat_fee_cents": 350,
        "percentage_fee": 0,
        "effective_from": "2026-03-15"
      }
    ],
    "notificationPreferences": [],
    "kybDocumentSummary": [
      { "status": "verified", "count": "4" }
    ]
  }
}
```

---

### 4.3 Create Client

Onboard a new disbursement client. An API key is auto-generated and returned in the response.

```
POST /api/v1/disbursement-clients
```

**Rate limit:** Strict (30 requests / 15 min)

**Request body:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `client_code` | string | Yes | Unique code: letters, digits, hyphens only (max 20 chars), e.g. `MMTP-001` |
| `company_name` | string | Yes | Company legal name (max 255 chars) |
| `contact_email` | string | Yes | Primary contact email |
| `entity_type` | string | No | `company` (default), `sole_proprietor`, `trust`, `partnership`, `npo` |
| `registration_number` | string | No | Company registration number (max 50 chars) |
| `contact_name` | string | No | Contact person name (max 255 chars) |
| `contact_phone` | string | No | Contact phone number (max 20 chars) |
| `white_label_slug` | string | No | Branding slug for white-label portal (max 50 chars) |
| `float_limit` | decimal | No | Maximum float balance allowed |

**Example request:**

```bash
curl -X POST https://api-mm.mymoolah.africa/api/v1/disbursement-clients \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "client_code": "ACMECORP",
    "company_name": "Acme Corporation (Pty) Ltd",
    "contact_email": "payroll@acme.co.za",
    "entity_type": "company",
    "registration_number": "2020/123456/07",
    "contact_name": "Sarah Johnson",
    "contact_phone": "+27821234567",
    "float_limit": 500000.00
  }'
```

**Success response (201):**

```json
{
  "success": true,
  "data": {
    "id": 5,
    "client_code": "ACMECORP",
    "company_name": "Acme Corporation (Pty) Ltd",
    "api_key": "a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6",
    "status": "pending",
    "kyb_status": "pending",
    "created_at": "2026-04-07T10:00:00.000Z"
  }
}
```

**Error responses:**

| Status | Condition |
|--------|-----------|
| 400 | Validation errors |
| 409 | `client_code` already exists |

---

### 4.4 Update Client

Update allowed fields on an existing client.

```
PATCH /api/v1/disbursement-clients/:clientId
```

**Rate limit:** Strict (30 requests / 15 min)

**Updatable fields:**

| Field | Type | Description |
|-------|------|-------------|
| `company_name` | string | Company legal name |
| `contact_name` | string | Contact person name |
| `contact_email` | string | Contact email |
| `contact_phone` | string | Contact phone |
| `status` | string | `pending`, `active`, `suspended`, `closed` |
| `float_limit` | decimal | Maximum float balance |
| `white_label_slug` | string | Branding slug |
| `white_label_config` | object | White-label configuration JSON |
| `notification_channels` | object | Notification delivery preferences |

**Example request:**

```bash
curl -X PATCH https://api-mm.mymoolah.africa/api/v1/disbursement-clients/5 \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "status": "active",
    "notification_channels": {
      "webhook": "https://payroll.acme.co.za/hooks/mymoolah",
      "email": "hr@acme.co.za"
    }
  }'
```

**Success response (200):**

```json
{
  "success": true,
  "data": {
    "id": 5,
    "status": "active",
    "notification_channels": {
      "webhook": "https://payroll.acme.co.za/hooks/mymoolah",
      "email": "hr@acme.co.za"
    }
  }
}
```

**Error responses:**

| Status | Condition |
|--------|-----------|
| 400 | No valid fields provided, or validation error |
| 404 | Client not found |

---

### 4.5 Upload KYB Document

Upload a Know Your Business (KYB) compliance document for a client. The document is stored in GCS and queued for automated analysis.

```
POST /api/v1/disbursement-clients/:clientId/kyb-documents
```

**Rate limit:** Strict (30 requests / 15 min)

**Content-Type:** `multipart/form-data`

**Form fields:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `document` | file | Yes | Document file (max 50 MB) |
| `document_type` | string | Yes | See document types below |
| `entity_type` | string | Yes | Entity type this document belongs to |

**Document types by entity type:**

| Entity Type | Required Documents |
|-------------|-------------------|
| `company` | `cor15`, `id_document`, `proof_of_address`, `bank_confirmation` |
| `sole_proprietor` | `id_document`, `proof_of_address`, `bank_confirmation` |
| `trust` | `trust_deed`, `id_document`, `proof_of_address`, `bank_confirmation` |
| `partnership` | `partnership_agreement`, `id_document`, `proof_of_address`, `bank_confirmation` |
| `npo` | `npo_certificate`, `id_document`, `proof_of_address`, `bank_confirmation` |

When all required documents for a client's entity type are verified, the client's `kyb_status` is automatically set to `verified`.

**Example request:**

```bash
curl -X POST https://api-mm.mymoolah.africa/api/v1/disbursement-clients/5/kyb-documents \
  -H "Authorization: Bearer <token>" \
  -F "document=@/path/to/cor15.pdf" \
  -F "document_type=cor15" \
  -F "entity_type=company"
```

**Success response (201):**

```json
{
  "success": true,
  "data": {
    "id": 12,
    "client_id": 5,
    "document_type": "cor15",
    "entity_type": "company",
    "file_url": "kyb-documents/5/abc123_cor15.pdf",
    "status": "pending"
  }
}
```

---

### 4.6 Review KYB Document

Admin reviews a KYB document, setting its status to `verified` or `rejected`.

```
PATCH /api/v1/disbursement-clients/:clientId/kyb-documents/:docId
```

**Rate limit:** Strict (30 requests / 15 min)

**Request body:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `status` | string | Yes | `verified` or `rejected` |
| `rejection_reason` | string | No | Reason for rejection (max 1000 chars; only used when `status` is `rejected`) |

**Example request:**

```bash
curl -X PATCH https://api-mm.mymoolah.africa/api/v1/disbursement-clients/5/kyb-documents/12 \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"status": "verified"}'
```

**Success response (200):**

```json
{
  "success": true,
  "data": {
    "id": 12,
    "status": "verified",
    "verified_at": "2026-04-07T12:00:00.000Z",
    "verified_by": "1"
  }
}
```

---

### 4.7 List Fees

Returns all fee configurations for a client, including both current and historical entries.

```
GET /api/v1/disbursement-clients/:clientId/fees
```

**Rate limit:** Standard (100 requests / 15 min)

**Example request:**

```bash
curl https://api-mm.mymoolah.africa/api/v1/disbursement-clients/5/fees \
  -H "Authorization: Bearer <token>"
```

**Success response (200):**

```json
{
  "success": true,
  "data": {
    "fees": [
      {
        "id": 8,
        "client_id": 5,
        "rail": "eft",
        "fee_type": "flat",
        "flat_fee_cents": 350,
        "percentage_fee": 0,
        "min_fee_cents": 0,
        "max_fee_cents": null,
        "effective_from": "2026-04-01",
        "effective_to": null,
        "created_by": 1
      }
    ]
  }
}
```

---

### 4.8 Set Fee

Creates a new fee configuration for a specific payment rail. If a current fee exists for the same rail, it is automatically expired (its `effective_to` is set to today). This operation is atomic (transactional).

```
POST /api/v1/disbursement-clients/:clientId/fees
```

**Rate limit:** Strict (30 requests / 15 min)

**Request body:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `rail` | string | Yes | `eft`, `payshap`, or `wallet` |
| `fee_type` | string | Yes | `flat`, `percentage`, or `flat_plus_percentage` |
| `flat_fee_cents` | integer | Yes | Flat fee in cents (e.g., 350 = R3.50) |
| `percentage_fee` | number | Yes | Percentage fee (e.g., 0.5 = 0.5%) |
| `min_fee_cents` | integer | No | Minimum fee floor in cents |
| `max_fee_cents` | integer | No | Maximum fee cap in cents |

**Example request:**

```bash
curl -X POST https://api-mm.mymoolah.africa/api/v1/disbursement-clients/5/fees \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "rail": "eft",
    "fee_type": "flat_plus_percentage",
    "flat_fee_cents": 250,
    "percentage_fee": 0.25,
    "min_fee_cents": 250,
    "max_fee_cents": 5000
  }'
```

**Success response (201):**

```json
{
  "success": true,
  "data": {
    "id": 9,
    "client_id": 5,
    "rail": "eft",
    "fee_type": "flat_plus_percentage",
    "flat_fee_cents": 250,
    "percentage_fee": 0.25,
    "min_fee_cents": 250,
    "max_fee_cents": 5000,
    "effective_from": "2026-04-07",
    "effective_to": null
  }
}
```

---

### 4.9 Upload Beneficiary File

Uploads and parses a beneficiary file for preview. This endpoint does **not** create a disbursement run — it returns the parsed beneficiary list, warnings, and errors so the client can review before creating a run.

```
POST /api/v1/disbursement-clients/:clientId/upload-beneficiaries
```

**Rate limit:** Strict (30 requests / 15 min)

**Content-Type:** `multipart/form-data`

**Form fields:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `file` | file | Yes | CSV, XLSX, XLS, or XML file (max 50 MB) |

**Supported file formats:**

| Format | Extension | Notes |
|--------|-----------|-------|
| CSV | `.csv` | Flexible column mapping (see [CSV Format](#7-csv-file-format)) |
| Excel | `.xlsx`, `.xls` | First sheet parsed, same column mapping as CSV |
| Pain.001 XML | `.xml` | ISO 20022 `CdtTrfTxInf` extraction |

**Example request:**

```bash
curl -X POST https://api-mm.mymoolah.africa/api/v1/disbursement-clients/5/upload-beneficiaries \
  -H "Authorization: Bearer <token>" \
  -F "file=@/path/to/payroll.csv"
```

**Success response (200):**

```json
{
  "success": true,
  "data": {
    "beneficiaries": [
      {
        "name": "Jane Doe",
        "accountNumber": "1234567890",
        "branchCode": "051001",
        "bankName": "Standard Bank",
        "amount": 15000.00,
        "employeeRef": "EMP001",
        "reference": "SALARY APR 2026",
        "valid": true,
        "errors": []
      },
      {
        "name": "John Smith",
        "accountNumber": "98765",
        "branchCode": "250655",
        "bankName": "FNB / First National Bank",
        "amount": 22500.50,
        "employeeRef": "EMP002",
        "reference": "SALARY APR 2026",
        "valid": false,
        "errors": ["Account number must be 6–20 digits"]
      }
    ],
    "warnings": ["Row 2: account number appears short"],
    "errors": [],
    "filename": "payroll.csv"
  }
}
```

---

## 5. Webhook Integration

Employers can register a webhook URL to receive automated results when a disbursement run completes. The webhook is a `POST` request sent to the client's registered URL.

### Webhook Payload

```json
{
  "event": "run_completed",
  "run_reference": "DISB-2026-04-001",
  "submitted": 100,
  "successful": 97,
  "failed": 3,
  "failures": [
    {
      "employee_ref": "EMP042",
      "beneficiary_name": "John Smith",
      "amount": 8500.00,
      "rejection_code": "AC01",
      "rejection_reason": "Invalid account number"
    },
    {
      "employee_ref": "EMP067",
      "beneficiary_name": "Mary Jones",
      "amount": 12000.00,
      "rejection_code": "AC04",
      "rejection_reason": "Account closed"
    },
    {
      "employee_ref": "EMP091",
      "beneficiary_name": "David Lee",
      "amount": 9500.00,
      "rejection_code": "AGNT",
      "rejection_reason": "Wrong branch code"
    }
  ]
}
```

### Event Types

| Event | Description | When fired |
|-------|-------------|------------|
| `run_completed` | All payments in the run have been processed (accepted or rejected) | After Pain.002 response is fully parsed |
| `run_partial` | Some payments accepted, some rejected | After Pain.002 parsing when mixed results |
| `run_failed` | All payments rejected or batch-level error | After Pain.002 parsing with all rejections |

### HMAC-SHA256 Signature Verification

Every webhook request includes an `X-MyMoolah-Signature` header containing an HMAC-SHA256 signature of the request body, signed with the client's API key. Always verify this signature before processing the webhook.

**Headers sent:**

| Header | Description |
|--------|-------------|
| `Content-Type` | `application/json` |
| `X-MyMoolah-Signature` | HMAC-SHA256 hex digest of the raw request body |
| `X-MyMoolah-Event` | Event type (e.g., `run_completed`) |
| `X-MyMoolah-Delivery` | Unique delivery ID (UUID) for idempotency |

**Signature construction:**

```
HMAC-SHA256(api_key, raw_request_body)
```

### Retry Policy

| Attempt | Delay |
|---------|-------|
| 1st retry | 30 seconds |
| 2nd retry | 2 minutes |
| 3rd retry | 15 minutes |
| 4th retry | 1 hour |
| 5th retry | 6 hours |

A delivery is considered successful when the endpoint returns an HTTP `2xx` status code. After 5 failed retries, the delivery is marked as failed and an email notification is sent as a fallback.

### Example Webhook Handler (Node.js)

```javascript
const crypto = require('crypto');
const express = require('express');
const app = express();

app.use(express.raw({ type: 'application/json' }));

const MYMOOLAH_API_KEY = process.env.MYMOOLAH_API_KEY;

app.post('/hooks/mymoolah', (req, res) => {
  const signature = req.headers['x-mymoolah-signature'];
  const deliveryId = req.headers['x-mymoolah-delivery'];

  // 1. Verify HMAC signature
  const expectedSig = crypto
    .createHmac('sha256', MYMOOLAH_API_KEY)
    .update(req.body)
    .digest('hex');

  if (signature !== expectedSig) {
    console.error('Invalid webhook signature');
    return res.status(401).json({ error: 'Invalid signature' });
  }

  // 2. Parse payload
  const payload = JSON.parse(req.body);
  console.log(`Received ${payload.event} for run ${payload.run_reference}`);

  // 3. Deduplicate using delivery ID
  // Store deliveryId in your database to prevent double-processing

  // 4. Process results
  if (payload.failed > 0) {
    console.log(`${payload.failed} payments failed — review in portal`);
    payload.failures.forEach(f => {
      console.log(`  ${f.employee_ref}: ${f.rejection_reason} (${f.rejection_code})`);
    });
  }

  // 5. Respond with 200 to acknowledge receipt
  res.status(200).json({ received: true });
});

app.listen(3000);
```

---

## 6. ISO 20022 Rejection Codes

When SBSA returns a Pain.002 response, individual payments may be rejected with the following ISO 20022 reason codes:

| Code | Meaning | Permanent? | Recommended Action |
|------|---------|:----------:|-------------------|
| `AC01` | Invalid account number | Yes | Ask employee to verify account number |
| `AC04` | Account closed | Yes | Employee must provide new account details |
| `AC06` | Account blocked / frozen | Temporary | Retry after employee resolves with their bank |
| `AGNT` | Wrong branch code | Yes | Correct branch code and resubmit |
| `BE01` | Name does not match account | Yes | Verify employee name matches bank records |
| `AM04` | Insufficient funds (your side) | Temporary | Top up float account and resubmit |
| `DUPL` | Duplicate payment detected | Yes | Remove duplicate from run |
| `MD07` | Account holder deceased | Yes | Remove from payroll permanently |
| `FF01` | File format error (full batch) | Yes | Fix Pain.001 file format and resubmit entire batch |
| `MS02` | Unspecified reason | Unclear | Contact SBSA for clarification |

### Handling Rejections

1. **Permanent rejections** (AC01, AC04, AGNT, BE01, DUPL, MD07, FF01): Correct the data or remove the beneficiary, then use the [Resubmit Failed](#38-resubmit-failed-payments) endpoint.
2. **Temporary rejections** (AC06, AM04): Wait for the underlying issue to be resolved, then resubmit without changes.
3. **Unclear rejections** (MS02): Contact Standard Bank for clarification before resubmitting.

---

## 7. CSV File Format

The file parser accepts CSV files with flexible column naming. Column headers are matched case-insensitively with spaces, hyphens, and underscores normalized.

### Required Columns

| Field | Accepted Header Names |
|-------|----------------------|
| Beneficiary name | `name`, `beneficiary_name`, `beneficiaryname`, `full_name`, `fullname` |
| Account number | `account_number`, `accountnumber`, `account`, `acc_no`, `accno` |
| Branch code | `branch_code`, `branchcode`, `branch`, `sort_code`, `sortcode` |
| Amount | `amount`, `payment_amount`, `paymentamount`, `salary` |

### Optional Columns

| Field | Accepted Header Names |
|-------|----------------------|
| Bank name | `bank_name`, `bankname`, `bank` |
| Payment reference | `reference`, `ref`, `payment_ref`, `paymentref` |
| Employee reference | `employee_ref`, `employeeref`, `emp_ref`, `empref`, `emp_id`, `empid` |

### Amount Formatting

The parser accepts the following amount formats:

- `15000.00` — plain decimal
- `15,000.00` — comma-separated thousands
- `R 15000.00` or `R15000` — with ZAR prefix

### Universal Branch Codes

Use the universal branch code for each bank. Legacy 6-digit branch codes are auto-mapped where the first three digits identify the bank.

| Bank | Universal Branch Code |
|------|-----------------------|
| Standard Bank | `051001` |
| ABSA | `632005` |
| FNB / First National Bank | `250655` |
| Nedbank | `198765` |
| Capitec | `470010` |
| African Bank | `462005` |
| Bidvest Bank | `430000` |
| Discovery Bank | `679000` |
| Investec | `580105` |
| Sasfin | `261251` |
| TymeBank | `431010` |
| Bank Zero | `678910` |
| Old Mutual / Nedbank Private Wealth | `350005` |

### Example CSV

```csv
name,account_number,branch_code,amount,employee_ref,reference
Jane Doe,1234567890,051001,15000.00,EMP001,SALARY APR 2026
John Smith,9876543210,250655,22500.50,EMP002,SALARY APR 2026
Mary Jones,5551234567,632005,18000.00,EMP003,SALARY APR 2026
```

### Validation Rules

- Account number: 6–20 digits
- Branch code: exactly 6 digits
- Amount: greater than R0.00, maximum R10,000,000 per payment
- Name: non-empty, max 140 characters
- File size: maximum 50 MB
- Row count: maximum 10,000 beneficiaries per run

---

## 8. Rate Limits

All disbursement endpoints are rate-limited per IP address. Two tiers are applied:

### Standard Rate Limit

Applied to read-only endpoints (list, get, fees).

| Parameter | Value |
|-----------|-------|
| Window | 15 minutes |
| Max requests | 100 |

### Strict Rate Limit

Applied to write endpoints (create, submit, approve, reject, resubmit, upload).

| Parameter | Value |
|-----------|-------|
| Window | 15 minutes |
| Max requests | 20 (disbursement runs) / 30 (client management) |

### Rate Limit Response

When the limit is exceeded, the API returns:

```
HTTP/1.1 429 Too Many Requests
Retry-After: 900
```

```json
{
  "success": false,
  "error": "Too many requests, please try again later."
}
```

### Endpoint Rate Limit Summary

| Endpoint | Tier | Max / 15 min |
|----------|------|:------------:|
| `GET /disbursements` | Standard | 100 |
| `GET /disbursements/:id` | Standard | 100 |
| `GET /disbursements/:id/payments` | Standard | 100 |
| `POST /disbursements` | Strict | 20 |
| `POST /disbursements/:id/submit` | Strict | 20 |
| `POST /disbursements/:id/approve` | Strict | 20 |
| `POST /disbursements/:id/reject` | Strict | 20 |
| `POST /disbursements/:id/resubmit-failed` | Strict | 20 |
| `GET /disbursement-clients` | Standard | 100 |
| `GET /disbursement-clients/:clientId` | Standard | 100 |
| `POST /disbursement-clients` | Strict | 30 |
| `PATCH /disbursement-clients/:clientId` | Strict | 30 |
| `POST /disbursement-clients/:clientId/kyb-documents` | Strict | 30 |
| `PATCH /disbursement-clients/:clientId/kyb-documents/:docId` | Strict | 30 |
| `GET /disbursement-clients/:clientId/fees` | Standard | 100 |
| `POST /disbursement-clients/:clientId/fees` | Strict | 30 |
| `POST /disbursement-clients/:clientId/upload-beneficiaries` | Strict | 30 |

---

## Standard Response Format

All endpoints return responses in a consistent JSON format:

### Success

```json
{
  "success": true,
  "data": { ... },
  "message": "Optional human-readable message"
}
```

### Error

```json
{
  "success": false,
  "error": "Human-readable error message",
  "errors": [ ... ]
}
```

### Common HTTP Status Codes

| Code | Meaning |
|------|---------|
| 200 | Success |
| 201 | Created (new run, client, fee, or document) |
| 400 | Validation error or invalid state transition |
| 401 | Unauthorized (missing or invalid JWT) |
| 404 | Resource not found |
| 409 | Conflict (e.g., duplicate client code) |
| 429 | Rate limit exceeded |
| 500 | Internal server error |

---

## Related Documentation

- [SBSA H2H Setup Guide](./SBSA_H2H_SETUP_GUIDE.md) — SFTP infrastructure and connection setup
- [SBSA Wage Disbursement Plan](./SBSA_WAGE_DISBURSEMENT_PLAN.md) — Architectural plan and database schema
- [Chart of Accounts](./CHART_OF_ACCOUNTS.md) — Ledger account structure for disbursement float
- [Security Standards](./security.md) — Banking-grade security requirements
