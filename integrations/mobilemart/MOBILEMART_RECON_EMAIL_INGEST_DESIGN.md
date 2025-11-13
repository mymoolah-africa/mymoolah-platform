# MobileMart Reconciliation via Email (SMTP) – GCP Design

Last Updated: 2025-11-10  
Status: DESIGN APPROVED FOR LATER IMPLEMENTATION  
Scope: Production-only (Google Cloud Services). MobileMart delivers CSV recon files to an SMTP inbox we control.

---

## 1) Objectives
- Accept MobileMart reconciliation CSV via email (SMTP-only constraint).
- Event-driven, bank/Mojaloop-grade security, scalable to high volume.
- Idempotent loading and deterministic reconciliation against MMTP transactions.
- Immutable audit trail, verifiable lineage, and automated exception reporting.

---

## 2) High-level Architecture (Textual)
1. MobileMart → sends email with CSV attachment to recon@recon.mymoolah.africa (TLS required; DKIM/SPF pass).
2. Gmail (Google Workspace) receives mail into a dedicated mailbox (no human access).
3. Gmail Push Notifications → Pub/Sub topic `recon-inbound`.
4. Pub/Sub (signed push) → Cloud Run service `mail-ingest` (private, IAM/IAP/mTLS).
5. `mail-ingest`:
   - Uses Gmail API to fetch the new message.
   - Verifies SPF/DKIM/DMARC; validates sender/IP/domain and TLSReceived.
   - Extracts CSV attachment(s), validates MIME, size, schema; computes SHA-256.
   - Virus scan (ClamAV sidecar or AV SaaS).
   - Stores raw email (RFC822) and raw CSV to GCS:
     - `gs://mmtp-recon-prod/mobilemart/raw/YYYY/MM/DD/{messageId}.eml`
     - `gs://mmtp-recon-prod/mobilemart/raw/YYYY/MM/DD/{sha256}.csv`
   - Writes manifest JSON:
     - `gs://mmtp-recon-prod/mobilemart/manifests/{sha256}.json`
   - Emits `object finalize` (GCS → Pub/Sub).
6. Cloud Run/Dataflow `recon-loader` subscribed to GCS finalize:
   - Re-validates checksum; rejects duplicates via `file_hash` table.
   - Normalizes CSV → canonical schema; optional Parquet to `curated/`.
   - Bulk loads rows into Cloud SQL staging: `recon_mobilemart_staging`.
   - Calls reconciliation procedure/service.
7. Reconciliation (`recon-engine` stored proc or Cloud Run microservice):
   - Joins staging to `transactions` / `vas_transactions` on composite keys.
   - Classifies variances (missing_on_supplier, missing_on_mmtp, amount_mismatch, status_mismatch, duplicate_supplier_reference, late_posting).
   - Writes to `recon_result` (header) and `recon_breakdown` (lines); logs all operations to `audit_log`.
8. Reporter `recon-report`:
   - Generates CSV + signed PDF (hash embedded) to `gs://mmtp-recon-prod/reports/YYYY/MM/DD/{sha256}/`.
   - Emails summary to Finance/Ops with signed links (no attachments), plus Slack/Teams webhook.

---

## 3) GCP Resources
### 3.1 Domains & Email
- Domain: `recon.mymoolah.africa` (subdomain).
- Google Workspace mailbox: `recon@recon.mymoolah.africa`.
- DNS: MX → Google, SPF include, DKIM enabled, DMARC `p=quarantine` (prod → `p=reject` after burn-in).
- Inbound security:
  - Require TLS.
  - Gmail inbound gateway rules to allowlist MobileMart sender domain/IPs.
  - Auto-quarantine failures.

### 3.2 Storage & Events
- GCS bucket (prod): `gs://mmtp-recon-prod` (CMEK via Cloud KMS).
  - Folders: `/mobilemart/raw/`, `/mobilemart/manifests/`, `/mobilemart/curated/`, `/reports/`.
  - Uniform bucket-level access; VPC-SC perimeter.
  - Retention policy: 7 years (configurable), optional Bucket Lock (WORM) after stabilization.
