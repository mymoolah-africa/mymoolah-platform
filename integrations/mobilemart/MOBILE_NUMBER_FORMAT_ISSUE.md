# MobileMart Mobile Number Format Issue

**Date:** 2025-11-10  
**Status:** 🔍 **INVESTIGATING**

---

## 🔍 **Issue**

MobileMart API is rejecting mobile numbers in both formats:
- ❌ Local format: `0720012345` → Error 1013 "Mobile Number is invalid"
- ❌ International format: `27720012345` → Error 1013 "Mobile Number is invalid"

---

## 📋 **Test Pack Mobile Numbers**

According to MobileMart UAT Test Pack documentation:
- **Vodacom:** `0720012345`
- **MTN:** `0830012300`
- **CellC:** `0840000000`
- **Telkom:** `0850012345`

These are in **local format** (10 digits, starting with 0).

---

## 🤔 **Possible Causes**

### **1. UAT Test Numbers Not Activated**
- Test numbers from test pack may only work in a specific test environment
- UAT environment might require different test numbers
- Account might need test number whitelisting

### **2. Format Requirements**
- API might require `+27` prefix: `+27720012345`
- API might require different format entirely
- API might validate against a whitelist of test numbers

### **3. Account Configuration**
- UAT account might not be configured for pinless transactions
- Account might need specific product activation
- Account might need test number registration

---

## ✅ **Working Tests**

The following tests **ARE working**:
- ✅ **Airtime Pinned:** No mobile number required (voucher-based)
- ✅ **Data Pinned:** No mobile number required (voucher-based)
- ✅ **Voucher:** No mobile number required

This suggests the API is working, but **pinless transactions require valid mobile numbers**.

---

## 🔧 **Next Steps**

### **Option 1: Contact MobileMart Support**
Request:
- Valid UAT test mobile numbers for pinless transactions
- Mobile number format requirements
- Account configuration for pinless testing

**Contact:** support@mobilemart.co.za

### **Option 2: Try Different Formats**
Test with:
- `+27720012345` (with + prefix)
- `0027720012345` (with 00 prefix)
- Check Swagger UI for format examples

### **Option 3: Use Real Test Numbers**
If available, use actual test mobile numbers provided by MobileMart for UAT.

---

## 📝 **Current Status**

- **Pinless Airtime:** ❌ Failing (mobile number format)
- **Pinless Data:** ❌ Failing (mobile number format)
- **Pinned Airtime:** ✅ Working
- **Pinned Data:** ✅ Working
- **Voucher:** ✅ Working
- **Bill Payment:** ❌ Failing (needs valid account number)
- **Utility:** ❌ Failing (transaction ID issue - fixed)

---

## 🎯 **Recommendation**

**Contact MobileMart support** to:
1. Request valid UAT test mobile numbers for pinless transactions
2. Confirm mobile number format requirements
3. Verify account configuration for pinless testing

**Email Template:**
```
Subject: UAT Test Mobile Numbers for Pinless Transactions

Hi MobileMart Support,

We're testing the MobileMart Fulcrum API in UAT and encountering error 1013 
"Mobile Number is invalid" when attempting pinless airtime/data purchases.

We've tried:
- Local format: 0720012345
- International format: 27720012345

Could you please provide:
1. Valid UAT test mobile numbers for pinless transactions
2. The correct mobile number format for the API
3. Any account configuration required for pinless testing

Account: mymoolah
Environment: UAT

Thank you!
```

---

**Status:** ⏳ **AWAITING MOBILEMART SUPPORT RESPONSE**

