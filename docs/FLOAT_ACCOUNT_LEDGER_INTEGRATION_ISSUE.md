# Float Account Ledger Integration Issue

**Date**: 2026-01-15  
**Status**: ✅ **FIXED** (2026-01-15)  
**Priority**: High - Banking-grade compliance requirement

---

## Problem Statement

Float accounts are currently using **operational identifiers** (e.g., `ZAPPER_FLOAT_001`, `EASYPAY_CASHOUT_FLOAT_001`) as ledger account codes when posting journal entries. This violates banking-grade accounting standards and Mojaloop alignment requirements.

### Current Implementation (INCORRECT)

```javascript
// controllers/voucherController.js (line 827-833)
const floatAccountCode = cashoutFloat.floatAccountNumber || 'EASYPAY_CASHOUT_FLOAT_001';

await ledgerService.postJournalEntry({
  lines: [
    { accountCode: LEDGER_ACCOUNT_CLIENT_FLOAT, dc: 'debit', amount: totalRequired },
    { accountCode: floatAccountCode, dc: 'credit', amount: amount }, // ❌ WRONG - using operational ID
    // ...
  ]
});
```

**Issues:**
1. `floatAccountNumber` is an operational identifier, not a ledger account code
2. Ledger account codes must follow the chart of accounts format (e.g., `2100-01-01`, `2200-02-01`)
3. The ledger system expects account codes that exist in the `ledger_accounts` table
4. This breaks double-entry accounting compliance and reconciliation

---

## Required Solution

### 1. Add Ledger Account Code Configuration

Each supplier float account must have a corresponding ledger account code configured in environment variables:

```bash
# =============================================================================
# SUPPLIER FLOAT LEDGER ACCOUNTS
# =============================================================================
# Supplier Float Accounts (Asset accounts - prefunded balances payable to suppliers)
LEDGER_ACCOUNT_ZAPPER_FLOAT=1200-10-01
LEDGER_ACCOUNT_EASYPAY_TOPUP_FLOAT=1200-10-02
LEDGER_ACCOUNT_EASYPAY_CASHOUT_FLOAT=1200-10-03
LEDGER_ACCOUNT_FLASH_FLOAT=1200-10-04
LEDGER_ACCOUNT_MOBILEMART_FLOAT=1200-10-05
LEDGER_ACCOUNT_DTMERCURY_FLOAT=1200-10-06

# Operational Identifiers (for reference, NOT for ledger)
ZAPPER_FLOAT_ACCOUNT_NUMBER=ZAPPER_FLOAT_001
EASYPAY_TOPUP_FLOAT_ID=easypay_topup
EASYPAY_CASHOUT_FLOAT_ID=easypay_cashout
```

### 2. Update SupplierFloat Model

Add a `ledgerAccountCode` field to the `SupplierFloat` model:

```javascript
// models/SupplierFloat.js
ledgerAccountCode: {
  type: DataTypes.STRING(64),
  allowNull: true,
  comment: 'Ledger account code for this float (e.g., 1200-10-01)'
}
```

### 3. Update Float Account Creation

When creating float accounts, store the ledger account code:

```javascript
// In migrations or seed scripts
await SupplierFloat.create({
  supplierId: 'zapper',
  supplierName: 'Zapper',
  floatAccountNumber: 'ZAPPER_FLOAT_001', // Operational ID
  ledgerAccountCode: process.env.LEDGER_ACCOUNT_ZAPPER_FLOAT || '1200-10-01',
  // ...
});
```

### 4. Fix Ledger Posting Code

Update all ledger posting code to use `ledgerAccountCode` instead of `floatAccountNumber`:

