# Flash Reconciliation Integration

**Version**: 1.0.0  
**Date**: 2026-01-14  
**Status**: Ready for Configuration

---

## Overview

Flash reconciliation integration enables automated reconciliation of Flash supplier transactions with MMTP transactions. Flash uses the same SFTP infrastructure as MobileMart for reconciliation file delivery.

---

## SFTP Configuration

### Connection Details

- **SFTP Host**: `34.35.137.166` (Static IP)
- **SFTP Port**: `22`
- **SFTP Username**: `flash` (to be confirmed with Flash)
- **SFTP Path**: `/home/flash` (maps to `gs://mymoolah-sftp-inbound/flash/`)
- **Authentication**: SSH public key (Flash will provide their public key)
- **Network**: Same SFTP gateway as MobileMart (`sftp-1-vm`)

### IP Whitelisting

Flash requires IP whitelisting for SFTP access. Provide the following IP to Flash:

- **Primary SFTP Gateway IP**: `34.35.137.166` (Static IP - stable)

---

## File Format

### Flash Reconciliation File Structure

Flash provides reconciliation files in **semicolon-delimited CSV** format with the following structure:

**Header Row:**
```
Date;Reference;Transaction ID;Transaction Type;Product Code;Product;Account Number;Account Name;Gross Amount;Fee;Commission;Net Amount;Status;Metadata
```

**Transaction Rows:**
```
2025/10/29 08:38;87fb6bbb-daca-4e98-b2ec-2dcf99d78849;520861729;Purchase;311;R1 - R4000 1Voucher Token;7111-6222-4444-3692;Test;500.0000;0.0000;1.0000;499.0000;Success;"{""additionalProp1"":""string""}"
```

**Key Characteristics:**
- **Delimiter**: Semicolon (`;`)
- **Date Format**: `YYYY/MM/DD HH:mm` (e.g., `2025/10/29 08:38`)
- **Amount Format**: Decimal with 4 decimal places (e.g., `500.0000`)
- **Status Values**: `Success`, `Pending`, `Failed`, etc. (capitalized)
- **Metadata**: JSON string with escaped quotes
- **No Footer Row**: Totals are calculated from body transactions

### Column Mapping

| Column Index | Field Name | MMTP Mapping | Required |
|-------------|------------|--------------|----------|
| 0 | Date | `supplier_timestamp` | Yes |
| 1 | Reference | `supplier_reference` | Yes |
| 2 | Transaction ID | `supplier_transaction_id` | Yes |
| 3 | Transaction Type | `supplier_transaction_type` | No |
| 4 | Product Code | `supplier_product_code` | Yes |
| 5 | Product | `supplier_product_name` | Yes |
| 6 | Account Number | `supplier_account_number` | No |
| 7 | Account Name | `supplier_account_name` | No |
| 8 | Gross Amount | `supplier_amount` | Yes |
| 9 | Fee | `supplier_fee` | Yes |
| 10 | Commission | `supplier_commission` | Yes |
| 11 | Net Amount | `supplier_net_amount` | Yes |
| 12 | Status | `supplier_status` | Yes |
| 13 | Metadata | `supplier_metadata` | No |

---

## MMTP Reconciliation File Upload

Flash requires MMTP to upload reconciliation files in **CSV format** with the following fields:

### Required Fields

1. **Date** - Transaction date (format: `YYYY/MM/DD HH:mm`)
2. **Product_id** - Product identifier
3. **Product_description** - Product name/description
4. **Amount** - Transaction amount
5. **Partner_transaction_reference** - MMTP transaction reference
6. **Flash_transactionID** - Flash transaction ID
7. **Transaction_state** - Transaction status (`Success`, `Pending`, `Failed`, etc.)

### File Generation

Use `FlashReconciliationFileGenerator.js` to generate reconciliation files:

```javascript
const FlashReconciliationFileGenerator = require('./services/reconciliation/FlashReconciliationFileGenerator');

const generator = new FlashReconciliationFileGenerator();

const outputPath = await generator.generate(
  mmtpTransactions,  // Array of MMTP transactions
  settlementDate,     // Settlement date
  '/path/to/output.csv'
);
```

---

## Database Configuration

Flash supplier configuration is stored in `recon_supplier_configs` table:

- **Supplier Code**: `FLASH`
- **Adapter Class**: `FlashAdapter`
- **File Pattern**: `recon_YYYYMMDD.csv`
- **Delimiter**: `;`
- **Timezone**: `Africa/Johannesburg`

### Migration

Run the migration to add Flash configuration:

```bash
npx sequelize-cli db:migrate
```

Migration file: `migrations/20260114_add_flash_reconciliation_config.js`

---

## Implementation Components

### 1. FlashAdapter.js

**Location**: `services/reconciliation/adapters/FlashAdapter.js`