- Pub/Sub:
  - `recon-inbound` (Gmail watch).
  - `recon-gcs-finalized` (auto from GCS notifications).
  - Dead-letter topics for each subscription.

### 3.3 Compute
- Cloud Run services (min instances 0, max autoscale):
  - `mail-ingest` (Gmail push → fetch/validate/persist to GCS).
  - `recon-loader` (GCS finalize → normalize/load to Cloud SQL).
  - `recon-engine` (optional if not using stored proc).
  - `recon-report` (render reports + email/Slack).
  - All services behind IAP / OIDC audience checks; private egress via Serverless VPC Access if needed.
- Optional: Dataflow for very large CSVs.

### 3.4 Data Plane
- Cloud SQL (PostgreSQL 16, HA, CMEK):
  - `recon_files` (file headers & statuses).
  - `recon_mobilemart_staging` (partitioned by `file_date`).
  - `recon_result` (one per file).
  - `recon_breakdown` (line-level variances).
  - `audit_log` (immutable ops log).

---

## 4) Security & Compliance (Bank/Mojaloop Grade)
- Transport security:
  - Inbound email via TLS; enforce DMARC/SPF/DKIM alignment; reject/quarantine fails.
  - Gmail push → Pub/Sub → Cloud Run with signed JWT, audience validation, and mTLS/IAP where applicable.
- At rest:
  - CMEK on GCS & Cloud SQL; rotate KMS keys per policy.
  - Secrets in Google Secret Manager; no credentials in code or `.env`.
- Identity & Access:
  - Dedicated service accounts per microservice (least privilege).
  - Conditional IAM on buckets (service accounts only).
  - VPC Service Controls around storage and SQL.
- Governance:
  - WORM (Bucket Lock) for raw artifacts after initial trial phase (optional).
  - Complete audit via `audit_log` and Cloud Audit Logs.
  - Retention policies per regulatory requirements.

---

## 5) File & Message Validation
- Email metadata:
  - Verify `From` against allowlist; check DKIM `pass`, SPF `pass`, DMARC `pass`, `X-Gm-Message-State`, and TLSReceived.
  - Reject/park if any anti-abuse signals fail.
- Attachment:
  - MIME: `text/csv` or `application/vnd.ms-excel` (configurable).
  - Size limit (e.g., 25 MB; configurable).
  - Virus scan: ClamAV sidecar or external scanning API.
  - Schema validation: required columns, delimiter, quoting, header presence.
- Deduplication/idempotency:
  - Compute `sha256(file_bytes)` for file identity.
  - Store `message_id`, `date`, `sha256`, `sender`, `dkim_result`, `spf_result`.
  - Reject replays by `sha256` and `message_id` in `recon_files`.

---

