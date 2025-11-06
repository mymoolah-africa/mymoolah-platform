# MobileMart Fulcrum Integration - Production Testing Request

**Date:** November 5, 2025  
**Merchant:** MyMoolah Treasury Platform  
**Integration Status:** Code Complete - Awaiting Credential Verification  
**Contact:** support@mobilemart.co.za / angelique@stackworx.io

---

## 🎯 **REQUEST SUMMARY**

We have completed the MobileMart Fulcrum API integration code and are ready to test in the production environment. We require verification of our credentials and confirmation of account setup to proceed with testing.

---

## ✅ **CURRENT STATUS**

### **Integration Code Status:**
- ✅ **OAuth Endpoint**: Correctly configured (`/connect/token`)
- ✅ **Base URL**: Updated to `fulcrumswitch.com` (PROD)
- ✅ **API Structure**: Matches MobileMart Fulcrum documentation
- ✅ **Product Endpoints**: Configured (`/api/v1/{vasType}/products`)
- ✅ **Purchase Endpoints**: Configured (`/api/v1/{vasType}/purchase`)
- ✅ **VAS Type Support**: Airtime, Data, Voucher, Bill Payment, Prepaid Utility
- ✅ **Error Handling**: Implemented for all MobileMart error codes

### **Current Credentials:**
- **Client ID**: `mymoolah`
- **Client Secret**: `c799bf37-934d-4dcf-bfec-42fb421a6407`
- **Environment**: Unknown (need confirmation if UAT or PROD)

### **Current Issue:**
- OAuth authentication returns `invalid_client` error
- Need to verify if credentials are correct and account is activated

---

## 📋 **REQUIRED INFORMATION**

### **1. Credential Verification**

Please verify the following credentials:

- **Client ID**: `mymoolah`
- **Client Secret**: `c799bf37-934d-4dcf-bfec-42fb421a6407`

**Questions:**
- [ ] Are these credentials correct?
- [ ] Are these credentials for UAT or PROD environment?
- [ ] Do we need separate credentials for each environment?
- [ ] Are the credentials case-sensitive?

---

### **2. Account Activation**

**Questions:**
- [ ] Is our merchant account activated for API access?
- [ ] Is API access enabled for our account?
- [ ] Are there any pending account setup steps?

---

### **3. Environment URLs**

**Please confirm the correct URLs:**

- **UAT Environment**: `https://uat.fulcrumswitch.com` ✓ (confirmed accessible)
- **PROD Environment**: `https://fulcrumswitch.com` ✓ (confirmed accessible)

**Questions:**
- [ ] Are these URLs correct for production testing?
- [ ] Is there a different URL for production?
- [ ] Do we need special access or VPN for production environment?

---

### **4. OAuth Token Endpoint**

**Current Configuration:**
- **Token Endpoint**: `/connect/token`
- **Grant Type**: OAuth 2.0 Client Credentials
- **Content-Type**: `application/x-www-form-urlencoded`

**Questions:**
- [ ] Is `/connect/token` the correct endpoint?
- [ ] Are there any additional parameters required?
- [ ] Is there a different endpoint for production?

---

### **5. IP Whitelisting**

**Questions:**
- [ ] Is IP whitelisting required for API access?
- [ ] If yes, what IP addresses should be whitelisted?
- [ ] Do we need to provide static IP addresses?
- [ ] How long does IP whitelisting take to activate?

**Our IP Addresses** (if required):
- **Production Server IP**: `[TO BE PROVIDED]`
- **Development Server IP**: `[TO BE PROVIDED]`
- **Codespaces IP**: `[DYNAMIC - NEED GUIDANCE]`

---

### **6. Account Setup**

**Questions:**
- [ ] Has our merchant account been loaded with funds?
- [ ] Has a credit limit been set for our account?
- [ ] Have products been exposed to our merchant account?
- [ ] Have balance alerts been configured?
- [ ] Have low balance email notifications been configured?

**Required Email Addresses for Alerts:**
- Primary: `[TO BE PROVIDED]`
- Secondary: `[TO BE PROVIDED]`

---

### **7. Product Access**

