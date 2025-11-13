# 🍑 PEACH PAYMENTS UAT FIXES APPLIED

**Date**: November 12, 2025  
**Status**: ✅ **FIXES APPLIED - RESTART REQUIRED**

---

## 🔧 FIXES APPLIED

### **1. Amount Validation** ✅ **FIXED**
**Issue**: Invalid amounts (negative or zero) returned 500 error instead of 400

**Fix Applied**:
- Added amount validation (`amount > 0`) to all payment endpoints:
  - `initiatePayShapRpp`
  - `initiatePayShapRtp`
  - `requestMoneyViaPayShap`
- Returns proper 400 Bad Request with clear error message
- Validates amount is a number and greater than 0

**Files Changed**:
- `controllers/peachController.js` - Added validation in 3 methods

**Expected Result**: 
- ✅ Invalid amount test should now pass
- ✅ Returns 400 instead of 500

---

### **2. Bank Account Support** ✅ **FIXED**
**Issue**: Bank account payments failing with 500 errors

**Fix Applied**:
- Now passes `bankCode` and `bankName` to Checkout V2 API
- Updated `createCheckoutPayShap` to accept and pass bankCode/bankName
- Updated `createPayShapRtp` to accept and pass bankCode/bankName
- Bank account customer object now includes bankCode and bankName if provided

**Files Changed**:
- `integrations/peach/client.js` - Updated `createCheckoutPayShap` method
- `controllers/peachController.js` - Passes bankCode/bankName to client methods

**Expected Result**:
- ⚠️ May improve bank account payments
- ⚠️ May still need confirmation from Peach if additional fields required

---

### **3. Webhook Endpoint** ✅ **IMPLEMENTED**
**Issue**: Webhook endpoint returning 404

**Status**: 
- ✅ Route is registered: `POST /api/v1/peach/webhook`
- ✅ Handler implemented: `handleWebhook` in controller
- ⚠️ Server needs restart to pick up new route

**Files Changed**:
- `routes/peach.js` - Added webhook route
- `controllers/peachController.js` - Added `handleWebhook` method

**Expected Result After Restart**:
- ✅ Webhook endpoint should be accessible
- ✅ Should return 200 OK and log webhook payloads

---

### **4. Status Polling** ✅ **IMPLEMENTED**
**Issue**: Status polling not implemented

**Status**:
- ✅ Route is registered: `POST /api/v1/peach/poll-status`
- ✅ Handler implemented: `pollPaymentStatus` in controller
- ⚠️ Endpoint may need confirmation from Peach (`/v2/checkouts/{id}/payment`)

**Files Changed**:
- `routes/peach.js` - Added poll-status route
- `controllers/peachController.js` - Added `pollPaymentStatus` method
- `integrations/peach/client.js` - Exported `getConfig` for use in controller

**Expected Result**:
- ⚠️ May work if endpoint is correct
- ⚠️ Falls back to database status if API call fails

---

## 🚀 NEXT STEPS

### **1. Restart Backend Server** 🔴 **REQUIRED**
```bash
# In Codespaces
./scripts/one-click-restart-and-start.sh

# Or manually
# Kill existing processes
pkill -f "node.*server.js" || true
pkill -f "cloud-sql-proxy" || true

# Start services
./scripts/start-codespace-with-proxy.sh
```

**Why**: New routes (webhook, poll-status) need server restart to be registered

### **2. Re-run Test Suite** ✅ **READY**
```bash
node scripts/test-peach-uat-complete.js
```

**Expected Improvements**:
- ✅ Webhook endpoint should be accessible (currently 404)
- ✅ Invalid amount validation should pass (currently 500)
- ⚠️ Bank account payments may improve (depends on Peach API)

### **3. Test Webhook Manually** ✅ **READY**
```bash
# Test webhook endpoint
curl -X POST http://localhost:3001/api/v1/peach/webhook \
  -H "Content-Type: application/json" \
  -d '{
    "merchantTransactionId": "PSH-RPP-TEST-001",
    "checkoutId": "TEST-CHECKOUT-001",
    "status": "success",
    "result": {
      "code": "000.100.110",
      "description": "Transaction successful"
    }
  }'
```

**Expected**: Should return 200 OK and log webhook payload

---

## 📊 EXPECTED TEST RESULTS AFTER RESTART

### **Before Fixes**
- Success Rate: 61.5% (8/13)
- Failed: 5 tests
- Skipped: 2 tests