Parses Flash CSV reconciliation files with:
- Semicolon delimiter support
- Date format parsing (`YYYY/MM/DD HH:mm`)
- Metadata JSON parsing (with escaped quotes)
- Footer calculation (Flash files don't have footer rows)
- Status normalization (to lowercase for comparison)

### 2. FileParserService Integration

**Location**: `services/reconciliation/FileParserService.js`

FlashAdapter is registered in the FileParserService constructor:

```javascript
this.adapters = {
  MobileMartAdapter: new MobileMartAdapter(),
  FlashAdapter: new FlashAdapter(),
  // ...
};
```

### 3. FlashReconciliationFileGenerator.js

**Location**: `services/reconciliation/FlashReconciliationFileGenerator.js`

Generates CSV files for upload to Flash with:
- Required 7-column format
- Status mapping (MMTP → Flash)
- Date formatting
- CSV escaping for product descriptions

### 4. SFTP Watcher Service

**Location**: `services/reconciliation/SFTPWatcherService.js`

The SFTP watcher automatically detects and processes Flash reconciliation files:
- Monitors `gs://mymoolah-sftp-inbound/flash/`
- Matches files against pattern: `recon_YYYYMMDD.csv`
- Triggers ReconciliationOrchestrator for processing

---

## Matching Rules

Flash reconciliation uses the following matching rules:

### Primary Matching
- `transaction_id` (Flash Transaction ID)
- `reference` (Flash Reference UUID)

### Secondary Matching
- `amount` (Gross Amount)
- `timestamp` (Transaction Date)
- `product_code` (Product Code)

### Fuzzy Matching
- Enabled with minimum confidence: `0.85`
- Used when exact matches fail

---

## Commission Reconciliation

Flash commission reconciliation:
- **Commission Field**: `commission` (from file)
- **VAT Inclusive**: Yes
- **VAT Rate**: 15%
- **Calculation Method**: From file (direct field mapping)

---

## Alert Configuration

Flash reconciliation alerts are sent to:
- `finance@mymoolah.africa`
- `andre@mymoolah.africa`

**Critical Variance Threshold**: R1,000.00

---

## Testing

### Test Flash Adapter

```javascript
const FlashAdapter = require('./services/reconciliation/adapters/FlashAdapter');
const fs = require('fs').promises;

const adapter = new FlashAdapter();
const content = await fs.readFile('/path/to/flash_recon_file.csv', 'utf-8');
const config = {
  delimiter: ';',
  timezone: 'Africa/Johannesburg'
};

const result = await adapter.parse(content, config);
console.log('Parsed:', result);
```

### Test Reconciliation Flow

1. Upload sample Flash reconciliation file to SFTP
2. Verify SFTP watcher detects the file
3. Check reconciliation run in database
4. Verify transaction matches
5. Review reconciliation report

---

## Flash Requirements Checklist

### Information to Provide to Flash

- [x] **SFTP Host**: `34.35.137.166` ✅
- [x] **SFTP Port**: `22` ✅
- [ ] **SFTP Username**: Confirm with Flash (likely `flash`)
- [ ] **SFTP Path**: Confirm with Flash (likely `/home/flash`)
- [ ] **IP Whitelisting**: `34.35.137.166` ✅
- [ ] **Company Logo**: Provide file or URL
- [ ] **Website URL**: `https://mymoolah.africa` ✅
- [ ] **Main Contact Email**: `andre@mymoolah.africa` (or `finance@mymoolah.africa`)
- [ ] **Fraud Contact**: Email and phone number

### Information Needed from Flash

- [ ] **SSH Public Key**: For SFTP authentication
- [ ] **Source IP/CIDR Ranges**: For firewall whitelisting
- [ ] **SFTP Username Confirmation**: Verify username is `flash`
- [ ] **SFTP Path Confirmation**: Verify path is `/home/flash`
- [ ] **File Upload Schedule**: Daily, weekly, or on-demand
- [ ] **Reconciliation File Upload Method**: SFTP, API, or email

---

## Next Steps

1. **Confirm SFTP Details**: Verify username and path with Flash
2. **Configure Firewall**: Add Flash source IPs to firewall rules
3. **Add SSH Key**: Configure Flash's SSH public key on SFTP gateway
4. **Run Migration**: Execute migration to add Flash configuration
5. **Test File Processing**: Upload test file and verify processing
6. **Generate Upload File**: Test FlashReconciliationFileGenerator
7. **UAT Testing**: End-to-end reconciliation flow testing
8. **Production Deployment**: Deploy after UAT sign-off

---

## Related Documentation

- [Reconciliation Framework](../RECONCILIATION_FRAMEWORK.md)
- [Reconciliation Quick Start](../RECONCILIATION_QUICK_START.md)
- [Flash Products Integration](./Flash_Products.md)
- [SFTP Gateway Setup](../session_logs/2025-12-08_1430_sftp-gcs-gateway.md)

---

## Support

For issues or questions:
- **Technical**: Check reconciliation logs in `recon_audit_trail` table
- **SFTP Issues**: Verify SFTP gateway VM is running and accessible
- **File Format**: Verify file matches expected structure (semicolon-delimited)
- **Matching Issues**: Review matching rules and tolerance settings
