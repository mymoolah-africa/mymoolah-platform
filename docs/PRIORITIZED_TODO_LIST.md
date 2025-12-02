# MyMoolah Platform - Prioritized TODO List

**Last Updated**: December 2, 2025  
**Context**: Staging deployment in progress, live credential testing tomorrow (MobileMart & Zapper)  
**Priority Levels**: 🔴 CRITICAL | 🟡 HIGH | 🟢 MEDIUM | ⚪ LOW

---

## 🔴 **CRITICAL - STAGING DEPLOYMENT & LIVE TESTING (IMMEDIATE)**

### **1. Staging Deployment Readiness** 🔴 **CRITICAL**
**Priority**: Must complete before live credential testing  
**Timeline**: Today/Before testing tomorrow

- [ ] **Verify all migrations run successfully in staging**
  - [ ] Check for any pending migrations
  - [ ] Verify Phase 1 E.164 migrations completed
  - [ ] Test database connection and schema integrity
  - **Files**: `migrations/`, `scripts/audit-all-wallets.js`
  - **Status**: Phase 1 migrations complete, walletId de-PII pending (non-blocking)

- [ ] **Verify transaction history fix deployed**
  - [ ] Confirm `walletController.js` fix is in staging
  - [ ] Test transaction history shows only correct user's transactions
  - [ ] Verify no duplicate transactions in user statements
  - **Files**: `controllers/walletController.js` (line 436-442 fix)
  - **Status**: ✅ Fixed, needs deployment verification

- [ ] **Test request money amount fix**
  - [ ] Verify amount field doesn't auto-change (R500 → R496 bug)
  - [ ] Test confirmation dialog for payer removal
  - **Files**: `mymoolah-wallet-frontend/pages/RequestMoneyPage.tsx`
  - **Status**: ✅ Fixed, needs deployment verification

- [ ] **Environment variables verification**
  - [ ] Verify all required env vars set in staging
  - [ ] Check MobileMart credentials configured
  - [ ] Check Zapper credentials configured
  - [ ] Verify DATABASE_URL points to staging
  - **Files**: `.env`, Cloud Run environment config

### **2. MobileMart Live Credentials Testing** 🔴 **CRITICAL**
**Priority**: Testing tomorrow - must be ready  
**Timeline**: Before tomorrow's testing session

- [ ] **Verify MobileMart integration endpoints**
  - [ ] Test OAuth token endpoint with live credentials
  - [ ] Test product listing endpoints (all 5 VAS types)
  - [ ] Test purchase endpoints (pinned, pinless, voucher, utility, bill payment)
  - **Files**: `services/mobilemartAuthService.js`, `controllers/mobilemartController.js`
  - **Status**: UAT tested (57% success - pinless needs valid test numbers)

- [ ] **MobileMart MSISDN format validation**
  - [ ] Verify E.164 format works with MobileMart API
  - [ ] Test beneficiary MSISDN normalization in purchase flows
  - [ ] Ensure `serviceData.msisdn` is E.164 format
  - **Files**: `services/UnifiedBeneficiaryService.js`, `utils/msisdn.js`
  - **Status**: ✅ E.164 standardization complete, needs live API testing

- [ ] **MobileMart error handling**
  - [ ] Test invalid credentials handling
  - [ ] Test network failure scenarios
  - [ ] Test rate limiting responses
  - **Files**: `services/mobilemartAuthService.js`

- [ ] **MobileMart transaction tracking**
  - [ ] Verify transaction records created correctly
  - [ ] Test transaction status updates
  - [ ] Verify wallet balance updates
  - **Files**: `controllers/mobilemartController.js`

### **3. Zapper Live Credentials Testing** 🔴 **CRITICAL**
**Priority**: Testing tomorrow - must be ready  
**Timeline**: Before tomorrow's testing session

- [ ] **Verify Zapper integration endpoints**
  - [ ] Test authentication with live credentials
  - [ ] Test QR code decoding
  - [ ] Test payment processing
  - [ ] Test payment history endpoints
  - **Files**: `services/zapperService.js`, `controllers/qrPaymentController.js`
  - **Status**: UAT tested (92.3% success rate)

- [ ] **Zapper fee calculation verification**
  - [ ] Verify tier-based fees calculate correctly
  - [ ] Test VAT allocation (input/output VAT)
  - [ ] Verify float account crediting
  - [ ] Test revenue allocation
  - **Files**: `services/tierFeeService.js`, `controllers/qrPaymentController.js`
  - **Status**: ✅ Implemented, needs live testing

