# MobileMart Production Credentials - Quick Reference

**Date:** November 10, 2025  
**Status:** 📋 **PRODUCTION CREDENTIALS REFERENCE**

---

## 🔑 **Production Credentials Overview**

Production credentials consist of the following components:

---

## 1. **OAuth 2.0 Credentials** ✅ **REQUIRED**

### **Client ID**
- **Purpose:** Identifies your application to MobileMart API
- **Format:** String (e.g., `mymoolah`)
- **UAT Example:** `mymoolah`
- **Production:** `_________________` (To be provided by MobileMart)
- **Environment Variable:** `MOBILEMART_CLIENT_ID`

### **Client Secret**
- **Purpose:** Authenticates your application with MobileMart API
- **Format:** UUID/GUID string
- **UAT Example:** `f905627c-f6ff-464c-ba6d-3cdd6a3b61d8`
- **Production:** `_________________` (To be provided by MobileMart)
- **Environment Variable:** `MOBILEMART_CLIENT_SECRET`
- **Security:** ⚠️ **MUST BE KEPT CONFIDENTIAL** - Store in environment variables only

### **Scope**
- **Purpose:** Defines API access permissions
- **Format:** String (e.g., `api`)
- **UAT Example:** `api`
- **Production:** `_________________` (Usually same as UAT)
- **Environment Variable:** `MOBILEMART_SCOPE`

---

## 2. **API Endpoints** ✅ **REQUIRED**

### **Base URL**
- **Purpose:** Base URL for all API requests
- **Format:** HTTPS URL
- **UAT:** `https://uat.fulcrumswitch.com`
- **Production:** `https://fulcrumswitch.com`
- **Environment Variable:** `MOBILEMART_API_URL`

### **OAuth Token URL**
- **Purpose:** Endpoint for OAuth token requests
- **Format:** HTTPS URL with path
- **UAT:** `https://uat.fulcrumswitch.com/connect/token`
- **Production:** `https://fulcrumswitch.com/connect/token`
- **Environment Variable:** `MOBILEMART_TOKEN_URL`

### **API Version**
- **Purpose:** API version path
- **Format:** String (e.g., `v1`)
- **UAT:** `v1`
- **Production:** `v1` (Usually same as UAT)
- **Usage:** Used in API URL construction: `${baseUrl}/${apiVersion}`

---

## 3. **Environment Configuration** ✅ **REQUIRED**

### **Production Environment Variables**
```env
# MobileMart Production Configuration
MOBILEMART_LIVE_INTEGRATION=true
MOBILEMART_CLIENT_ID=_________________
MOBILEMART_CLIENT_SECRET=_________________
MOBILEMART_API_URL=https://fulcrumswitch.com
MOBILEMART_TOKEN_URL=https://fulcrumswitch.com/connect/token
MOBILEMART_SCOPE=api
```

### **Configuration Notes**
- `MOBILEMART_LIVE_INTEGRATION=true` - Enables live API integration
- All credentials must be provided by MobileMart
- Never commit credentials to version control
- Use environment variables or secure secret management

---

## 4. **Network Configuration** ✅ **REQUIRED**

### **IP Whitelisting**
- **Purpose:** Restricts API access to authorized IP addresses
- **Required Information:**
  - Production server IP addresses
  - Load balancer IP addresses
  - CIDR blocks (if applicable)
- **Process:**
  1. Provide IP addresses to MobileMart
  2. MobileMart whitelists IPs
  3. Test connectivity from production IPs

### **SSL/TLS Configuration**
- **Purpose:** Ensures secure communication
- **Requirements:**
  - TLS 1.3 support (preferred)
  - Valid SSL certificates
  - Certificate validation
- **Configuration:**
  - API uses HTTPS
  - Certificates validated by MobileMart

---

## 5. **Rate Limits** ✅ **REQUIRED**

### **Rate Limit Information**
- **Purpose:** Defines API usage limits
- **Required Information:**
  - Requests per second
  - Requests per minute
  - Requests per hour
  - Requests per day
  - Burst capacity
- **Usage:**
  - Monitor rate limit headers
  - Implement rate limit handling
  - Coordinate load testing

---

## 6. **Test Accounts** ✅ **REQUIRED**

### **Test Mobile Numbers**
- **Purpose:** Test accounts for purchase transactions
- **Required:**
  - Vodacom test number
  - MTN test number
  - CellC test number
  - Telkom test number
- **Usage:**
  - Testing purchase transactions
  - Load testing
  - Integration validation

### **Test Bill Payment Accounts**
- **Purpose:** Test accounts for bill payment
- **Required:**
  - DSTV test account
  - Electricity test account
  - Other test accounts
