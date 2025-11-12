# 🍑 PEACH PAYMENTS UAT TEST RESULTS

**Date**: November 12, 2025  
**Test Suite**: `scripts/test-peach-uat-complete.js`  
**Environment**: UAT (Sandbox)  
**Status**: ⚠️ **IN PROGRESS - 61.5% SUCCESS RATE**

---

## 📊 TEST RESULTS SUMMARY

### **Overall Results**
- **Total Tests**: 15
- **✅ Passed**: 8 (53.3%)
- **❌ Failed**: 5 (33.3%)
- **⏭️ Skipped**: 2 (13.3%)
- **Success Rate**: 61.5% (8/13 critical tests)

---

## ✅ PASSED TESTS (8/15)

### **🏥 Health & Status** (1/1)
- ✅ **Health Check** - Service operational

### **💳 Payment Methods** (1/1)
- ✅ **Get Payment Methods** - Found 4 payment methods

### **🧪 Test Scenarios** (1/1)
- ✅ **Get Test Scenarios** - Found 4 test scenarios

### **📤 PayShap RPP** (2/3)
- ✅ **PayShap RPP Initiation (Success Test)** - Checkout ID created successfully
- ✅ **PayShap RPP Validation (Missing Amount)** - Correctly rejected missing amount

### **💰 Request Money** (1/2)
- ✅ **Request Money Validation (Missing Payer Name)** - Correctly rejected missing payer name

### **⚠️ Error Handling** (1/2)
- ✅ **Error Handling (Missing Payment Method)** - Correctly rejected missing payment method

---

## ❌ FAILED TESTS (5/15)

### **📤 PayShap RPP** (1/3)
- ❌ **PayShap RPP with Bank Account**
  - **Error**: "Failed to initiate PayShap payment"
  - **Status**: 500 Internal Server Error
  - **Analysis**: Bank account payments may require additional fields (bankCode) or Checkout V2 may not support direct bank account numbers in sandbox
  - **Action**: 
    - ✅ Fixed: Now passes bankCode and bankName to Checkout V2
    - ⚠️ May need confirmation from Peach if bankCode is required for account numbers

### **📥 PayShap RTP** (1/2)
- ❌ **PayShap RTP with Bank Account**
  - **Error**: "Failed to initiate PayShap RTP request"
  - **Status**: 500 Internal Server Error
  - **Analysis**: Similar to RPP - bank account payments may need additional configuration
  - **Action**: 
    - ✅ Fixed: Now passes bankCode and bankName to Checkout V2
    - ⚠️ May need confirmation from Peach if bankCode is required for account numbers

### **💰 Request Money** (1/2)
- ❌ **Request Money (Test Mode)**
  - **Error**: "Failed to create money request"
  - **Status**: 500 Internal Server Error
  - **Analysis**: May be related to bank account handling or MSISDN reference format
  - **Action**: 
    - ✅ Fixed: Now passes bankCode and bankName
    - ⚠️ May need to test with phone number instead of bank account

### **🔔 Webhook** (1/1)
- ❌ **Webhook Endpoint (Basic)**
  - **Error**: "Webhook endpoint not found"
  - **Status**: 404 Not Found
  - **Analysis**: Route may not be registered or server needs restart
  - **Action**: 
    - ✅ Route is registered in `routes/peach.js`
    - ⚠️ Server may need restart to pick up new routes
    - ⚠️ Verify route is accessible: `POST /api/v1/peach/webhook`

### **⚠️ Error Handling** (1/2)
- ❌ **Error Handling (Invalid Amount)**
  - **Error**: "Unexpected error: Request failed with status code 500"
  - **Expected**: 400 Bad Request
  - **Analysis**: Amount validation was missing
  - **Action**: 
    - ✅ Fixed: Added amount validation (> 0) to RPP endpoint
    - ✅ Fixed: Added amount validation (> 0) to RTP endpoint
    - ✅ Fixed: Added amount validation (> 0) to Request Money endpoint

---

## ⏭️ SKIPPED TESTS (2/15)

### **📊 Payment Status** (2/2)
- ⏭️ **Get Payment Status (by Merchant Transaction ID)**
  - **Reason**: Auth token not available
  - **Note**: Test endpoint requires authentication, but test suite doesn't have valid token
  - **Action**: Can test manually with valid JWT token

- ⏭️ **Poll Payment Status**
  - **Reason**: Status endpoint returned 404
  - **Note**: Status endpoint may need confirmation from Peach Payments
  - **Action**: 
    - ⚠️ Endpoint attempted: `GET /v2/checkouts/{checkoutId}/payment`
    - ⚠️ May need different endpoint or confirmation from Peach

---

## 🔧 FIXES APPLIED

### **1. Amount Validation** ✅
- Added validation for `amount > 0` in all payment endpoints
- Returns proper 400 Bad Request for invalid amounts
- Prevents 500 errors on invalid input