- [ ] **Zapper QR code tip detection**
  - [ ] Fix tip detection from URL pattern `40|278|13`
  - [ ] Test QR Type 3 and Type 5 with tip enabled
  - [ ] Verify default tip percentage calculation
  - **Files**: `controllers/qrPaymentController.js` (lines 380-396)
  - **Status**: ⚠️ Known issue - tip detection not working
  - **Reference**: `docs/ZAPPER_QR_TYPES_REFACTORING.md`

- [ ] **Zapper webhook/callback handling**
  - [ ] Verify webhook endpoint configured
  - [ ] Test webhook signature validation
  - [ ] Test callback processing
  - **Files**: `routes/qrpayments.js`, webhook handlers
  - **Status**: ⚠️ Missing - documented as needed

- [ ] **Zapper transaction reconciliation**
  - [ ] Test transaction status polling
  - [ ] Verify failed transaction handling
  - [ ] Test transaction retry logic
  - **Files**: `services/zapperService.js`

---

## 🟡 **HIGH PRIORITY - SECURITY & COMPLIANCE**

### **4. Phase 2: MSISDN Encryption at Rest** 🟡 **HIGH**
**Priority**: Security compliance (GDPR/POPIA)  
**Timeline**: 2-3 weeks (after staging deployment stable)  
**Reference**: `docs/MSISDN_ENCRYPTION_PLAN.md`

- [ ] **Create encryption utility**
  - [ ] Implement `utils/crypto.js` with `encryptMsisdn`, `decryptMsisdn`, `hashMsisdnForSearch`
  - [ ] Implement `loadEncryptionKey` from Google Secret Manager
  - [ ] Add unit tests for encryption/decryption
  - **Files**: `utils/crypto.js` (NEW)
  - **Status**: 📋 Planned, comprehensive plan exists

- [ ] **Generate and store encryption keys**
  - [ ] Generate 32-byte AES keys for UAT, Staging, Production
  - [ ] Store keys in Google Secret Manager
  - [ ] Document key rotation procedure
  - **Files**: Secret Manager configuration
  - **Status**: 📋 Planned

- [ ] **Create database migrations**
  - [ ] Migration 1: Add shadow columns (`*_enc`, `*_hash`)
  - [ ] Migration 2: Backfill encrypted data
  - [ ] Migration 3: Update application code
  - [ ] Migration 4: Validation period (dual read/write)
  - [ ] Migration 5: Drop plaintext columns
  - **Files**: `migrations/20251203_01_add_encryption_columns.js` (NEW)
  - **Status**: 📋 Planned, detailed plan exists

- [ ] **Update models and services**
  - [ ] Add virtual decryption methods to User/Beneficiary models
  - [ ] Update controllers to use hash-based queries
  - [ ] Update services to decrypt when needed
  - **Files**: `models/User.js`, `models/Beneficiary.js`, `controllers/`, `services/`
  - **Status**: 📋 Planned

- [ ] **Add audit logging**
  - [ ] Log all decrypt operations
  - [ ] Mask MSISDNs in logs (already implemented)
  - [ ] Track encryption key access
  - **Files**: `services/auditLogger.js` (exists, needs enhancement)
  - **Status**: 📋 Planned

### **5. WalletId De-PII Migration** 🟡 **HIGH**
**Priority**: Security enhancement (PII exposure)  
**Timeline**: When DB owner privileges available  
**Reference**: `migrations/20251202_04_walletid_depii.js`

- [ ] **Complete walletId migration**
  - [ ] Change format from `WAL-+27XXXXXXXXX` to `WAL-{userId}`
  - [ ] Update all transaction records (senderWalletId, receiverWalletId)
  - [ ] Update all payment_request records
  - **Files**: `migrations/20251202_04_walletid_depii.js`
  - **Status**: ⚠️ Marked complete but NOT executed (requires DB owner privileges)
  - **Blocked By**: Database user needs `OWNER` privileges on `wallets` table

### **6. Missing Transaction Type Assignment** 🟡 **HIGH**
**Priority**: Data quality issue  
**Timeline**: Before production

- [ ] **Fix transactions without type**
  - [ ] Audit all transactions missing `type` field
  - [ ] Backfill transaction types based on transaction data
  - [ ] Update transaction creation to always set type
  - **Files**: `controllers/walletController.js`, `controllers/requestController.js`
  - **Status**: ⚠️ Found in audit - some transactions have `type: null`

