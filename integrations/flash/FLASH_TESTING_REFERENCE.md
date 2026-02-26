# Flash API Testing Reference

**Last Updated**: 2026-02-01  
**Source**: Flash Production Credentials Documentation  
**Purpose**: Testing tokens and error codes for Flash API integration

---

## 🧪 **QA Environment Test Tokens**

Use these tokens to test different error scenarios in QA:

| Scenario | Token | Expected Error Code |
|----------|-------|---------------------|
| **Cancelled** | `1148012471316791` | 2403 - Voucher has been cancelled |
| **Invalid** | `11919009804153931` | 2402 - Voucher could not be found |
| **Expired** | `1349050685110149` | 2405 - Voucher has expired |
| **Already Used** | `1107477562497306` | 2401 - Voucher already used |
| **Invalid/Not Found** | `1807477522497507` | 2402 - Voucher could not be found |

---

## 🚀 **V4 Production Test Tokens**

Use these tokens to test error scenarios in Production:

| Scenario | Token | Expected Error Code |
|----------|-------|---------------------|
| **Cancelled** | `1982069215158100` | 2403 - Voucher has been cancelled |
| **Expired** | `1527144039167197` | 2405 - Voucher has expired |
| **Already Used** | `1644561242205522` | 2401 - Voucher already used |

---

## ⚠️ **Flash API Error Codes**

### **Voucher-Related Errors**

| Error Code | Message | Description |
|------------|---------|-------------|
| **2400** | 3rd party system error | Upstream system failure |
| **2401** | The voucher you have entered has already been used, please use another voucher pin | Voucher already redeemed |
| **2402** | The voucher you have entered could not be found | Invalid voucher PIN |
| **2403** | The voucher you have entered has been cancelled | Voucher cancelled |
| **2405** | The voucher you have entered has expired | Voucher past expiry date |
| **2406** | Amount entered is too small | Below minimum amount |
| **2408** | Amount entered is too large | Above maximum amount |
| **2409** | The voucher has already been cancelled | Duplicate cancellation |
| **2410** | Refund amount does not match the redemption amount | Refund validation failed |
| **2412** | The voucher you have entered cannot be reversed | Reversal not allowed |
| **2413** | The voucher has already been reversed | Duplicate reversal |
| **2414** | The voucher cannot be cancelled | Cancellation not allowed |

---

## 🧪 **Testing Scenarios**

### **Scenario 1: Successful Voucher Redemption**
```javascript
// Use a valid, unused voucher token
POST /1voucher/redeem
{
  "reference": "TEST_REDEEM_001",
  "accountNumber": "8444-1533-7896-6119",
  "pin": "<valid_unused_pin>",
  "productCode": 1
}

// Expected: 200 OK with voucher details
```

### **Scenario 2: Already Used Voucher (Error 2401)**
```javascript
POST /1voucher/redeem
{
  "reference": "TEST_USED_001",
  "accountNumber": "8444-1533-7896-6119",
  "pin": "1644561242205522", // Production already-used token
  "productCode": 1
}

// Expected: Error 2401 - Voucher already used
```

### **Scenario 3: Expired Voucher (Error 2405)**
```javascript
POST /1voucher/redeem
{
  "reference": "TEST_EXPIRED_001",
  "accountNumber": "8444-1533-7896-6119",
  "pin": "1527144039167197", // Production expired token
  "productCode": 1
}

// Expected: Error 2405 - Voucher expired
```

### **Scenario 4: Cancelled Voucher (Error 2403)**
```javascript
POST /1voucher/redeem
{
  "reference": "TEST_CANCELLED_001",
  "accountNumber": "8444-1533-7896-6119",
  "pin": "1982069215158100", // Production cancelled token
  "productCode": 1
}

// Expected: Error 2403 - Voucher cancelled
```