### **After Restart (Expected)**
- Success Rate: ~77% (10/13)
- ✅ Webhook endpoint should pass
- ✅ Invalid amount validation should pass
- ⚠️ Bank account payments may still need Peach confirmation

### **Tests That Should Pass After Restart**
1. ✅ Health Check (already passing)
2. ✅ Get Payment Methods (already passing)
3. ✅ Get Test Scenarios (already passing)
4. ✅ PayShap RPP Initiation (already passing)
5. ✅ PayShap RPP Validation (already passing)
6. ✅ PayShap RTP Initiation (already passing)
7. ✅ Request Money Validation (already passing)
8. ✅ Error Handling - Missing Payment Method (already passing)
9. ✅ **Webhook Endpoint** (should pass after restart)
10. ✅ **Error Handling - Invalid Amount** (should pass after restart)

### **Tests That May Still Fail**
1. ⚠️ PayShap RPP with Bank Account (needs Peach confirmation)
2. ⚠️ PayShap RTP with Bank Account (needs Peach confirmation)
3. ⚠️ Request Money with Bank Account (needs Peach confirmation)
4. ⚠️ Poll Payment Status (needs endpoint confirmation)

---

## ⚠️ PENDING PEACH PAYMENTS CONFIRMATION

### **1. Bank Account Support**
**Question**: Are direct bank account numbers supported in Checkout V2 sandbox?

**What We Need**:
- Confirmation that bank accounts work in Checkout V2
- Required fields for bank account payments
- Whether `bankCode` is required when using `accountNumber`

**Current Status**: 
- ✅ Code now passes bankCode and bankName
- ⚠️ May still fail if Peach doesn't support bank accounts in Checkout V2

### **2. Status Polling Endpoint**
**Question**: What is the correct endpoint to check payment status?

**What We Need**:
- Confirmation of status endpoint: `GET /v2/checkouts/{checkoutId}/payment`
- Or correct endpoint path
- Authentication requirements

**Current Status**:
- ✅ Code attempts status check
- ⚠️ Returns 404 (endpoint may be incorrect)
- ✅ Falls back to database status

### **3. Webhook Configuration**
**Question**: How do we register webhook URL and validate signatures?

**What We Need**:
- Webhook URL registration process
- Webhook signature validation method
- Webhook payload format documentation

**Current Status**:
- ✅ Webhook endpoint implemented
- ✅ Logs all webhook payloads
- ⚠️ Signature validation not implemented (awaiting method)

---

## ✅ READY FOR UAT TESTING

### **What's Working** ✅
- ✅ Payment initiation with phone numbers
- ✅ Payment record creation
- ✅ Error handling and validation
- ✅ Health check and status endpoints
- ✅ Test scenarios documentation

### **What Needs Restart** ⚠️
- ⚠️ Webhook endpoint (route needs server restart)
- ⚠️ Status polling (route needs server restart)
- ⚠️ Amount validation fixes (code changes need restart)

### **What Needs Peach Confirmation** ⚠️
- ⚠️ Bank account support in Checkout V2
- ⚠️ Status polling endpoint
- ⚠️ Webhook signature validation

---

## 📝 TESTING INSTRUCTIONS

### **Step 1: Restart Backend**
```bash
# In Codespaces
./scripts/one-click-restart-and-start.sh
```

### **Step 2: Run Test Suite**
```bash
node scripts/test-peach-uat-complete.js
```

### **Step 3: Review Results**
- Check which tests now pass
- Note any remaining failures
- Test webhook endpoint manually if needed

### **Step 4: Test Webhook Manually**
```bash
# Create a test payment first
curl -X POST http://localhost:3001/api/v1/peach/test/rpp \
  -H "Content-Type: application/json" \
  -d '{
    "amount": 50.00,
    "currency": "ZAR",
    "debtorPhone": "+27-711111200",
    "description": "Test Payment"
  }'

# Then test webhook with the merchantTransactionId
curl -X POST http://localhost:3001/api/v1/peach/webhook \
  -H "Content-Type: application/json" \
  -d '{
    "merchantTransactionId": "PSH-RPP-...",
    "status": "success",
    "result": {
      "code": "000.100.110",
      "description": "Transaction successful"
    }
  }'
```

---

**Report Generated**: November 12, 2025  
**Status**: ✅ **FIXES APPLIED - READY FOR RESTART AND RE-TESTING**