- [ ] **Fix missing wallet IDs in transactions**
  - [ ] Backfill `senderWalletId` for send transactions
  - [ ] Backfill `receiverWalletId` for receive transactions
  - [ ] Update transaction creation to always set wallet IDs
  - **Files**: `controllers/walletController.js` (sendMoney method)
  - **Status**: ⚠️ Found in audit - Transactions 314, 318, 310 missing senderWalletId

---

## 🟢 **MEDIUM PRIORITY - FEATURES & IMPROVEMENTS**

### **7. Phase 3: Mojaloop Party ID System** 🟢 **MEDIUM**
**Priority**: Mojaloop compliance, interoperability  
**Timeline**: 3-4 weeks (after Phase 2)  
**Reference**: `docs/MOJALOOP_PARTY_MINIMAL_DESIGN.md`

- [ ] **Create Party Information model**
  - [ ] Create `models/PartyInformation.js`
  - [ ] Create migration for `party_information` table
  - [ ] Add unique index on (partyIdType, partyIdValue)
  - **Files**: `models/PartyInformation.js` (NEW), migration (NEW)
  - **Status**: 📋 Designed, needs implementation

- [ ] **Implement FSPIOP-Party endpoints**
  - [ ] `GET /fspiop/parties/{Type}/{ID}` - Get party information
  - [ ] `PUT /fspiop/parties/{Type}/{ID}` - Update party information
  - [ ] `GET /fspiop/parties/{Type}/{ID}/error` - Error callback
  - **Files**: `routes/fspiop.js` (NEW), `controllers/partyController.js` (NEW)
  - **Status**: 📋 Designed, needs implementation

- [ ] **Add FSPIOP headers middleware**
  - [ ] Validate FSPIOP-Source, FSPIOP-Destination headers
  - [ ] Add FSPIOP-Signature validation (stub initially)
  - [ ] Add Date, Content-Type validation
  - **Files**: `middleware/fspiopHeaders.js` (NEW)
  - **Status**: 📋 Planned

- [ ] **Integrate with Party Lookup Service**
  - [ ] Design PLS integration architecture
  - [ ] Implement party resolution logic
  - [ ] Add party verification
  - **Files**: `services/partyLookupService.js` (NEW)
  - **Status**: 📋 Future work

### **8. Pending Balance Logic** 🟢 **MEDIUM**
**Priority**: Feature completeness  
**Timeline**: After staging stable

- [ ] **Implement pending balance calculation**
  - [ ] Add pending transaction tracking
  - [ ] Calculate pending balance (authorized but not settled)
  - [ ] Update wallet balance response to include pending
  - **Files**: `controllers/walletController.js` (line 62 - TODO)
  - **Status**: ⚠️ TODO comment exists, not implemented

### **9. Zapper Split Bill Functionality** 🟢 **MEDIUM**
**Priority**: Feature enhancement  
**Timeline**: Future (after production launch)

- [ ] **Implement split bill detection**
  - [ ] Detect split bill pattern `63||18` in QR code URL
  - [ ] Add UI for split bill options
  - [ ] Implement split bill payment processing
  - **Files**: `controllers/qrPaymentController.js`
  - **Status**: 📋 Documented as future work
  - **Reference**: `docs/ZAPPER_QR_TYPES_REFACTORING.md`

### **10. Beneficiary Functionality Testing** 🟢 **MEDIUM**
**Priority**: Validation after Phase 1 changes  
**Timeline**: After staging deployment

- [ ] **Test beneficiary operations with E.164**
  - [ ] Test airtime purchase (pinned and pinless)
  - [ ] Test data purchase (pinned and pinless)
  - [ ] Test beneficiary search and filtering
  - [ ] Test beneficiary creation with E.164 MSISDN
  - **Files**: `scripts/test-beneficiary-e164-validation.js` (exists)
  - **Status**: ⚠️ Script created but not fully tested

---

## ⚪ **LOW PRIORITY - TECHNICAL DEBT & CLEANUP**

### **11. Database Cleanup** ⚪ **LOW**
**Priority**: Code quality  
**Timeline**: Ongoing

- [ ] **Remove old constraints and columns**
  - [ ] Drop unused constraints from old migrations
  - [ ] Remove deprecated columns
  - [ ] Clean up migration history
  - **Files**: `migrations/`
  - **Status**: 📋 Technical debt

