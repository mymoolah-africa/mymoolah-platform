# Zapper SFTP — Test Handshake Fixture

## Purpose

A minimal, synthetic Zapper mark-off CSV used for the initial end-to-end SFTP handshake with Dillon Poultney. This file is NOT real Zapper data — it is a 1-row dummy whose only job is to prove the full pipeline works end-to-end before real daily files start flowing.

## What a successful handshake looks like

| Stage | Expected result |
|-------|-----------------|
| TCP / Auth | Dillon can `sftp -P 5022 zapper@34.35.137.166` using his private key with no password prompt |
| SFTP put | `put zapper_markoff_TESTHANDSHAKE.csv inbox/zapper_markoff_TESTHANDSHAKE.csv` succeeds |
| GCS landing | File appears at `gs://mymoolah-sftp-inbound/zapper/inbox/zapper_markoff_TESTHANDSHAKE.csv` |
| Watcher pickup | `SFTPWatcherService` polls and detects the new file within 60s of landing |
| Parser | `ZapperAdapter` parses the single row without errors (1 transaction, R1.00 total) |
| Archive | File is moved to `gs://mymoolah-sftp-inbound/processed/zapper/` on success, or `failed/zapper/` on parser error |

## Filename

`zapper_markoff_TESTHANDSHAKE.csv` — deliberately does NOT match the production pattern `zapper_markoff_YYYYMMDD.csv`. This means the watcher will:

- **If watcher runs with default pattern** (`zapper_markoff_YYYYMMDD.csv`): the handshake file will NOT be auto-picked up — it lands in GCS but is ignored. You can still verify the landing manually with `gsutil ls`.
- **If you want auto-pickup during testing**: either (a) rename the file to `zapper_markoff_20260422.csv` before Dillon uploads it, or (b) temporarily broaden the DB pattern to `zapper_markoff_%.csv` for the test window.

The conservative default is option (a) — name the test file with today's date so it's indistinguishable from a real future file, confirming the watcher's pattern logic also works.

## Content

```csv
ZapperId,TransactionProcessorReference,PaymentCreatedUTCDate,ProcessedAmount,ZapperMerchantId,ZoomLoginMerchantName,OrganisationReference,PaymentMethodType,PaymentMethodTitle,TotalThirdPartyVouchersRedeemedAmount,TotalMerchantVouchersRedeemedAmount
TEST0000000000000001,11111111-1111-1111-1111-111111111111,"Apr 22, 2026 9:00am",1.00,99999,MyMoolah SFTP Handshake Test,test-org-ref-0001,2,ExternalPaymentMethod,0.00,0.00
```

## Columns mapped by `ZapperAdapter`

- `ZapperId` → `supplier_transaction_id`
- `TransactionProcessorReference` → `supplier_reference`
- `PaymentCreatedUTCDate` → `supplier_timestamp` (parsed via `moment.tz` with format `MMM D, YYYY h:mma`)
- `ProcessedAmount` → `supplier_amount`
- `ZoomLoginMerchantName` → `supplier_product_name` / `supplier_account_name`
- `ZapperMerchantId` → `supplier_product_code` + metadata
- `OrganisationReference` → `supplier_account_number` + metadata
- `PaymentMethodType` / `PaymentMethodTitle` → `supplier_transaction_type` + metadata
- Voucher columns → metadata only

## How to use

1. Either ship this file directly to Dillon with instructions to `put` it into `inbox/`, OR
2. Rename to `zapper_markoff_20260422.csv` (or today's date) if you want the watcher to auto-ingest it on the first real production-style pass.

## Reconciliation implications

This row has `supplier_transaction_id = TEST0000000000000001` — guaranteed to have no match in the MyMoolah Zapper transaction history. Expected result: **1 unmatched row** in the reconciliation report, which is correct behaviour and proves the unmatched-handling path.