## 6) Data Model (DDL Sketch)
```sql
-- File registry
CREATE TABLE IF NOT EXISTS recon_files (
  id               BIGSERIAL PRIMARY KEY,
  supplier         TEXT NOT NULL,                 -- 'mobilemart'
  message_id       TEXT UNIQUE NOT NULL,
  file_hash        TEXT UNIQUE NOT NULL,          -- sha256
  received_at      TIMESTAMPTZ NOT NULL,
  file_date        DATE NOT NULL,
  raw_uri          TEXT NOT NULL,                 -- gs://.../raw/...csv
  manifest_uri     TEXT NOT NULL,                 -- gs://.../manifests/...json
  row_count        INTEGER DEFAULT 0,
  status           TEXT NOT NULL,                 -- received|validated|loaded|reconciled|reported|failed
  dkim_pass        BOOLEAN,
  spf_pass         BOOLEAN,
  dmarc_pass       BOOLEAN,
  tls_received     BOOLEAN,
  created_at       TIMESTAMPTZ DEFAULT now(),
  updated_at       TIMESTAMPTZ DEFAULT now()
);

-- Staging (example columns; align with supplier CSV)
CREATE TABLE IF NOT EXISTS recon_mobilemart_staging (
  id                 BIGSERIAL PRIMARY KEY,
  file_hash          TEXT NOT NULL,
  row_hash           TEXT NOT NULL,                -- sha256 of normalized row
  supplier_txn_id    TEXT,
  merchant_product_id TEXT,
  msisdn             TEXT,
  amount_cents       BIGINT,
  currency           TEXT,
  status             TEXT,
  value_date         DATE,
  processed_at       TIMESTAMPTZ,
  raw_row            JSONB,
  created_at         TIMESTAMPTZ DEFAULT now(),
  UNIQUE(file_hash, row_hash)
) PARTITION BY RANGE (value_date);

-- Reconciliation results (header)
CREATE TABLE IF NOT EXISTS recon_result (
  id                 BIGSERIAL PRIMARY KEY,
  file_hash          TEXT UNIQUE NOT NULL,
  supplier           TEXT NOT NULL,
  file_date          DATE NOT NULL,
  total_rows         INTEGER NOT NULL,
  matched_rows       INTEGER NOT NULL,
  variance_rows      INTEGER NOT NULL,
  created_at         TIMESTAMPTZ DEFAULT now()
);

-- Variance lines
CREATE TABLE IF NOT EXISTS recon_breakdown (
  id                 BIGSERIAL PRIMARY KEY,
  recon_result_id    BIGINT REFERENCES recon_result(id),
  variance_type      TEXT NOT NULL,               -- missing_on_supplier|missing_on_mmtp|amount_mismatch|status_mismatch|duplicate|late_posting
  supplier_txn_id    TEXT,
  mmtp_txn_id        TEXT,
  msisdn             TEXT,
  amount_supplier    BIGINT,
  amount_mmtp        BIGINT,
  currency           TEXT,
  value_date         DATE,
  details            JSONB,
  created_at         TIMESTAMPTZ DEFAULT now()
);

-- Immutable audit log
CREATE TABLE IF NOT EXISTS audit_log (
  id             BIGSERIAL PRIMARY KEY,
  actor_sa       TEXT NOT NULL,
  action         TEXT NOT NULL,             -- ingest|validate|load|reconcile|report
  resource       TEXT NOT NULL,             -- gs://..., file_hash, recon_result_id, etc.
  meta           JSONB,
  created_at     TIMESTAMPTZ DEFAULT now()
);
```

---

## 7) Reconciliation Logic (Outline)
Matching keys (prioritized fallback):
1. Exact supplier_txn_id ↔ `vas_transactions.supplierReference`.
2. Fallback composite: (msisdn, merchant_product_id, amount_cents, value_date ± tolerance).
3. Handle duplicates by keeping earliest processed and flagging extras.

Variance types:
- `missing_on_mmtp`: in supplier, not in our prod.
- `missing_on_supplier`: in our prod, not in supplier file for window.
- `amount_mismatch`: same key but amount differs (include currency handling).
- `status_mismatch`: e.g., supplier says failed, we show completed.
- `duplicate_supplier_reference`: same supplier_txn_id multiple rows.
- `late_posting`: appears outside configured window.

Tolerance & windows:
- Amount tolerance: 0 or configured per product.
- Time window: e.g., same calendar day; configurable.
- Currency normalization (assume ZAR).

Outputs:
- `recon_result` header row with counts.
+- `recon_breakdown` rows per variance.
+- Signed PDF + CSV summary to `reports/`.

---

## 8) Reporting & Notifications
- Email (Gmail API) to Finance/Ops:
  - Subject: `MobileMart Recon – {file_date} – {matched}/{total} matched`
  - Body: KPIs + secure links to reports in GCS (signed URLs or IAP-protected).
- Slack/Teams webhook: brief KPIs + link to dashboard.
- Dashboard: Looker Studio or BigQuery + views over `recon_*` tables.