**Questions:**
- [ ] Which VAS types do we have access to?
  - [ ] Airtime (Pinned and Pinless)
  - [ ] Data (Pinned and Pinless)
  - [ ] Voucher (Pinned)
  - [ ] Bill Payment
  - [ ] Prepaid Utility (Electricity)
- [ ] Are all products available for testing?
- [ ] Are there any product restrictions?

---

### **8. Rate Limits**

**Questions:**
- [ ] What is the Fulcrum rate limit for our account?
- [ ] Are there different limits for UAT vs PROD?
- [ ] What happens if we exceed the rate limit?

---

### **9. Testing Requirements**

**Questions:**
- [ ] Can we test in UAT environment first?
- [ ] Do we need to complete compliance tests before production?
- [ ] Are there specific test scenarios we must complete?
- [ ] What is the process for moving from UAT to PROD?

---

### **10. Documentation & Support**

**Requested:**
- [ ] Access to Swagger documentation (`https://uat.fulcrumswitch.com/swagger`)
- [ ] Working example curl command for authentication
- [ ] Working example curl command for product listing
- [ ] Working example curl command for purchase
- [ ] API release notes (if available)
- [ ] Compliance test pack documentation

---

## 🔧 **TECHNICAL DETAILS**

### **Authentication Request Format:**
```bash
POST https://fulcrumswitch.com/connect/token
Content-Type: application/x-www-form-urlencoded
Accept: application/json

Body:
grant_type=client_credentials&client_id=mymoolah&client_secret=c799bf37-934d-4dcf-bfec-42fb421a6407
```

### **Current Error Response:**
```json
{
  "error": "invalid_client",
  "error_description": "The specified client credentials are invalid.",
  "error_uri": "https://documentation.openiddict.com/errors/ID2055"
}
```

### **Expected Response:**
```json
{
  "access_token": "...",
  "token_type": "Bearer",
  "expires_in": 7200
}
```

---

## 📞 **NEXT STEPS**

### **Immediate Actions Required:**

1. **Verify Credentials**
   - Confirm if `mymoolah` / `c799bf37-934d-4dcf-bfec-42fb421a6407` are correct
   - Confirm which environment these credentials are for

2. **Account Activation**
   - Confirm API access is enabled
   - Complete any pending account setup steps

3. **Provide Working Example**
   - Send a working curl command that successfully authenticates
   - Include any required headers or parameters

4. **Documentation Access**
   - Provide access to Swagger documentation
   - Share API release notes and compliance test packs

5. **IP Whitelisting** (if required)
   - Confirm if IP whitelisting is needed
   - Provide process for adding IP addresses

---

## 📧 **CONTACT INFORMATION**

**MobileMart Support:**
- **Support Email**: support@mobilemart.co.za
- **Contact Person**: Angelique | angelique@stackworx.io
- **Support Portal**: [Log a Ticket](https://mobilemart.co.za/support)

**Our Contact:**
- **Merchant Name**: MyMoolah Treasury Platform
- **Contact Person**: [TO BE PROVIDED]
- **Email**: [TO BE PROVIDED]
- **Phone**: [TO BE PROVIDED]

---

## ✅ **COMPLIANCE STATUS**

- [ ] **Compliance Tests**: Ready to complete compliance test packs
- [ ] **Documentation**: Have reviewed MobileMart Fulcrum Integration Document
- [ ] **Code Review**: Integration code reviewed and matches documentation
- [ ] **Testing**: Ready to test in UAT environment
- [ ] **Production**: Ready to test in PROD environment after UAT approval

---

## 📝 **ADDITIONAL NOTES**

- We have successfully discovered the correct OAuth endpoint (`/connect/token`)
- Our integration code is complete and matches the MobileMart Fulcrum API structure
- We are receiving proper error responses from the API (indicating the endpoint is correct)
- We are ready to proceed with testing once credentials are verified

---

**Thank you for your assistance. We look forward to completing the integration and testing process.**

---

**Document Version**: 1.0  
**Last Updated**: November 5, 2025  
**Status**: Awaiting Response from MobileMart Support

