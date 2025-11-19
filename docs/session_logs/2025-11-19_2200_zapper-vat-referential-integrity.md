# Session Log - 2025-11-19 - Zapper VAT Transaction Fee & Referential Integrity

**Session Date**: 2025-11-19 22:00  
**Agent**: Cursor AI Agent  
**User**: André  
**Session Duration**: ~3 hours

---

## Session Summary
Implemented comprehensive VAT calculation for Zapper transaction fees with proper input/output VAT tracking, created database schema for VAT reconciliation, and enforced banking-grade referential integrity with foreign key constraints. Fixed multiple migration issues and successfully tested payment processing with VAT transactions.

---

## Tasks Completed
- [x] Implemented VAT calculation logic for Zapper transaction fees (input vs output VAT)
- [x] Created database migrations for VAT tracking (supplier_tier_fees, tax_transactions, supplier_vat_reconciliation)
- [x] Updated tierFeeService.js with detailed VAT calculations (exclusive/inclusive amounts)
- [x] Updated qrPaymentController.js to allocate VAT correctly (input/output VAT transactions)
- [x] Fixed foreign key constraint issues for tax_transactions table
- [x] Created unique constraint on transactions.transactionId for referential integrity
- [x] Created foreign key constraint linking tax_transactions to transactions
- [x] Successfully tested payment processing with VAT transactions
- [x] Fixed VAT calculation errors (corrected exclusive/inclusive logic)

---

## Key Decisions
- **VAT Exclusive Base**: Store all fee percentages as VAT-exclusive internally, calculate VAT-inclusive for display (banking best practice)
- **Input vs Output VAT**: Separate TaxTransaction records for input VAT (paid to Zapper, claimable) and output VAT (charged to customer, payable)
- **Referential Integrity**: Enforced with unique constraint on transactions.transactionId and foreign key on tax_transactions.originalTransactionId
- **VAT Rates**: Zapper fee 0.4% VAT-exclusive (0.46% VAT-inclusive), MM fees include 15% VAT on top of base percentages
- **Development Tier Override**: User ID 1 (André) locked to Platinum tier in development for testing

---

## Files Modified
- `services/tierFeeService.js` - Added comprehensive VAT calculation logic for all fee types (percentage, fixed, hybrid)
- `controllers/qrPaymentController.js` - Updated VAT allocation to create separate input/output VAT transactions
- `migrations/20251119_add_vat_tracking_to_supplier_tier_fees.js` - Added VAT columns to supplier_tier_fees table
- `migrations/20251119_add_vat_direction_to_tax_transactions.js` - Added VAT direction tracking (input/output)
- `migrations/20251119_create_supplier_vat_reconciliation.js` - Created VAT reconciliation table
- `migrations/20251119_ensure_tax_transactions_table_exists.js` - Ensured tax_transactions table exists
- `migrations/20251119_fix_tax_transactions_foreign_key.js` - Fixed foreign key constraint (incorrect table reference)
- `migrations/20251119_ensure_tax_transactions_foreign_key_integrity.js` - Final migration to ensure referential integrity
- `routes/qrpayments.js` - Added tipAmount validation

---

## Code Changes Summary
- **VAT Calculation**: Complete VAT calculation system with exclusive/inclusive amounts, input/output VAT tracking
- **Database Schema**: Added VAT tracking columns, VAT direction enum, reconciliation table
- **Referential Integrity**: Unique constraint on transactionId, foreign key constraint on tax_transactions
- **Fee Structure**: Updated to VAT-inclusive percentages (Bronze 1.265%, Silver 1.15%, Gold 0.92%, Platinum 0.69%)
- **Zapper Fee**: 0.4% VAT-exclusive (0.46% VAT-inclusive) properly allocated to Zapper float account

---

## Issues Encountered
- **Migration Errors**: Multiple migration issues with PostgreSQL ENUM types and table existence checks
- **Foreign Key Constraint**: Initial constraint referenced wrong table (mymoolah_transactions instead of transactions)
- **Unique Constraint Missing**: PostgreSQL requires unique constraint (not just index) for foreign key references
- **Permission Errors**: Database user lacked permissions to create indexes/constraints (resolved by creating as postgres superuser)
- **VAT Calculation Error**: Initial implementation incorrectly divided VAT-exclusive percentages (fixed to add VAT instead)
- **Transaction Abort Errors**: Migration transaction aborts due to mixing SELECT and DDL operations (fixed by separating operations)

---

## Testing Performed
- [x] Payment processing test with R100 amount (Platinum tier)
- [x] VAT transaction creation verification
- [x] Foreign key constraint validation
- [x] Fee calculation accuracy (R1.15 for R100 Platinum - correct)
- [x] Test results: All tests passing, VAT transactions created successfully

---

## Next Steps
- [ ] Verify VAT transactions are being created correctly in production
- [ ] Test VAT reconciliation reports
- [ ] Monitor VAT transaction creation in production
- [ ] Review VAT allocation logic with accounting team
- [ ] Set up automated VAT reconciliation process

---

## Important Context for Next Agent
- **VAT Structure**: All fees stored as VAT-exclusive internally, VAT-inclusive for display. Zapper fee 0.4% VAT-exclusive (0.46% VAT-inclusive), MM fees add 15% VAT on top.
- **Foreign Key Constraint**: tax_transactions.originalTransactionId references transactions.transactionId with CASCADE delete/update. Unique constraint on transactions.transactionId required for this to work.
- **VAT Transactions**: Two TaxTransaction records created per payment - one for input VAT (supplier, claimable) and one for output VAT (MM, payable). Both reference the same transaction.
- **Migration Status**: All migrations completed successfully. Unique constraint and foreign key constraint created manually in Google Cloud Console as postgres superuser.
- **Database Permissions**: mymoolah_app user cannot create indexes/constraints - requires postgres superuser or table owner permissions.
- **VAT Calculation**: tierFeeService.js calculates detailed VAT breakdown including exclusive/inclusive amounts for both supplier and MM fees.

---

## Questions/Unresolved Items
- None - all issues resolved and tested successfully

---

## Related Documentation
- `docs/TIER_FEE_SYSTEM_IMPLEMENTATION.md` - Fee system documentation (may need VAT section update)
- `migrations/20251119_*` - All VAT-related migrations
- `services/tierFeeService.js` - VAT calculation logic
- `controllers/qrPaymentController.js` - VAT allocation logic

