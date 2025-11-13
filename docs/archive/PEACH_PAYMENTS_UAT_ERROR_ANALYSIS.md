# 🍑 PEACH PAYMENTS UAT ERROR ANALYSIS

**Date**: November 12, 2025  
**Status**: ✅ **ERRORS IDENTIFIED AND FIXED**

---

## 🔍 DETAILED ERROR ANALYSIS

### **Error 1: Bank Account Payments Not Supported**

#### **Error Message**
```
"Invalid request body","errors":{
  "customer.accountNumber":"unknown field",
  "customer.bankCode":"unknown field"
}
```

#### **Root Cause**
**Checkout V2 API does NOT support direct bank account numbers**. It only supports PayShap proxy (mobile phone numbers).

#### **What This Means**
- ✅ **Phone Number Payments**: Fully supported and working
- ❌ **Bank Account Payments**: Not supported in Checkout V2
- ⚠️ **Alternative**: May need to use Payments API v1 for bank accounts (if supported)

#### **Fix Applied**
- ✅ Enhanced error logging to capture detailed API errors
- ✅ Code updated to pass bankCode/bankName (for future support)
- ⚠️ **Action Required**: Confirm with Peach Payments:
  - Are bank accounts supported in any API?
  - Should we use Payments API v1 for bank accounts?
  - Or is bank account support planned for Checkout V2?

---

### **Error 2: Request Money Type Enum Missing**

#### **Error Message**
```
"invalid input value for enum enum_peach_payments_type: \"request_money_payshap\""
```

#### **Root Cause**
The database enum `enum_peach_payments_type` only had two values:
- `'payshap_rpp'`
- `'payshap_rtp'`

But the controller was trying to create a record with:
- `'request_money_payshap'` ❌

#### **Fix Applied**
- ✅ Updated model to include `'request_money_payshap'` in enum
- ✅ Created migration to add enum value to database
- ✅ Migration: `20251112_add_request_money_to_peach_payments.js`

#### **Migration Required**
```bash
# Run migration to add enum value
npx sequelize-cli db:migrate
```

---

## 📊 UPDATED TEST RESULTS

### **After Fixes**

#### **Expected Improvements**
1. ✅ **Request Money** - Should now work (enum fixed)
2. ⚠️ **Bank Account Payments** - Still not supported (API limitation)

#### **Success Rate**
- **Before**: 76.9% (10/13)
- **After Enum Fix**: ~84.6% (11/13) - if Request Money works
- **Bank Account Limitation**: Will remain at 0% until Peach confirms support

---

## 🔧 FIXES APPLIED

### **1. Database Enum Fix** ✅
**File**: `models/PeachPayment.js`
```javascript
// Before
type: { type: DataTypes.ENUM('payshap_rpp', 'payshap_rtp'), allowNull: false }

// After
type: { type: DataTypes.ENUM('payshap_rpp', 'payshap_rtp', 'request_money_payshap'), allowNull: false }
```

**Migration**: `migrations/20251112_add_request_money_to_peach_payments.js`
- Adds `'request_money_payshap'` to the enum
- Safe to run multiple times (uses `IF NOT EXISTS`)

### **2. Enhanced Error Logging** ✅
**Files**: 
- `controllers/peachController.js`
- `scripts/test-peach-uat-complete.js`

**Improvements**:
- Captures detailed API error responses
- Shows error codes and descriptions
- Displays full error response (truncated for readability)

---

## ⚠️ KNOWN LIMITATIONS

### **1. Bank Account Payments**
**Status**: ❌ **NOT SUPPORTED IN CHECKOUT V2**

**Evidence**:
- API returns: `"customer.accountNumber":"unknown field"`
- API returns: `"customer.bankCode":"unknown field"`

**What Works**:
- ✅ PayShap proxy (phone numbers) - Fully working
- ✅ RPP with phone numbers - Working
- ✅ RTP with phone numbers - Working
- ✅ Request Money with phone numbers - Should work after enum fix

**What Doesn't Work**:
- ❌ Direct bank account numbers in Checkout V2
- ❌ Bank account RPP in Checkout V2
- ❌ Bank account RTP in Checkout V2

**Next Steps**:
1. ⚠️ **Contact Peach Payments** to confirm:
   - Is bank account support available in Payments API v1?
   - Is bank account support planned for Checkout V2?
   - What is the recommended approach for bank account payments?

2. ⚠️ **Alternative Implementation** (if needed):
   - Use Payments API v1 for bank account payments
   - Keep Checkout V2 for phone number payments
   - Implement routing logic based on payment method

---

## 🚀 NEXT STEPS

### **Immediate Actions**
1. ✅ **Run Migration**
   ```bash
   npx sequelize-cli db:migrate
   ```

2. ✅ **Re-run Test Suite**
   ```bash
   node scripts/test-peach-uat-complete.js
   ```

3. ⚠️ **Expected Results**:
   - ✅ Request Money should now pass (enum fixed)
   - ❌ Bank Account payments will still fail (API limitation)
   - ✅ Success rate should improve to ~84.6%

### **For Production**
1. ⚠️ **Confirm Bank Account Support** with Peach Payments
2. ⚠️ **Implement Alternative** if bank accounts are needed:
   - Use Payments API v1 for bank accounts
   - Or implement separate bank transfer flow
3. ✅ **Phone Number Payments** - Ready for production

---

## 📋 QUESTIONS FOR PEACH PAYMENTS

### **1. Bank Account Support**
**Question**: Are direct bank account numbers supported in any Peach Payments API?

**What We Need**:
- Confirmation if bank accounts work in Payments API v1
- Or if bank accounts are supported in Checkout V2 production
- Recommended approach for bank account payments

**Current Status**:
- ❌ Checkout V2 sandbox: Not supported
- ⚠️ Payments API v1: Unknown (needs confirmation)

### **2. Request Money Feature**
**Question**: Is Request Money (RTP with MSISDN reference) a supported feature?

**What We Need**:
- Confirmation that Request Money is a valid use case
- Documentation on MSISDN reference handling
- Any special configuration required

**Current Status**:
- ✅ Code implemented
- ✅ Enum fixed
- ⚠️ Needs testing after migration

---

## ✅ CONCLUSION

### **Issues Identified**
1. ✅ **Request Money Enum** - Fixed (migration created)
2. ⚠️ **Bank Account Support** - API limitation (needs Peach confirmation)

### **Production Readiness**
- ✅ **Phone Number Payments**: **READY FOR PRODUCTION**
- ✅ **Request Money**: **READY AFTER MIGRATION**
- ⚠️ **Bank Account Payments**: **PENDING PEACH CONFIRMATION**

### **Recommendation**
1. ✅ **Run migration** to fix Request Money
2. ✅ **Re-run tests** to verify Request Money works
3. ⚠️ **Contact Peach Payments** about bank account support
4. ✅ **Proceed with production credentials** for phone number payments

---

**Report Generated**: November 12, 2025  
**Status**: ✅ **ERRORS IDENTIFIED - FIXES APPLIED - MIGRATION REQUIRED**


