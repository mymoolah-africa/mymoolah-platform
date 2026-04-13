# Zapper SFTP Setup Guide

**Date**: 2026-04-13
**Status**: Ready for partner onboarding
**Purpose**: Configure SFTP access for Zapper daily mark-off file delivery

---

## Overview

Zapper will push daily reconciliation/mark-off files to MyMoolah's SFTP gateway. This follows the same pattern as SBSA, MobileMart, and Flash.

**Architecture**: Zapper SFTP push --> GCS bucket --> SFTPWatcherService poll --> ReconciliationOrchestrator

---

## Infrastructure

| Component | Value |
|-----------|-------|
| SFTP Gateway VM | `sftp-1-vm` (GCP Compute Engine, `africa-south1-a`) |
| Public IP | `34.35.137.166` |
| Port | `5022` |
| GCS Bucket | `gs://mymoolah-sftp-inbound` |
| Zapper GCS Prefix | `zapper/` |
| SFTP Username | `zapper` |
| Auth | SSH public key (provided by Dillon Poultney) |

---

## Setup Steps

### Step 1: Create SFTP User on Gateway VM

1. Access the SFTP Gateway admin UI: `https://34.35.137.166` (self-signed cert)
2. Navigate to **Users --> Add User**
3. Configure:
   - **Username**: `zapper`
   - **Authentication**: SSH key only (Dillon will provide public key)
   - **Home directory / GCS prefix**: `zapper/`
   - This maps to `gs://mymoolah-sftp-inbound/zapper/`
4. Save the user

### Step 2: Create GCS Directory Structure

```bash
# Create the zapper directory structure in GCS
gsutil cp /dev/null gs://mymoolah-sftp-inbound/zapper/.keep
gsutil cp /dev/null gs://mymoolah-sftp-inbound/zapper/inbox/.keep
```

### Step 3: Add Firewall Rule for Zapper IP

Once Dillon provides Zapper's source IP address(es):

```bash
# Allow Zapper to connect to our SFTP
gcloud compute firewall-rules create allow-zapper-sftp \
  --project=mymoolah-db \
  --allow=tcp:5022 \
  --source-ranges=<ZAPPER_IP>/32 \
  --target-tags=sftp-1-deployment \
  --description="Zapper SFTP access for daily mark-off files (port 5022)"

# Verify
gcloud compute firewall-rules list \
  --project=mymoolah-db \
  --filter="targetTags:sftp-1-deployment" \
  --format="table(name,sourceRanges,allowed)"
```

### Step 4: Verify IAM Permissions

The service accounts already have `roles/storage.objectAdmin` on the bucket (set up for SBSA). Verify:

```bash
gsutil iam get gs://mymoolah-sftp-inbound | grep -A2 "objectAdmin"
```

Both staging and production SAs should have access:
- `mymoolah-staging-sa@mymoolah-db.iam.gserviceaccount.com`
- `mymoolah-production-sa@mymoolah-db.iam.gserviceaccount.com`

### Step 5: Run Migration

```bash
./scripts/run-migrations-master.sh uat
./scripts/run-migrations-master.sh staging
./scripts/run-migrations-master.sh production
```

### Step 6: Test Connectivity

Ask Dillon to test:
```bash
sftp -P 5022 zapper@34.35.137.166
# Upload a test file
put test_markoff.csv inbox/test_markoff.csv
```

---

## Credentials to Share with Dillon

| Field | Value |
|-------|-------|
| Host | `34.35.137.166` |
| Port | `5022` |
| Username | `zapper` |
| Auth | SSH public key (Zapper provides their public key) |
| Target directory | `inbox/` |
| File format | CSV (comma-delimited, UTF-8, with header row) |

---

## Reconciliation File Format (Expected from Zapper)

Based on Zapper's transaction data structure (from Sarah-Lee's recon emails), expected CSV columns:

```
ZapperId,TransactionProcessorReference,PaymentCreatedUTCDate,ProcessedAmount,ZapperMerchantId,ZoomLoginMerchantName,OrganisationReference,PaymentMethodType,PaymentMethodTitle,TotalThirdPartyVouchersRedeemedAmount,TotalMerchantVouchersRedeemedAmount
```

**File naming**: `zapper_markoff_YYYYMMDD.csv` (to be confirmed with Dillon)

---

## Related Documentation

- `docs/SBSA_H2H_SETUP_GUIDE.md` -- SBSA SFTP setup (same pattern)
- `docs/RECONCILIATION_QUICK_START.md` -- Reconciliation framework
- `integrations/zapper/ZAPPER_REFERENCE.md` -- Zapper integration master reference
- `services/reconciliation/adapters/ZapperAdapter.js` -- Zapper file parser
- `migrations/20260413_01_add_zapper_reconciliation_config.js` -- DB config migration