```javascript
// controllers/voucherController.js
const ledgerAccountCode = cashoutFloat.ledgerAccountCode || 
  process.env.LEDGER_ACCOUNT_EASYPAY_CASHOUT_FLOAT;

if (!ledgerAccountCode) {
  throw new Error('Ledger account code not configured for EasyPay Cash-out Float');
}

await ledgerService.postJournalEntry({
  lines: [
    { accountCode: LEDGER_ACCOUNT_CLIENT_FLOAT, dc: 'debit', amount: totalRequired },
    { accountCode: ledgerAccountCode, dc: 'credit', amount: amount }, // ✅ CORRECT
    // ...
  ]
});
```

---

## Chart of Accounts Structure

Based on `docs/SETTLEMENTS.md` and existing configuration:

### Account Numbering Convention

- **1000-1999**: Assets
  - **1100-1199**: Cash and Bank Accounts
    - `1100-01-01`: MM House Cash (Bank Account)
  - **1200-1299**: Float Accounts (Asset - Prefunded balances payable to suppliers)
    - `1200-10-01`: Zapper Float
    - `1200-10-02`: EasyPay Top-up Float
    - `1200-10-03`: EasyPay Cash-out Float
    - `1200-10-04`: Flash Float
    - `1200-10-05`: MobileMart Float
    - `1200-10-06`: DT Mercury Float
  - **1200-05-01**: Interchange/Clearing Control

- **2000-2999**: Liabilities
  - **2100-2199**: Client Floats (Liability - Funds owed to clients)
    - `2100-01-01`: Client Float (general)
    - `2100-02-01`: Client Settlement Clearing
  - **2200-2299**: Supplier Clearing
    - `2200-01-01`: MM Commission Clearing
    - `2200-02-01`: Supplier Settlement Clearing
  - **2300-2399**: VAT and Tax Control
    - `2300-10-01`: VAT Control

- **4000-4999**: Revenue
  - `4000-10-01`: Commission Revenue
  - `4000-20-01`: Transaction Fee Revenue

---

## Migration Plan

1. **Phase 1: Add Configuration**
   - Add ledger account code env vars to `env.template`
   - Document the chart of accounts structure
   - Create ledger accounts in the database (if not exist)

2. **Phase 2: Update Model**
   - Add `ledgerAccountCode` field to `SupplierFloat` model
   - Create migration to add column
   - Update existing float accounts with ledger codes

3. **Phase 3: Fix Code**
   - Update all ledger posting code to use `ledgerAccountCode`
   - Add validation to ensure ledger codes exist before posting
   - Update all controllers/services that post float-related journal entries

4. **Phase 4: Testing & Validation**
   - Verify all journal entries use correct account codes
   - Test reconciliation with proper account codes
   - Validate trial balance shows correct float account balances

---

## Files Requiring Updates

1. **Configuration**
   - `env.template` - Add ledger account code env vars
   - `docs/SETTLEMENTS.md` - Document float account ledger codes

2. **Models**
   - `models/SupplierFloat.js` - Add `ledgerAccountCode` field
   - Migration to add column to `supplier_floats` table

3. **Controllers**
   - `controllers/voucherController.js` - Fix EasyPay cash-out ledger posting
   - `controllers/qrPaymentController.js` - Fix Zapper float ledger posting
   - Any other controllers posting float-related journal entries

4. **Services**
   - `services/ledgerService.js` - Add validation for account code existence
   - Any services that create or update float accounts

---

## Compliance Impact

**Current State**: ❌ Non-compliant
- Operational identifiers used as ledger account codes
- Breaks double-entry accounting standards
- Reconciliation will fail
- Audit trail incomplete

**After Fix**: ✅ Compliant
- Proper ledger account codes used
- Banking-grade double-entry accounting
- Full reconciliation capability
- Complete audit trail

---

## Related Documentation

- `docs/SETTLEMENTS.md` - Settlements & Float Model
- `docs/BANKING_GRADE_ARCHITECTURE.md` - Banking-grade requirements
- `docs/AGENT_HANDOVER.md` - Current system status

---

**Action Required**: This issue must be resolved before proceeding with float account consolidation or any production deployment.