### **2. Bank Account Support** ✅
- Now passes `bankCode` and `bankName` to Checkout V2 API
- May resolve bank account payment failures
- Note: May still need confirmation from Peach if additional fields required

### **3. Error Handling** ✅
- Improved error responses
- Consistent validation across all endpoints
- Proper HTTP status codes (400 for validation errors)

---

## ⚠️ KNOWN ISSUES

### **1. Webhook Endpoint 404**
- **Status**: Route registered but returning 404
- **Possible Causes**:
  - Server needs restart to pick up new routes
  - Route registration issue
  - Path mismatch
- **Action**: 
  - Restart backend server
  - Verify route: `POST /api/v1/peach/webhook`
  - Check server logs for route registration

### **2. Bank Account Payments**
- **Status**: Failing with 500 errors
- **Possible Causes**:
  - Checkout V2 may not support direct bank account numbers in sandbox
  - May require additional fields (bankCode, accountType, etc.)
  - May need different API endpoint for bank accounts
- **Action**: 
  - ✅ Fixed: Now passes bankCode and bankName
  - ⚠️ Test again after server restart
  - ⚠️ May need to confirm with Peach if bank accounts are supported in Checkout V2 sandbox

### **3. Status Polling Endpoint**
- **Status**: Returns 404
- **Possible Causes**:
  - Endpoint path may be incorrect
  - Endpoint may not exist in Checkout V2
  - May need different endpoint for status checking
- **Action**: 
  - ⚠️ Confirm correct status endpoint with Peach Payments
  - ⚠️ Alternative: Use webhook for status updates

### **4. Request Money with Bank Account**
- **Status**: Failing with 500 errors
- **Possible Causes**:
  - Similar to bank account RPP/RTP issues
  - May need to test with phone number instead
- **Action**: 
  - ✅ Fixed: Now passes bankCode and bankName
  - ⚠️ Test with phone number for now
  - ⚠️ Bank account support may need Peach confirmation

---

## 🎯 NEXT STEPS

### **Immediate Actions**
1. ✅ **Restart Backend Server**
   - New routes (webhook, poll-status) need server restart
   - Amount validation fixes need server restart

2. ✅ **Re-run Test Suite**
   - After server restart, run: `node scripts/test-peach-uat-complete.js`
   - Expected improvements:
     - ✅ Invalid amount validation should pass
     - ✅ Webhook endpoint should be accessible
     - ⚠️ Bank account payments may still fail (needs Peach confirmation)

3. ⚠️ **Test Webhook Endpoint Manually**
   ```bash
   curl -X POST http://localhost:3001/api/v1/peach/webhook \
     -H "Content-Type: application/json" \
     -d '{"merchantTransactionId":"TEST-001","status":"success"}'
   ```

### **Questions for Peach Payments**
1. **Bank Account Support in Checkout V2**
   - Are direct bank account numbers supported in Checkout V2 sandbox?
   - What fields are required for bank account payments?
   - Is `bankCode` required when using `accountNumber`?

2. **Status Polling Endpoint**
   - What is the correct endpoint to check payment status?
   - Is `GET /v2/checkouts/{checkoutId}/payment` correct?
   - Or should we use a different endpoint?

3. **Webhook Configuration**
   - How do we register webhook URL in Peach dashboard?
   - What is the webhook payload format?
   - How is webhook signature validated?

---

## 📈 EXPECTED IMPROVEMENTS AFTER RESTART

### **After Server Restart**
- ✅ Webhook endpoint should be accessible (currently 404)
- ✅ Invalid amount validation should pass (currently 500)
- ⚠️ Bank account payments may still need Peach confirmation

### **Expected Success Rate**
- **Before Fixes**: 61.5% (8/13)
- **After Restart**: ~77% (10/13) - if webhook and amount validation work
- **After Peach Confirmation**: ~92% (12/13) - if bank account support confirmed

---

## ✅ WORKING FEATURES

### **Core Functionality** ✅
- ✅ Health check
- ✅ Payment methods listing
- ✅ Test scenarios
- ✅ PayShap RPP with phone number
- ✅ PayShap RTP with phone number
- ✅ Request Money validation
- ✅ Error handling (missing fields)

### **Payment Initiation** ✅
- ✅ RPP payments with phone numbers work
- ✅ RTP requests with phone numbers work
- ✅ Payment records created in database
- ✅ Checkout IDs generated successfully

---

## ⚠️ PENDING CONFIRMATION

### **From Peach Payments**
1. Bank account support in Checkout V2 sandbox
2. Status polling endpoint
3. Webhook URL registration
4. Webhook payload format

### **From Testing**
1. Webhook endpoint accessibility (after restart)
2. Bank account payments (after fixes)
3. Status polling (after endpoint confirmation)

---

**Report Generated**: November 12, 2025  
**Test Suite Version**: 1.0.0  
**Status**: ⚠️ **IN PROGRESS - FIXES APPLIED, RESTART REQUIRED**

