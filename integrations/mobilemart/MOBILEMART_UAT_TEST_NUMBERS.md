# MobileMart UAT Test Numbers

**Date:** November 10, 2025  
**Status:** ✅ **VALID UAT TEST NUMBERS PROVIDED**

---

## 📱 **Pinless Transaction Test Mobile Numbers**

### **Valid UAT Test Numbers:**

| Network | Mobile Number | Usage |
|---------|---------------|-------|
| **Vodacom** | `0720012345` | Pinless Airtime & Data |
| **MTN** | `0830012300` | Pinless Airtime & Data |
| **MTN** | `0737111113` | Pinless Airtime & Data (alternative) |
| **CellC** | `0840012300` | Pinless Airtime & Data |
| **Telkom** | `0850012345` | Pinless Airtime & Data |

---

## 💳 **Bill Payment Test Account Numbers**

### **DSTV Accounts:**
- **Account 1:** `135609708`
- **Account 2:** `135520754`

### **Pay@ Account Payment (Oudtshoorn Municipality):**
- **Account Number:** `11347901450000300`
- **Merchant ID:** `11347`

---

## 🧪 **Test Strategy**

### **Pinless Airtime Testing:**
1. Test with Vodacom number (`0720012345`) for Vodacom products
2. Test with MTN number (`0830012300` or `0737111113`) for MTN products
3. Test with CellC number (`0840012300`) for CellC products
4. Test with Telkom number (`0850012345`) for Telkom products

### **Pinless Data Testing:**
1. Test with Vodacom number (`0720012345`) for Vodacom products
2. Test with MTN number (`0830012300` or `0737111113`) for MTN products
3. Test with CellC number (`0840012300`) for CellC products
4. Test with Telkom number (`0850012345`) for Telkom products

### **Bill Payment Testing:**
1. Test with DSTV account (`135609708` or `135520754`)
2. Test with Pay@ account (`11347901450000300`) for Oudtshoorn Municipality

---

## 📝 **Notes**

- All mobile numbers are in **local format** (10 digits, starting with 0)
- These numbers are **valid for UAT testing** only
- Use the appropriate network number for each product type
- Bill Payment accounts are valid test accounts provided by MobileMart

---

## ⚠️ **Known MobileMart UAT Account Limitations**

**Date:** January 21, 2026  
**Status:** 🔍 **DOCUMENTED - NOT A CODE ISSUE**

### **Error 1016: Consumer Account Error**
- **Issue:** MobileMart UAT account has network restrictions
- **Affected Networks:** CellC (and possibly others)
- **Error Message:** "Subscriber not allowed to recharge on [Network] network"
- **Root Cause:** MobileMart UAT account configuration - account is not enabled to recharge certain networks
- **Workaround:** Use Telkom test numbers (`0850012345`) which appear to be fully activated for all product types
- **Action Required:** Contact MobileMart support to enable CellC/Vodacom/MTN network recharging in UAT account

### **Error 1013: Mobile Number Invalid**
- **Issue:** Test numbers may not be activated for all product types
- **Example:** Vodacom number `0720012345` works for airtime but may fail for data products
- **Error Message:** "Mobile Number is invalid" or "The mobile number supplied is invalid"
- **Root Cause:** MobileMart UAT test numbers have product-specific restrictions (some numbers only work for airtime, not data, or vice versa)
- **Workaround:** 
  - Try different products (e.g., if data fails, try airtime)
  - Use Telkom test numbers which appear to work for all product types
- **Action Required:** Contact MobileMart support to activate test numbers for all product types (airtime, data, etc.)

### **Why Telkom Works**
- Telkom test number `0850012345` appears to be **fully activated** in MobileMart UAT for:
  - ✅ Airtime (all products)
  - ✅ Data (all products)
  - ✅ All network types
- **Recommendation:** Use Telkom test numbers for comprehensive UAT testing until other networks are activated

---

**Status:** ✅ **READY FOR UAT TESTING** (with known limitations documented)