### **Scenario 5: Invalid Voucher (Error 2402)**
```javascript
POST /1voucher/redeem
{
  "reference": "TEST_INVALID_001",
  "accountNumber": "8444-1533-7896-6119",
  "pin": "1807477522497507", // Production invalid token
  "productCode": 1
}

// Expected: Error 2402 - Voucher not found
```

---

## 📝 **Error Handling Best Practices**

### **Frontend Display**

Map Flash error codes to user-friendly messages:

```typescript
const FLASH_ERROR_MESSAGES = {
  2400: "Service temporarily unavailable. Please try again later.",
  2401: "This voucher has already been used. Please use a different voucher.",
  2402: "Voucher not found. Please check the PIN and try again.",
  2403: "This voucher has been cancelled and cannot be used.",
  2405: "This voucher has expired. Please use a valid voucher.",
  2406: "Amount is below the minimum required.",
  2408: "Amount exceeds the maximum allowed.",
  2409: "This voucher has already been cancelled.",
  2410: "Refund amount does not match the original amount.",
  2412: "This voucher cannot be reversed.",
  2413: "This voucher has already been reversed.",
  2414: "This voucher cannot be cancelled."
};
```

### **Backend Logging**

Log all Flash API errors with context:

```javascript
console.error('❌ Flash API Error:', {
  errorCode: error.response?.data?.errorCode || 'UNKNOWN',
  message: error.response?.data?.message || error.message,
  endpoint: error.config?.url,
  requestId: requestData.reference,
  timestamp: new Date().toISOString()
});
```

---

## 🔄 **Testing Workflow**

### **QA Environment Testing**
1. Use QA test tokens for error scenarios
2. Verify error codes match expected values
3. Test error message display in frontend
4. Verify logging captures all error details

### **Production Environment Testing**
1. Use production test tokens for error scenarios
2. Test with small amounts first (R10-R50)
3. Verify real voucher purchase/redemption flow
4. Monitor logs for unexpected errors

---

## 📚 **Related Documentation**

- `docs/session_logs/2026-02-01_1800_flash-integration-completion.md` - Flash integration details
- `controllers/flashController.js` - Flash API controller
- `services/flashAuthService.js` - Flash authentication service
- `integrations/flash/Flash Partner API v4 - release 3 1.pdf` - Official Flash API documentation (v3.1, April 2025) — **PRIMARY REFERENCE**

### 🔗 **Flash Google Drive (Source of Truth — Official Documents)**

**Shared Drive:** https://drive.google.com/drive/folders/1KbQ1joMy8h3-B6OoDAG3VigqcWNUBWno?usp=sharing

Contents:
| Item | Description |
|------|-------------|
| `Flash API documents/` | Official Flash API documentation folder |
| `FLASH Legal/` | Legal agreements and contracts |
| `MyMoolah Flash Deal Sheet Fully Signed.pdf` | Signed commercial agreement (Aug 2024) |

**IMPORTANT for all agents**: Always check this Google Drive first for the latest Flash API documentation before making any assumptions. The drive contains the authoritative versions of all Flash API specs, legal docs, and the signed deal sheet.

---

## ⚙️ **Environment Configuration**

**QA/UAT**:
```bash
FLASH_LIVE_INTEGRATION=false  # Use simulation
FLASH_API_URL=https://api.flashswitch.flash-group.com
```

**Staging/Production**:
```bash
FLASH_LIVE_INTEGRATION=true  # Use real API
FLASH_API_URL=https://api.flashswitch.flash-group.com
FLASH_CONSUMER_KEY=<from_credentials>
FLASH_CONSUMER_SECRET=<from_credentials>
FLASH_ACCOUNT_NUMBER=8444-1533-7896-6119  # AVT Sandbox (UAT/Codespaces)
# FLASH_ACCOUNT_NUMBER=0834-5373-6661-1279  # AVT Production (Staging + Production)
```

---

**Last Updated**: 2026-02-01  
**Status**: Ready for testing once Client ID/Secret added