### **12. Documentation Updates** ⚪ **LOW**
**Priority**: Documentation completeness  
**Timeline**: Ongoing

- [ ] **Update CHANGELOG.md**
  - [ ] Add Phase 1 completion entry
  - [ ] Add transaction history fix entry
  - [ ] Add request money fixes entry
  - **Files**: `docs/CHANGELOG.md`
  - **Status**: ⚠️ Pending updates

- [ ] **Update SECURITY.md**
  - [ ] Add MSISDN encryption plan
  - [ ] Update PII protection status
  - [ ] Add Phase 2 encryption timeline
  - **Files**: `docs/SECURITY.md`
  - **Status**: ⚠️ Needs update with Phase 2 plan

- [ ] **Update README.md**
  - [ ] Update current system status
  - [ ] Add Phase 1 completion status
  - [ ] Update next priorities
  - **Files**: `docs/README.md`
  - **Status**: 📋 Regular maintenance

### **13. Code Quality Improvements** ⚪ **LOW**
**Priority**: Code maintainability  
**Timeline**: Ongoing

- [ ] **Fix Dialog accessibility warnings**
  - [ ] Add DialogTitle to all Dialog components
  - [ ] Add Description for screen readers
  - [ ] Fix DOM nesting warnings (p tags containing divs)
  - **Files**: `mymoolah-wallet-frontend/pages/VouchersPage.tsx`, `SendMoneyPage.tsx`
  - **Status**: ⚠️ Non-blocking warnings, affects accessibility

- [ ] **Fix 403 Forbidden on wallet balance**
  - [ ] Investigate authentication middleware issue
  - [ ] Check token validation
  - [ ] Test balance endpoint
  - **Files**: `routes/wallets.js`, `middleware/auth.js`
  - **Status**: ⚠️ May be session/token issue

### **14. Peach Payments Integration** ⚪ **LOW**
**Priority**: Archived (business conflict)  
**Timeline**: N/A (on hold)

- [ ] **Integration archived**
  - [x] Routes disabled
  - [x] Code preserved
  - [x] Documentation updated
  - **Status**: ✅ Archived, preserved for potential reactivation

---

## 📊 **PRIORITY SUMMARY**

### **🔴 CRITICAL (Do Before Live Testing Tomorrow)**
1. Staging deployment verification
2. MobileMart live credentials testing prep
3. Zapper live credentials testing prep
4. Transaction history fix verification
5. Request money fixes verification

### **🟡 HIGH (After Staging Stable)**
1. Phase 2: MSISDN encryption at rest (2-3 weeks)
2. WalletId de-PII migration (when DB owner available)
3. Missing transaction type assignment
4. Missing wallet IDs in transactions

### **🟢 MEDIUM (Future Enhancements)**
1. Phase 3: Mojaloop Party ID system (3-4 weeks)
2. Pending balance logic
3. Zapper split bill functionality
4. Beneficiary functionality testing

### **⚪ LOW (Technical Debt)**
1. Database cleanup
2. Documentation updates
3. Code quality improvements
4. Accessibility fixes

---

## 🎯 **RECOMMENDED WORK ORDER**

### **Today (Before Live Testing)**
1. ✅ Verify staging deployment (migrations, fixes)
2. ✅ Test MobileMart endpoints with current credentials
3. ✅ Test Zapper endpoints with current credentials
4. ✅ Fix Zapper tip detection if time permits
5. ✅ Verify transaction history fix works

### **This Week (After Live Testing)**
1. Fix missing transaction types and wallet IDs
2. Complete beneficiary functionality testing
3. Update documentation (CHANGELOG, SECURITY.md)
4. Fix accessibility warnings

### **Next 2-3 Weeks (Phase 2)**
1. Implement MSISDN encryption at rest
2. Complete walletId de-PII migration (if DB owner available)
3. Add audit logging enhancements

### **Next Month (Phase 3)**
1. Implement Mojaloop Party ID system
2. Add pending balance logic
3. Plan Zapper split bill functionality

---

## 📝 **NOTES**

- **Staging Deployment**: All critical fixes committed, ready for deployment
- **Live Credentials**: MobileMart and Zapper integrations ready for testing
- **Phase 1 Complete**: E.164 standardization 100% done
- **Phase 2 Planned**: Encryption plan comprehensive and ready to implement
- **Phase 3 Designed**: Mojaloop Party ID system design complete

---

**Last Review**: December 2, 2025  
**Next Review**: After live credential testing tomorrow
