# MobileMart UAT API Payloads - Investigation Report
**Date**: 2026-01-13  
**Environment**: UAT (Codespaces)  
**Issue**: CellC and Vodacom transactions failing, Telkom and MTN working

---

## ❌ FAILED TRANSACTIONS

### 1. **Vodacom Failed Transaction**

**Product Details:**
- Product Name: `Vodacom Power 60min Voice Bundle R5`
- Supplier Product ID: `D1eiCf7vEOVbYERfE1vZ`
- Variant ID: `401`
- Amount: R5.00
- Mobile Number: `0829802807`
- Beneficiary: "Vodacom Test Number" (ID: 21)

**MyMoolah → MobileMart Request:**
```json
{
  "requestId": "overlay_user_1768312780903_qhhfptdsw",
  "merchantProductId": "D1eiCf7vEOVbYERfE1vZ",
  "tenderType": "CreditCard",
  "mobileNumber": "0829802807",
  "amount": 5
}
```

**MobileMart API Endpoint:**
```
POST https://uat.fulcrumswitch.com/v1/airtime/pinless
```

**MobileMart → MyMoolah Response:**
```json
{
  "type": "https://uat.fulcrumswitch.com/error-codes#1013",
  "title": "Mobile Number is invalid.",
  "status": 400,
  "detail": "The mobile number supplied is invalid.",
  "traceId": "00-da0fffb46e8571eb11def5213b218f5f-4c878850f5557d62-01",
  "fulcrumErrorCode": 1013,
  "msisdn": "0829802807"
}
```

**Error Code**: `1013`  
**Error Message**: "Mobile Number is invalid."  
**HTTP Status**: `400 Bad Request`

---

### 2. **CellC Failed Transaction**

**Product Details:**
- Product Name: *(Not shown in logs, but likely "Cell C Airtime")*
- Variant ID: `403`
- Amount: R20.00
- Beneficiary: "CellC Test Number" (ID: 22)

**MyMoolah → Frontend Request:**
```json
{
  "beneficiaryId": "22",
  "productId": "403",
  "amount": 20,
  "idempotencyKey": "overlay_user_1768307527715_ut23g7gfr"
}
```

**Error Response:**
```
HTTP 400 Bad Request
"This mobile number cannot be recharged on the CellC network. 
Please verify the mobile number belongs to CellC or select a different product."
```

**Note**: Full MobileMart API request/response payload not shown in console logs for this transaction.

---

## ✅ SUCCESSFUL TRANSACTIONS (MISSING FROM LOGS)

### Telkom Transaction
**Status**: ✅ Working 100%  
**Details**: Payload not captured in provided console logs.

### MTN Transaction
**Status**: ✅ Working 100%  
**Details**: Payload not captured in provided console logs.

---

## 📋 TO EXTRACT SUCCESSFUL TRANSACTION PAYLOADS

To get the complete payloads for **successful Telkom and MTN** transactions, run in **Codespaces**:

### Option 1: Search Backend Logs
```bash
cd /workspaces/mymoolah-platform

# Find recent successful MobileMart requests
grep -A 20 "MobileMart request:" logs/*.log | grep -B 5 -A 15 "telkom\|mtn" -i

# Find successful responses (200 OK)
grep -A 30 "MobileMart HTTP Response:" logs/*.log | grep -B 5 -A 25 "status: 200"
```

### Option 2: Test Again with Logging
1. Perform a **successful Telkom** airtime purchase (any amount)
2. Perform a **successful MTN** airtime purchase (any amount)
3. Check backend terminal logs for:
   - `📤 MobileMart request:`
   - `🔍 MobileMart HTTP Response:`

### Option 3: Database Query
Query the `product_availability_logs` table for recent successful transactions:

```sql
SELECT 
  "productName",
  "supplierCode",
  "errorCode",
  "errorMessage",
  "checkedAt",
  "productId"
FROM product_availability_logs
WHERE "supplierCode" = 'MOBILEMART'
  AND "checkedAt" > NOW() - INTERVAL '1 hour'
ORDER BY "checkedAt" DESC;
```

---

## 🔍 KEY OBSERVATIONS

### Vodacom Error (1013)
- **MobileMart says**: "Mobile Number is invalid"
- **Mobile Number Used**: `0829802807`
- **Format**: Correct (10 digits, starts with 0)
- **Product**: `D1eiCf7vEOVbYERfE1vZ` (Vodacom Power 60min Voice Bundle R5)
- **Possible Causes**:
  1. UAT environment only accepts specific whitelisted test numbers for Vodacom
  2. Product might be restricted in UAT
  3. Number format issue (though format appears correct)

### CellC Error
- **Error**: "This mobile number cannot be recharged on the CellC network"
- **Possible Causes**:
  1. Similar UAT restriction as Vodacom
  2. Number might not be a valid CellC number in production database
  3. Product availability issue

### Telkom & MTN Success
- Both networks work 100% ✅
- Suggests:
  1. MyMoolah integration code is correct
  2. Authentication is working
  3. Issue is network-specific (Vodacom/CellC only)

---

## 📤 INFORMATION TO SEND TO MOBILEMART

### Summary
- **Working Networks**: Telkom ✅, MTN ✅
- **Failing Networks**: Vodacom ❌, CellC ❌
- **Environment**: UAT (https://uat.fulcrumswitch.com)
- **Client ID**: mymoolah (UAT credentials)
- **Date/Time**: 2026-01-13 13:59 UTC

### Question for MobileMart Support
> "We're testing the UAT environment and encountering network-specific failures:
> 
> 1. **Vodacom**: Error 1013 "Mobile Number is invalid" for number `0829802807`
>    - Product: `D1eiCf7vEOVbYERfE1vZ` (Vodacom Power 60min Voice Bundle R5)
>    - Trace ID: `00-da0fffb46e8571eb11def5213b218f5f-4c878850f5557d62-01`
> 
> 2. **CellC**: "This mobile number cannot be recharged on the CellC network"
>    - Product: Variant ID 403
> 
> 3. **Telkom & MTN**: Working perfectly ✅
> 
> **Questions**:
> - Are there specific whitelisted test numbers for Vodacom/CellC in UAT?
> - Are these products (`D1eiCf7vEOVbYERfE1vZ` and CellC products) available in UAT?
> - What mobile number formats should we use for testing Vodacom/CellC in UAT?"

---

## 📝 NEXT STEPS

1. **Extract successful payloads** using the methods above
2. **Send complete report** to MobileMart support with:
   - This document
   - Successful Telkom/MTN payloads (once extracted)
   - Failed Vodacom/CellC payloads (already documented above)
3. **Request UAT test numbers** for Vodacom and CellC
4. **Verify product availability** in UAT for these networks

---

## 📞 CONTACT

**MobileMart UAT Support**:
- Send this report with complete payloads
- Reference Trace IDs for failed transactions
- Request whitelisted test numbers for all networks

---

*Document generated: 2026-01-13*  
*Environment: UAT*  
*Client: MyMoolah*
