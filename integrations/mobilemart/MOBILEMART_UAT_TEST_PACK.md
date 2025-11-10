# MobileMart Fulcrum UAT Test Pack - Analysis

**Source:** [Fulcrum UAT Test Pack - Variable Pinless Airtime Electrum](https://docs.google.com/spreadsheets/d/1klxUAZWhm5f2vK3AndHe6GOi1ZukRbAK/edit?gid=752812717#gid=752812717)  
**Last Updated:** 24 April 2024  
**Contact:** support@mobilemart.co.za

---

## 📋 **Test Pack Overview**

### **Test Type:**
- **Variable Pinless Airtime** (Electrum)
- **Fixed Pinless Airtime & Data** (separate tab)

### **Total Tests:**
- 4 Compliance Tests for Variable Pinless Airtime

### **Test Data:**
- Test 4 Variable Pinless MNO Products:
  - Vodacom
  - MTN
  - CellC
  - Telkom

---

## 🧪 **Test Cases**

### **VPL-001: Purchase Variable Pinless Airtime (Vodacom)**
- **Mobile Number:** `0720012345`
- **Network:** Vodacom
- **Type:** Variable Pinless Airtime

### **VPL-002: Purchase Variable Pinless Airtime (MTN)**
- **Mobile Number:** `0830012300`
- **Network:** MTN
- **Type:** Variable Pinless Airtime

### **VPL-003: Purchase Variable Pinless Airtime (CellC)**
- **Mobile Number:** `0840000000`
- **Network:** CellC
- **Type:** Variable Pinless Airtime

### **VPL-004: Purchase Variable Pinless Airtime (Telkom)**
- **Mobile Number:** `0850012345`
- **Network:** Telkom
- **Type:** Variable Pinless Airtime

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
- **Vodacom:** `0720012345` (starts with 072)
- **MTN:** `0830012300` (starts with 083)
- **CellC:** `0840000000` (starts with 084)
- **Telkom:** `0850012345` (starts with 085)

### **3. Product Information:**
- `productId`: Used for purchase requests
- `isDirectTopup`: Boolean indicating direct topup
- `wholesalePrice`: Price information
- `recipientAmount`: Amount credited to recipient
- `operator`: Network operator information

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
   - Use test mobile numbers from test pack
   - Test all 4 networks
   - Verify response structure matches expected format

4. **Contact Support:**
   - Email: support@mobilemart.co.za
   - Request clarification on:
     - Product listing endpoints (why returning HTML)
     - Test product IDs for UAT
     - Account activation status

---

## 🔗 **References**

- **Test Pack:** https://docs.google.com/spreadsheets/d/1klxUAZWhm5f2vK3AndHe6GOi1ZukRbAK/edit?gid=752812717#gid=752812717
- **Contact:** support@mobilemart.co.za
- **Last Updated:** 24 April 2024

---

**Last Updated:** November 10, 2025  
**Status:** 📋 **TEST PACK ANALYZED - READY FOR UAT TESTING**