---

## 9) Operations & SRE
- Scheduling:
  - Primary: Event-driven on email arrival.
  - Fallback: Cloud Scheduler daily at T+1 to re-run reconciliation for last N days.
- Observability:
  - Cloud Logging + Error Reporting; metrics on files processed, row counts, match rate, variances, time-to-report.
  - SLOs: Ingest < 2 min; Load < 5 min; Reconcile < 10 min; Report < 5 min.
  - DLQ/Retry:
  - Pub/Sub dead-letter topics; exponential backoff; poison-pill detection (quarantine bad files).
  - Runbooks:
  - How to reprocess a file by `file_hash`.
  - How to quarantine and notify supplier on invalid files.
  - How to regenerate reports for a date range.

---

## 10) IAM & Secrets
- Service Accounts:
  - `sa-mail-ingest@…`: Gmail API read, GCS write (raw/manifests), Pub/Sub publish, Secret Manager access.
  - `sa-recon-loader@…`: GCS read, Cloud SQL client, Secret Manager, Pub/Sub sub.
  - `sa-recon-engine@…`: Cloud SQL client, Secret Manager.
  - `sa-recon-report@…`: GCS write, Gmail API send, Secret Manager.
- Secrets:
  - Gmail API client (domain-wide delegation) in Secret Manager.
  - HMAC validation keys (if using alternate inbound providers).
  - Report signing key (optional PKI) in KMS/Secret Manager.

---

## 11) Configuration (per environment)
```env
# Recon email ingestion
RECON_SUPPLIER=mobilemart
RECON_INBOX_ADDRESS=recon@recon.mymoolah.africa
RECON_INBOUND_DOMAIN=recon.mymoolah.africa
RECON_ALLOWED_SENDERS=*@mobilemart.co.za
RECON_MAX_ATTACHMENT_MB=25
RECON_GCS_BUCKET=mmtp-recon-prod
RECON_GCS_PREFIX=mobilemart
RECON_REQUIRE_TLS=true
RECON_REQUIRE_DKIM=true
RECON_REQUIRE_SPF=true
RECON_REQUIRE_DMARC=true
```

---

## 12) Implementation Plan (Phased)
Phase 1 – Foundations
- Provision Workspace mailbox, DNS (SPF/DKIM/DMARC).
- Create GCS bucket (CMEK, VPC‑SC), Pub/Sub topics, service accounts, KMS keys.
- Implement `mail-ingest` (Gmail watch → GCS raw+manifest).

Phase 2 – Loader & Staging
- Implement `recon-loader` (normalize, validate, load).
- Create SQL schema, partitions, constraints, idempotency keys.

Phase 3 – Reconciliation
- Implement stored procedure or microservice `recon-engine`.
- Unit tests with synthetic CSV and known transaction sets.

Phase 4 – Reporting & Ops
- Implement `recon-report` (CSV+PDF, email links).
- Dashboards + alerting; DLQ and runbooks; performance tests.

---

## 13) Risks & Mitigations
- Supplier misconfiguration (wrong email/IP): enforce DKIM/SPF/DMARC + allowlist.
- Duplicate or replayed files: `sha256` + `message_id` idempotency.
- Malicious payloads: virus scan, strict MIME/size/schema gate.
- High volume spikes: Pub/Sub buffering + autoscaling Cloud Run/Dataflow.
- PII/Compliance: encrypt at rest (CMEK), strict IAM, retention/WORM as required.

---

## 14) Deliverables (When Implementing)
- Cloud Run services (4), Terraform/IaC modules, IAM/KMS policies.
- SQL migrations for recon tables & procedures.
 - Unit/integration tests & synthetic test CSVs.
- Operations runbook & SLA/SLO definitions.

---

This design honors the supplier’s SMTP-only constraint while maintaining banking-grade security, auditability, and scalability using native Google Cloud services. It is Mojaloop-aligned by emphasizing reliability, integrity, and traceability of financial data across domains. 


