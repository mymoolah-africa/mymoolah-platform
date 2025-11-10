# MobileMart API Schemas Reference

**Date:** 2025-11-10  
**Source:** Swagger UI Documentation

---

## 📋 **Request Schemas**

### **AirtimePinlessRequest**
```json
{
  "requestId": "string",           // *Required
  "merchantProductId": "string",   // *Required
  "tenderType": "TenderType",      // *Required (CreditCard, etc.)
  "mobileNumber": "string",        // *Required
  "amount": number                  // Optional (if FixedAmount product)
}
```

### **AirtimePinnedRequest**
```json
{
  "requestId": "string",           // *Required
  "merchantProductId": "string",   // *Required
  "tenderType": "TenderType",      // *Required
  "amount": number                  // Optional (if FixedAmount product)
}
```

### **DataPinlessRequest**
```json
{
  "requestId": "string",           // *Required
  "merchantProductId": "string",   // *Required
  "tenderType": "TenderType",      // *Required
  "mobileNumber": "string"          // *Required
}
```

### **DataPinnedRequest**
```json
{
  "requestId": "string",           // *Required
  "merchantProductId": "string",   // *Required
  "tenderType": "TenderType"       // *Required
}
```

### **VoucherRequest**
```json
{
  "requestId": "string",           // *Required
  "merchantProductId": "string",   // *Required
  "tenderType": "TenderType",      // *Required
  "amount": number                  // Optional (if FixedAmount product)
}
```

### **BillPaymentRequestV2**
```json
{
  "requestId": "string",           // *Required
  "prevendTransactionId": "uuid",  // *Required (from prevend call)
  "tenderType": "TenderType",      // *Required
  "amount": number,                 // *Required
  "tenderPan": "string"            // Optional
}
```

### **UtilityRequest**
```json
{
  "requestId": "string",           // *Required
  "prevendTransactionId": "uuid",  // *Required (from prevend call)
  "tenderType": "TenderType",      // *Required
  "tenderPan": "string"            // Optional
}
```

---

## 📋 **Response Schemas**

### **MerchantProductResponse** (Airtime/Data Products)
```json
{
  "merchantProductId": "string",
  "productName": "string",
  "contentCreator": "string",
  "pinned": boolean,
  "fixedAmount": boolean,
  "amount": number,
  "minimumAmount": number,
  "maximumAmount": number
}
```

### **BillPaymentProductResponse**
```json
{
  "merchantProductId": "string",
  "productName": "string",
  "contentCreator": "string",
  "minimumAmount": number,
  "maximumAmount": number
}
```

### **UtilityProductResponse**
```json
{
  "merchantProductId": "string",
  "name": "string"
}
```

### **VoucherProductResponse**
```json
{
  "merchantProductId": "string",
  "productName": "string",
  "contentCreator": "string",
  "amount": number,
  "minimumAmount": number,
  "maximumAmount": number,
  "fixedAmount": boolean
}
```

### **PinnedResponse** (Airtime/Data/Voucher)
```json
{
  "timestamp": "datetime",
  "transactionId": "uuid",
  "expiryDate": "datetime",
  "additionalDetails": {
    "productInstructions": "string",
    "productAmount": "string",
    "pin": "string",
    "serialNumber": "string",
    "referenceNumber": "string",
    "productName": "string",
    "contentCreator": "string"
  }
}
```

### **PinlessResponse** (Airtime/Data)
```json
{
  "timestamp": "datetime",
  "transactionId": "uuid",
  "productName": "string",
  "contentCreator": "string",
  "amount": number,
  "mobileNumber": "string",
  "referenceNumber": "string"
}
```

### **BillPaymentResponse**
```json
{
  "timestamp": "datetime",
  "transactionId": "uuid",
  "amount": number,
  "amountDue": number,
  "accountNumber": "string",
  "accountHolder": "string",
  "reference": "string",
  "serviceProviderContact": "string",
  "serviceProviderName": "string",
  "convenienceFee": number,
  "tenderPan": "string",
  "productName": "string",
  "vasCategoryIdentifier": "string"
}
```

### **UtilityResponse**
```json
{
  "timestamp": "datetime",
  "transactionId": "uuid",
  "additionalDetails": {
    "productAmount": "string",
    "reference": "string",
    "receiptNumber": "string",
    "fixedCosts": [...],
    "processor": "string",
    "operator": "string",
    "tokens": [...],
    "consumerDetails": {...},
    "municipalityDetails": {...},
    "supplierGroupCode": "string",
    "keyRevisionNumber": "string",
    "tariffIndex": "string",
    "tokenTechCode": "string",
    "algorithmCode": "string",
    "onlineMeter": boolean,
    "accountStatus": {...},
    "instructions": "string"
  }
}
```

---

## 🔑 **Key Schema Requirements**

### **Common Required Fields:**
- `requestId`: Unique merchant transaction identifier
- `merchantProductId`: Product ID from GET products endpoint
- `tenderType`: Payment method (CreditCard, etc.)

### **VAS-Specific Requirements:**

1. **Airtime/Data Pinless:**
   - Requires `mobileNumber`

2. **Airtime/Data Pinned:**
   - No `mobileNumber` needed

3. **Bill Payment:**
   - Requires `prevendTransactionId` (from prevend call)
   - Requires `amount`

4. **Utility:**
   - Requires `prevendTransactionId` (from prevend call)
   - No `amount` (determined by prevend)

5. **Voucher:**
   - Optional `amount` (if not FixedAmount product)

---

## 📝 **TenderType Enum**

TenderType can be one of 10 values (from Swagger):
- `CreditCard` (most common)
- (9 other values - check Swagger for full list)

---

## ⚠️ **Important Notes**

1. **FixedAmount Products:**
   - If product has `fixedAmount: true`, the `amount` field can be omitted
   - The amount is determined by the product itself

2. **Prevend Flow:**
   - Bill Payment and Utility require a **prevend** call first
   - Use `prevendTransactionId` from prevend response in purchase request

3. **Pinned vs Pinless:**
   - Check product `pinned` field to determine which endpoint to use
   - Pinned: `/v1/{vasType}/pinned`
   - Pinless: `/v1/{vasType}/pinless`

---

**Last Updated:** 2025-11-10  
**Status:** 📋 **SCHEMA REFERENCE DOCUMENTATION**

