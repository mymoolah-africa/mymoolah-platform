# Flash Integration Testing Guide

**Date**: 2026-02-01  
**Environment**: Codespaces (UAT) → Staging  
**Status**: ✅ Ready for Testing

---

## 📋 **PRE-TESTING CHECKLIST**

### **Step 1: Verify Environment Configuration**

**In Codespaces:**
```bash
# Pull latest changes
git pull origin main

# Check Flash is enabled for testing
grep FLASH_LIVE_INTEGRATION .env

# Should show:
# FLASH_LIVE_INTEGRATION=true  (for real API testing)
# OR
# FLASH_LIVE_INTEGRATION=false (for simulation testing)
```

**For UAT Testing (Simulation):**
```bash
# Set to false for simulation (no real Flash API calls)
FLASH_LIVE_INTEGRATION=false
```

**For Staging Testing (Real API):**
```bash
# Set to true for real Flash API calls
FLASH_LIVE_INTEGRATION=true
```

---

## 🧪 **TEST SUITE 1: FLASH CASH-OUT (EEZI CASH)**

### **Test 1.1: Successful Cash-Out Purchase (R100)**

**Steps:**
1. Navigate to Quick Access Services
2. Click "Get Cash Out" (or Flash Eezi Cash option)
3. Enter amount: **R100**
4. Optional: Enter recipient phone (or leave blank)
5. Click "Continue" or "Purchase"

**Expected Results:**
- ✅ Loading state shows "Processing..."
- ✅ Success screen appears
- ✅ Real PIN displayed (not `EZ123ABC` simulation)
- ✅ PIN format: ~10 characters alphanumeric
- ✅ Transaction reference displayed
- ✅ Copy button works
- ✅ Wallet debited by R100

**Verification:**
```bash
# Check console logs for:
# 🚀 Flash Cash-Out: Calling API with data: {...}
# ✅ Flash Cash-Out: API response: {...}
# 🎉 Flash Cash-Out: Success - Token: [...] Ref: [...]
```

**Screenshot:** Capture the success screen with PIN

---

### **Test 1.2: Cash-Out Edge Cases**

**Test minimum amount (R50):**
- Enter R50
- Should succeed ✅

**Test maximum amount (R500):**
- Enter R500
- Should succeed ✅

**Test invalid amount (R25 - below minimum):**
- Enter R25
- Should show error: "Amount must be between R50 and R500" ✅

**Test invalid amount (R600 - above maximum):**
- Enter R600
- Should show error: "Amount must be between R50 and R500" ✅

---

### **Test 1.3: Cash-Out Error Handling**

**If Flash API is down:**
- Expected: Error screen with message
- Should NOT crash app ✅
- Error logged in console ✅

---

## 🧪 **TEST SUITE 2: FLASH ELECTRICITY PURCHASE**

### **Test 2.1: Successful Electricity Purchase (R50)**

**Steps:**
1. Navigate to "Pay Bills"
2. Click "Electricity"
3. Create new recipient (or select existing):
   - Name: "Test Meter"
   - Meter Number: **12345678** (8-digit test meter for UAT)
   - Meter Type: Prepaid
4. Select recipient
5. Enter amount: **R50**
6. Accept terms and conditions
7. Click "Purchase"

**Expected Results:**
- ✅ Loading state shows "Processing..."
- ✅ Success confirmation appears
- ✅ Real 20-digit electricity token displayed
- ✅ Token format: `XXXX-XXXX-XXXX-XXXX-XXXX`
- ✅ Wallet debited by R50
- ✅ Transaction appears in history with ⚡ icon

**Verification:**
```bash
# Check console logs for:
# 📞 Flash: Looking up meter...
# ✅ Flash Meter Lookup Response: {...}
# 📞 Flash Purchase Request: {...}
# ✅ Flash Purchase Response: {...}
# ✅ Flash electricity token: [20-digit-token]
```

**Screenshot:** Capture transaction detail modal with token

---

### **Test 2.2: Electricity - View Token in Transaction History**

**Steps:**
1. Navigate to "Transaction History"
2. Find the electricity purchase transaction (⚡ icon)
3. Click on the transaction
4. Transaction detail modal should open

**Expected Results:**
- ✅ Modal displays transaction details
- ✅ Electricity token shown in green dashed box
- ✅ Token grouped by 4 digits: `1234 5678 9012 3456 7890`
- ✅ Copy button works
- ✅ Meter information displayed
- ✅ Amount and date correct

---

### **Test 2.3: Electricity Edge Cases**

**Test minimum amount (R20):**
- Enter R20
- Should succeed ✅

**Test maximum amount (R2000):**
- Enter R2000
- Should succeed ✅

**Test invalid meter (wrong format):**
- Meter: `123` (too short)
- Should show error ✅

**Test invalid meter (blacklisted):**
- Meter: `1234567890` (in blacklist)
- Should show error: "Meter number not found" ✅

---

## 🧪 **TEST SUITE 3: FLASH ENVIRONMENT SWITCHING**

### **Test 3.1: UAT Mode (Simulation)**

**Configuration:**
```bash
FLASH_LIVE_INTEGRATION=false
```

**Expected Behavior:**
- ✅ No real API calls made
- ✅ Fake tokens/PINs generated
- ✅ Fast response times (no network delay)
- ✅ Console shows: "Flash Auth Service: Operating in database mode"

---

### **Test 3.2: Staging Mode (Real API)**

**Configuration:**
```bash
FLASH_LIVE_INTEGRATION=true
```

**Expected Behavior:**
- ✅ Real API calls to Flash
- ✅ Real tokens/PINs from Flash API
- ✅ Slower response (network + API processing)
- ✅ Console shows: "Flash: Making authenticated request"

