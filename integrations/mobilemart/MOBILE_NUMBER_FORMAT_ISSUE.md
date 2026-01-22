# MobileMart Mobile Number Format Issue

**Date:** 2025-11-10  
**Status:** ✅ **RESOLVED**

---

## ✅ **Resolution**

Pinless failures were caused by using invalid numbers/format. Using provider-based valid UAT test numbers in local format resolved the issue:
- ✅ Local format examples (valid UAT numbers):
  - Vodacom: `0720012345`
  - MTN: `0830012300`
  - CellC: `0840012300`
  - Telkom: `0850012345`
  
Result: Airtime Pinless and Data Pinless are now working in UAT.

---

## 📋 **Test Pack Mobile Numbers**

According to MobileMart UAT Test Pack documentation:
- **Vodacom:** `0720012345`
- **MTN:** `0830012300`
- **CellC:** `0840000000`
- **Telkom:** `0850012345`

These are in **local format** (10 digits, starting with 0).

---

## 🧭 **Working Approach**
- Select test numbers based on product provider (network)
- Keep numbers in local format (leading 0)
- Do not use international format for UAT pinless tests

---

## ✅ **Working Tests (Pinless)**

- ✅ **Airtime Pinless:** Working (provider-based test numbers)
- ✅ **Data Pinless:** Working (provider-based test numbers)

---

## 🔧 **Next Steps**
- Keep using provider-based test numbers for pinless testing
- Track Bill Payment (DSTV) upstream provider issue (Error 1002)

---

## 📝 **Current Status**
- **Pinless Airtime:** ✅ Working
- **Pinless Data:** ✅ Working
- **Pinned Airtime:** ✅ Working
- **Pinned Data:** ✅ Working
- **Voucher:** ✅ Working
- **Bill Payment (DSTV):** ❌ Failing (upstream provider issue 1002)
- **Utility:** ✅ Working

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

**Status:** ✅ **RESOLVED FOR PINLESS; TRACKING DSTV PROVIDER ISSUE**