- **Usage:**
  - Testing bill payment transactions
  - Integration validation

### **Test Utility Accounts**
- **Purpose:** Test accounts for utility purchases
- **Required:**
  - Electricity meter number
  - Water meter number
  - Other utility accounts
- **Usage:**
  - Testing utility transactions
  - Integration validation

---

## 7. **Support Contacts** ✅ **REQUIRED**

### **Technical Support**
- **Email:** `_________________`
- **Phone:** `_________________`
- **Hours:** `_________________`
- **Purpose:** Technical support and issue resolution

### **Account Management**
- **Account Manager:** `_________________`
- **Email:** `_________________`
- **Phone:** `_________________`
- **Purpose:** Account management and coordination

### **Emergency Support**
- **Contact:** `_________________`
- **Phone:** `_________________`
- **Email:** `_________________`
- **Purpose:** Emergency support and critical issues

---

## 8. **Additional Requirements** ⚠️ **IF APPLICABLE**

### **Webhooks** (If Applicable)
- **Webhook URL:** `_________________`
- **Authentication:** `_________________`
- **Events:** `_________________`
- **Purpose:** Real-time transaction updates

### **Monitoring** (If Applicable)
- **Dashboard URL:** `_________________`
- **API Key:** `_________________`
- **Purpose:** Monitoring and alerting

### **Documentation** (If Applicable)
- **Swagger URL:** `_________________`
- **API Documentation:** `_________________`
- **Purpose:** API reference and documentation

---

## 📋 **Credential Checklist**

### **Must Have** ✅
- [ ] Production Client ID
- [ ] Production Client Secret
- [ ] Production API Base URL
- [ ] Production OAuth Token URL
- [ ] OAuth Scope
- [ ] IP Whitelisting
- [ ] Rate Limit Information
- [ ] Test Accounts
- [ ] Support Contacts

### **Should Have** ⚠️
- [ ] Webhook Configuration (if applicable)
- [ ] Monitoring Access (if applicable)
- [ ] API Documentation Access
- [ ] Load Testing Approval

### **Nice to Have** 📝
- [ ] Additional Test Accounts
- [ ] Changelog Access
- [ ] Status Page Access
- [ ] Community Forum Access

---

## 🔐 **Security Best Practices**

### **Credential Storage**
- ✅ Store credentials in environment variables
- ✅ Use secure secret management (e.g., AWS Secrets Manager, Azure Key Vault)
- ✅ Never commit credentials to version control
- ✅ Rotate credentials regularly
- ✅ Use different credentials for each environment

### **Credential Usage**
- ✅ Validate credentials before use
- ✅ Handle credential errors gracefully
- ✅ Log credential usage (without exposing secrets)
- ✅ Monitor credential access
- ✅ Implement credential rotation

### **Credential Protection**
- ⚠️ Never share credentials via email
- ⚠️ Never log credentials in plain text
- ⚠️ Never expose credentials in API responses
- ⚠️ Never commit credentials to Git
- ⚠️ Never hardcode credentials in code

---

## 📊 **Credential Comparison**

| Credential | UAT | Production | Status |
|------------|-----|------------|--------|
| Client ID | `mymoolah` | `_________________` | ⏳ Pending |
| Client Secret | `f905627c-...` | `_________________` | ⏳ Pending |
| API URL | `https://uat.fulcrumswitch.com` | `https://fulcrumswitch.com` | ✅ Known |
| Token URL | `https://uat.fulcrumswitch.com/connect/token` | `https://fulcrumswitch.com/connect/token` | ✅ Known |
| Scope | `api` | `api` | ✅ Known |
| IP Whitelisting | Not Required | Required | ⏳ Pending |
| Rate Limits | Strict (prevents load testing) | To be determined | ⏳ Pending |
| Test Accounts | Provided | To be provided | ⏳ Pending |

---

## 🚀 **Next Steps**

1. **Request Production Credentials** from MobileMart
2. **Receive Credentials** via secure channel
3. **Configure Environment** with production credentials
4. **Test Connectivity** and functionality
5. **Validate Credentials** and API access
6. **Deploy to Production** and monitor

---

## 📚 **Related Documentation**

- `PRODUCTION_REQUIREMENTS.md` - Complete production requirements checklist
- `PRODUCTION_REQUEST_EMAIL.md` - Email template for requesting production access
- `MOBILEMART_UAT_STATUS.md` - UAT integration status
- `MOBILEMART_UAT_TEST_SUCCESS.md` - UAT test results

---

**Last Updated:** November 10, 2025  
**Status:** 📋 **PRODUCTION CREDENTIALS QUICK REFERENCE - READY FOR USE**