---

## 🧪 **TEST SUITE 4: ERROR SCENARIOS**

### **Test 4.1: Flash Error Codes**

Use test tokens from `integrations/flash/FLASH_TESTING_REFERENCE.md`:

**Test Expired Voucher:**
- Token: `1527144039167197`
- Expected: Error 2405 - "Voucher has expired"

**Test Already Used:**
- Token: `1644561242205522`
- Expected: Error 2401 - "Voucher already used"

**Test Cancelled:**
- Token: `1982069215158100`
- Expected: Error 2403 - "Voucher has been cancelled"

---

## 🧪 **TEST SUITE 5: SUPPLIER COMPARISON**

### **Test 5.1: Flash vs MobileMart Selection**

**Scenario:** Purchase MTN Airtime R50

**Expected Behavior:**
- ✅ System queries both Flash and MobileMart
- ✅ Compares commission rates
- ✅ Selects supplier with highest commission
- ✅ Uses that supplier for transaction

**Check Console:**
```javascript
// Should show comparison logic:
// 🔍 Comparing suppliers for MTN Airtime R50
// Flash: 3.5% commission
// MobileMart: 3.0% commission
// Winner: Flash (higher commission)
```

---

## 📊 **TEST TRACKING SHEET**

| Test # | Test Name | Status | Notes |
|--------|-----------|--------|-------|
| 1.1 | Cash-Out R100 | ⏳ | |
| 1.2 | Cash-Out Edge Cases | ⏳ | |
| 1.3 | Cash-Out Error Handling | ⏳ | |
| 2.1 | Electricity R50 | ⏳ | |
| 2.2 | View Token in History | ⏳ | |
| 2.3 | Electricity Edge Cases | ⏳ | |
| 3.1 | UAT Mode | ⏳ | |
| 3.2 | Staging Mode | ⏳ | |
| 4.1 | Flash Error Codes | ⏳ | |
| 5.1 | Supplier Comparison | ⏳ | |

---

## ✅ **SUCCESS CRITERIA**

### **Cash-Out:**
- ✅ Real PIN generated (when FLASH_LIVE_INTEGRATION=true)
- ✅ PIN copyable and displayable
- ✅ Wallet debited correctly
- ✅ Transaction history entry created

### **Electricity:**
- ✅ Real 20-digit token generated
- ✅ Token displayed in transaction modal
- ✅ Token copyable with grouped format
- ✅ Meter validation working
- ✅ Wallet debited correctly

### **Error Handling:**
- ✅ Flash error codes properly displayed
- ✅ User-friendly error messages
- ✅ App doesn't crash on errors
- ✅ Errors logged comprehensively

---

## 🚨 **KNOWN ISSUES TO WATCH FOR**

### **Issue 1: Token Not Displaying**
**Symptom:** Shows `[object Object]` instead of token  
**Cause:** Token extraction failed  
**Check:** Console for Flash API response format  
**Fix:** Update token extraction logic

### **Issue 2: API Timeout**
**Symptom:** Request hangs for >30 seconds  
**Cause:** Flash API slow or down  
**Check:** Network connectivity  
**Action:** Retry or check Flash status

### **Issue 3: Invalid Credentials**
**Symptom:** Authentication failed error  
**Cause:** Wrong Consumer Key/Secret  
**Check:** Environment variables loaded correctly  
**Fix:** Verify credentials in Secret Manager

---

## 📝 **TESTING WORKFLOW**

### **Phase 1: UAT Testing (Simulation)**
```bash
# 1. Set simulation mode
FLASH_LIVE_INTEGRATION=false

# 2. Test all flows with fake data
# 3. Verify UI works correctly
# 4. Check error handling
# 5. Confirm no API calls made
```

### **Phase 2: Staging Testing (Real API)**
```bash
# 1. Set live mode
FLASH_LIVE_INTEGRATION=true

# 2. Test with small amounts first (R20-R50)
# 3. Verify real tokens/PINs
# 4. Check wallet debits
# 5. Monitor Flash API responses
# 6. Test error scenarios
```

### **Phase 3: Production Deployment**
```bash
# 1. Verify all Staging tests pass
# 2. Deploy to Production Cloud Run
# 3. Set FLASH_LIVE_INTEGRATION=true
# 4. Monitor first transactions closely
# 5. Set up alerts for Flash errors
```

---

## 🎯 **QUICK START: First Test**

**Recommended first test (easiest to verify):**

### **Flash Electricity Purchase Test:**

1. **In Codespaces:**
   ```bash
   # Ensure backend is running
   npm start
   ```

2. **Open frontend** (port 3000)

3. **Create electricity beneficiary:**
   - Name: "Home Meter"
   - Meter: `12345678`
   - Type: Prepaid

4. **Purchase R20 electricity**

5. **Verify token appears** (should be 20 digits or simulation format)

6. **Check transaction history** - should have ⚡ icon

**If this works:** ✅ Flash integration is working!

---

## 📚 **REFERENCE DOCUMENTS**

- `integrations/flash/FLASH_TESTING_REFERENCE.md` - Error codes and test tokens
- `docs/FLASH_CREDENTIALS_SETUP.md` - Credential configuration
- `docs/session_logs/2026-02-01_FINAL_flash-integration-complete.md` - Complete implementation details

---

## 🎉 **READY TO TEST!**

**Current Status:**
- ✅ Flash API integrated (cash-out + electricity)
- ✅ Flash credentials configured
- ✅ Flash products synced (173 products in Staging)
- ✅ All documentation complete
- ✅ Testing guide ready

**Next Step:** Start testing in Codespaces!

---

**Last Updated**: 2026-02-01 22:00  
**Status**: Ready for Testing
