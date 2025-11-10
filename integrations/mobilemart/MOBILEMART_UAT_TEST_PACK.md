# MobileMart Fulcrum UAT Test Pack - Complete Analysis

**Last Updated:** 24 April 2024  
**Contact:** support@mobilemart.co.za

---

## 📋 **Test Packs Overview**

### **Test Pack 1: Variable Pinless Airtime**
**Source:** [Fulcrum UAT Test Pack - Variable Pinless Airtime Electrum](https://docs.google.com/spreadsheets/d/1klxUAZWhm5f2vK3AndHe6GOi1ZukRbAK/edit?gid=752812717#gid=752812717)

- **Total Tests:** 4 Compliance Tests
- **Test Data:** 4 Variable Pinless MNO Products (Vodacom, MTN, CellC, Telkom)

### **Test Pack 2: Fixed Pinless Airtime & Data**
**Source:** [Fulcrum UAT Test Pack - Fixed Pinless Airtime & Data Electrum](https://docs.google.com/spreadsheets/d/1Od-XIhVT5A3zh4iVVRa8mU42amf5HBg6/edit?gid=794722755#gid=794722755)

- **Total Tests:** 8 Compliance Tests
- **Test Data:** 8 Fixed Pinless MNO Airtime & Data Products (Vodacom, MTN, CellC, Telkom)

### **Test Pack 3: Fixed Pinned Airtime & Data**
**Source:** [Fulcrum UAT Test Pack - Fixed Pinned Airtime & Data Electrum](https://docs.google.com/spreadsheets/d/1sbt4UPNG8cWvVilUqR3EKKdo_K27SV2w/edit?gid=383898377#gid=383898377)

- **Total Tests:** 8 Compliance Tests
- **Test Data:** 8 Fixed Pinned MNO Airtime & Data Products (Vodacom, MTN, CellC, Telkom)
- **Note:** Uses `<product value>` instead of mobile numbers (voucher-based products)

---

## 🧪 **Test Cases**

### **Test Pack 1: Variable Pinless Airtime**

#### **VPL-001: Purchase Variable Pinless Airtime (Vodacom)**
- **Mobile Number:** `0720012345`
- **Network:** Vodacom
- **Type:** Variable Pinless Airtime

#### **VPL-002: Purchase Variable Pinless Airtime (MTN)**
- **Mobile Number:** `0830012300`
- **Network:** MTN
- **Type:** Variable Pinless Airtime

#### **VPL-003: Purchase Variable Pinless Airtime (CellC)**
- **Mobile Number:** `0840000000`
- **Network:** CellC
- **Type:** Variable Pinless Airtime

#### **VPL-004: Purchase Variable Pinless Airtime (Telkom)**
- **Mobile Number:** `0850012345`
- **Network:** Telkom
- **Type:** Variable Pinless Airtime

---

### **Test Pack 2: Fixed Pinless Airtime & Data**

#### **PNLS-001: Purchase Fixed Pinless Airtime (Vodacom)**
- **Mobile Number:** `0720012345`
- **Network:** Vodacom
- **Type:** Fixed Pinless Airtime

#### **PNLS-002: Purchase Fixed Pinless Data (Vodacom)**
- **Mobile Number:** `0720012345`
- **Network:** Vodacom
- **Type:** Fixed Pinless Data

#### **PNLS-003: Purchase Fixed Pinless Airtime (MTN)**
- **Mobile Number:** `0830012300`
- **Network:** MTN
- **Type:** Fixed Pinless Airtime

#### **PNLS-004: Purchase Fixed Pinless Data (MTN)**
- **Mobile Number:** `0830012300`
- **Network:** MTN
- **Type:** Fixed Pinless Data

#### **PNLS-005: Purchase Fixed Pinless Airtime (CellC)**
- **Mobile Number:** `0840000000`
- **Network:** CellC
- **Type:** Fixed Pinless Airtime

#### **PNLS-006: Purchase Fixed Pinless Data (CellC)**
- **Mobile Number:** `0840000000`
- **Network:** CellC
- **Type:** Fixed Pinless Data

#### **PNLS-007: Purchase Fixed Pinless Airtime (Telkom)**
- **Mobile Number:** `0850012345`
- **Network:** Telkom
- **Type:** Fixed Pinless Airtime

#### **PNLS-008: Purchase Fixed Pinless Data (Telkom)**
- **Mobile Number:** `0850012345`
- **Network:** Telkom
- **Type:** Fixed Pinless Data

---

### **Test Pack 3: Fixed Pinned Airtime & Data**

#### **FAD-001: Purchase Fixed Pinned Airtime (Vodacom)**
- **Value:** `<product value>` (voucher-based)
- **Network:** Vodacom
- **Type:** Fixed Pinned Airtime

#### **FAD-002: Purchase Fixed Pinned Data (Vodacom)**
- **Value:** `<product value>` (voucher-based)
- **Network:** Vodacom
- **Type:** Fixed Pinned Data

#### **FAD-003: Purchase Fixed Pinned Airtime (MTN)**
- **Value:** `<product value>` (voucher-based)
- **Network:** MTN
- **Type:** Fixed Pinned Airtime

#### **FAD-004: Purchase Fixed Pinned Data (MTN)**
- **Value:** `<product value>` (voucher-based)
- **Network:** MTN
- **Type:** Fixed Pinned Data

#### **FAD-005: Purchase Fixed Pinned Airtime (CellC)**
- **Value:** `<product value>` (voucher-based)
- **Network:** CellC
- **Type:** Fixed Pinned Airtime

#### **FAD-006: Purchase Fixed Pinned Data (CellC)**
- **Value:** `<product value>` (voucher-based)
- **Network:** CellC
- **Type:** Fixed Pinned Data

#### **FAD-007: Purchase Fixed Pinned Airtime (Telkom)**
- **Value:** `<product value>` (voucher-based)
- **Network:** Telkom
- **Type:** Fixed Pinned Airtime

#### **FAD-008: Purchase Fixed Pinned Data (Telkom)**
- **Value:** `<product value>` (voucher-based)
- **Network:** Telkom
- **Type:** Fixed Pinned Data

---

## 📊 **Expected Response Structure**

The test pack shows the expected JSON response structure for successful purchases:

```json
{
  "transactionLabels": {
    "id": "...",
    "time": "...",
    "originator": {
      "institution": {
        "id": "...",
        "name": "..."
      },
      "terminalId": "...",
      "merchant": {
        "merchantType": "...",
        "merchantId": "...",
        "merchantName": {
          "name": "...",
          "city": "...",
          "region": "...",
          "country": "..."
        }
      },
      "operatorId": "...",
      "channelId": "..."
    },
    "client": {
      "id": "...",
      "name": "..."
    },
    "settlementEntity": "...",
    "receiver": {
      "id": "...",
      "name": "..."
    },
    "thirdPartyIdentifiers": [
      {
        "institutionId": "...",
        "transactionIdentifier": "..."
      }
    ],
    "slipData": "...",
    "basketRef": "...",
    "tranType": "...",
    "srcAccType": "...",
    "destAccType": "...",
    "stan": "...",
    "rrn": "...",
    "amounts": {
      "requestAmount": {
        "amount": "...",
        "currency": "...",
        "ledgerIndicator": "..."
      },
      "approvedAmount": {
        "amount": "...",
        "currency": "...",
        "ledgerIndicator": "..."
      },
      "feeAmount": "...",
      "balanceAmount": "...",
      "additionalAmounts": "..."
    },
    "product": {
      "isDirectTopup": "...",
      "productId": "...",
      "barcode": null,
      "name": "...",
      "description": "...",
      "type": "...",
      "wholesalePrice": "...",
      "recipientAmount": "...",
      "productValues": "...",
      "validityPeriod": "...",
      "productContents": "...",
      "operator": "...",
      "channels": "..."
    },
    "msisdn": "...",
    "voucher": "..."
  }
}
```

---

## 🔍 **Key Insights**

### **1. Response Structure:**
- Response is wrapped in `transactionLabels` object
- Contains detailed transaction, merchant, and product information
- Includes amounts, fees, and settlement details
- Product information includes `productId`, `name`, `type`, `wholesalePrice`

### **2. Test Mobile Numbers:**
- **Vodacom:** `0720012345` (starts with 072) - Used for both Airtime and Data
- **MTN:** `0830012300` (starts with 083) - Used for both Airtime and Data
- **CellC:** `0840000000` (starts with 084) - Used for both Airtime and Data
- **Telkom:** `0850012345` (starts with 085) - Used for both Airtime and Data

### **3. Product Types:**
- **Variable Pinless Airtime:** Variable amount airtime purchases (direct topup)
- **Fixed Pinless Airtime:** Fixed denomination airtime purchases (direct topup)
- **Fixed Pinless Data:** Fixed denomination data purchases (direct topup)
- **Fixed Pinned Airtime:** Fixed denomination airtime vouchers (voucher-based)
- **Fixed Pinned Data:** Fixed denomination data vouchers (voucher-based)

**Key Difference:**
- **Pinless:** Direct topup to mobile number (no voucher code)
- **Pinned:** Voucher-based products with PIN codes (requires voucher redemption)

### **4. Product Information:**
- `productId`: Used for purchase requests (from product listing endpoint)
- `isDirectTopup`: Boolean indicating direct topup
- `wholesalePrice`: Price information
- `recipientAmount`: Amount credited to recipient
- `operator`: Network operator information
- `type`: Product type (airtime, data, etc.)

---

## 🎯 **Integration Implications**

### **For Our Integration:**

1. **Purchase Endpoint:**
   - Should return response matching this structure
   - Response includes `transactionLabels` wrapper
   - Contains `product.productId` for reference

2. **Test Data:**
   - Use provided test mobile numbers for UAT testing
   - Test all 4 networks (Vodacom, MTN, CellC, Telkom)

3. **Response Handling:**
   - Parse `transactionLabels` object
   - Extract `product.productId` for transaction reference
   - Handle `amounts.approvedAmount` for actual charged amount
   - Check `amounts.feeAmount` for fees

4. **Error Handling:**
   - Test pack likely includes error scenarios
   - Need to handle various response formats

---

## 📝 **Next Steps**

1. **Review Full Test Pack:**
   - Access the spreadsheet to see all test cases
   - Review error scenarios and edge cases
   - Check "Fixed Pinless Airtime & Data" tab

2. **Update Integration:**
   - Ensure purchase endpoint handles `transactionLabels` response
   - Map response fields to our `VasTransaction` model
   - Store `productId`, `transactionId`, `amounts` correctly

3. **Run UAT Tests:**
   - Use test mobile numbers from test packs 1 & 2
   - Use product values from test pack 3 (Fixed Pinned)
   - Test all 4 networks (Vodacom, MTN, CellC, Telkom)
   - **Test Pack 1:** Variable Pinless Airtime (4 tests)
   - **Test Pack 2:** Fixed Pinless Airtime (4 tests) + Fixed Pinless Data (4 tests)
   - **Test Pack 3:** Fixed Pinned Airtime (4 tests) + Fixed Pinned Data (4 tests)
   - **Total:** 20 compliance tests across all product types
   - Verify response structure matches expected format

4. **Contact Support:**
   - Email: support@mobilemart.co.za
   - Request clarification on:
     - Product listing endpoints (why returning HTML)
     - Test product IDs for UAT
     - Account activation status

---

## 🔗 **References**

- **Variable Pinless Airtime Test Pack:** https://docs.google.com/spreadsheets/d/1klxUAZWhm5f2vK3AndHe6GOi1ZukRbAK/edit?gid=752812717#gid=752812717
- **Fixed Pinless Airtime & Data Test Pack:** https://docs.google.com/spreadsheets/d/1Od-XIhVT5A3zh4iVVRa8mU42amf5HBg6/edit?gid=794722755#gid=794722755
- **Fixed Pinned Airtime & Data Test Pack:** https://docs.google.com/spreadsheets/d/1sbt4UPNG8cWvVilUqR3EKKdo_K27SV2w/edit?gid=383898377#gid=383898377
- **Contact:** support@mobilemart.co.za
- **Last Updated:** 24 April 2024

---

## 📊 **Test Summary**

| Test Pack | Product Type | Tests | Mobile/Value | Networks |
|-----------|-------------|-------|--------------|----------|
| 1 | Variable Pinless Airtime | 4 | Mobile numbers | All 4 |
| 2 | Fixed Pinless Airtime | 4 | Mobile numbers | All 4 |
| 2 | Fixed Pinless Data | 4 | Mobile numbers | All 4 |
| 3 | Fixed Pinned Airtime | 4 | Product values | All 4 |
| 3 | Fixed Pinned Data | 4 | Product values | All 4 |
| **Total** | **5 types** | **20** | **Mixed** | **All 4** |

---

**Last Updated:** November 10, 2025  
**Status:** 📋 **TEST PACK ANALYZED - READY FOR UAT TESTING**

