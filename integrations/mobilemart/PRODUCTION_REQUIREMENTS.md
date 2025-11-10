# MobileMart Production Requirements Checklist

**Date:** November 10, 2025  
**Status:** 📋 **PRODUCTION READINESS CHECKLIST**

---

## 🎯 **Overview**

This document outlines all requirements needed from MobileMart to deploy the MyMoolah Treasury Platform integration to production.

---

## 📋 **1. Production Credentials**

### **1.1 OAuth 2.0 Credentials** ✅ **REQUIRED**
- [ ] **Client ID** (Production)
  - Current UAT: `mymoolah`
  - Production: `_________________`
  
- [ ] **Client Secret** (Production)
  - Current UAT: `f905627c-f6ff-464c-ba6d-3cdd6a3b61d8`
  - Production: `_________________`
  - **Security:** Must be kept confidential, stored in environment variables only

- [ ] **Scope** (if different from UAT)
  - Current UAT: `api`
  - Production: `_________________`

### **1.2 API Endpoints** ✅ **REQUIRED**
- [ ] **Base URL** (Production)
  - Expected: `https://fulcrumswitch.com`
  - Confirmed: `_________________`
  
- [ ] **OAuth Token Endpoint** (Production)
  - Expected: `https://fulcrumswitch.com/connect/token`
  - Confirmed: `_________________`
  
- [ ] **API Version** (if different from UAT)
  - Current UAT: `v1`
  - Production: `_________________`

---

## 🌐 **2. Network & Infrastructure**

### **2.1 IP Whitelisting** ✅ **REQUIRED**
- [ ] **Production Server IP Addresses**
  - Primary: `_________________`
  - Secondary: `_________________`
  - Load Balancer: `_________________`
  
- [ ] **CIDR Blocks** (if applicable)
  - Range: `_________________`
  
- [ ] **Whitelist Status**
  - [ ] IPs submitted to MobileMart
  - [ ] IPs whitelisted and confirmed
  - [ ] Test connectivity from production IPs

### **2.2 SSL/TLS Certificates** ✅ **REQUIRED**
- [ ] **Certificate Requirements**
  - TLS 1.3 support: `Yes/No`
  - Certificate validation: `Required/Optional`
  - Self-signed certificates: `Allowed/Not Allowed`
  
- [ ] **Certificate Authority**
  - Required CA: `_________________`
  - Certificate chain: `_________________`

---

## 📊 **3. Rate Limits & Performance**

### **3.1 Rate Limits** ✅ **REQUIRED**
- [ ] **Transaction Rate Limits**
  - Requests per second: `_________________`
  - Requests per minute: `_________________`
  - Requests per hour: `_________________`
  - Requests per day: `_________________`
  
- [ ] **Burst Limits**
  - Burst capacity: `_________________`
  - Burst window: `_________________`
  
- [ ] **Rate Limit Headers**
  - Rate limit header name: `_________________`
  - Remaining requests header: `_________________`
  - Reset time header: `_________________`

### **3.2 Performance SLAs** ✅ **REQUIRED**
- [ ] **Response Time Targets**
  - Average response time: `_________________ms`
  - P95 response time: `_________________ms`
  - P99 response time: `_________________ms`
  
- [ ] **Availability SLA**
  - Uptime target: `_________________%`
  - Maintenance windows: `_________________`
  - Downtime notification: `_________________`

### **3.3 Load Testing** ✅ **REQUIRED**
- [ ] **Load Testing Approval**
  - [ ] Load testing approved for production
  - [ ] Load testing schedule: `_________________`
  - [ ] Load testing contact: `_________________`
  
- [ ] **Load Testing Parameters**
  - Maximum TPS for testing: `_________________`
  - Test duration: `_________________`
  - Test products: `_________________`

---

## 🧪 **4. Test Accounts & Data**

### **4.1 Test Accounts** ✅ **REQUIRED**
- [ ] **Airtime Test Accounts**
  - Vodacom test number: `_________________`
  - MTN test number: `_________________`
  - CellC test number: `_________________`
  - Telkom test number: `_________________`
  
- [ ] **Data Test Accounts**
  - Vodacom test number: `_________________`
  - MTN test number: `_________________`
  - CellC test number: `_________________`
  - Telkom test number: `_________________`
  
- [ ] **Bill Payment Test Accounts**
  - DSTV test account: `_________________`
  - Electricity test account: `_________________`
  - Other test accounts: `_________________`
  
- [ ] **Utility Test Accounts**
  - Electricity meter number: `_________________`
  - Water meter number: `_________________`
  - Other utility accounts: `_________________`

### **4.2 Test Products** ✅ **REQUIRED**
- [ ] **Product Catalog Access**
  - [ ] Production product catalog available
  - [ ] Product catalog sync approved
  - [ ] Product catalog update frequency: `_________________`
  
- [ ] **Test Products**
  - Airtime products: `Available/Not Available`
  - Data products: `Available/Not Available`
  - Voucher products: `Available/Not Available`
  - Utility products: `Available/Not Available`
  - Bill payment products: `Available/Not Available`

---

## 🔔 **5. Webhooks & Notifications**

### **5.1 Webhook Configuration** ⚠️ **IF APPLICABLE**
- [ ] **Webhook URL** (if applicable)
  - Production webhook URL: `_________________`
  - Webhook authentication: `_________________`
  
- [ ] **Webhook Events**
  - Transaction status updates: `Yes/No`
  - Product catalog updates: `Yes/No`
  - System notifications: `Yes/No`
  
- [ ] **Webhook Security**
  - Authentication method: `_________________`
  - Signature verification: `Yes/No`
  - SSL/TLS required: `Yes/No`

### **5.2 Notification Channels** ✅ **REQUIRED**
- [ ] **Support Contacts**
  - Technical support email: `_________________`
  - Technical support phone: `_________________`
  - Emergency contact: `_________________`
  
- [ ] **Notification Methods**
  - Email notifications: `Yes/No`
  - SMS notifications: `Yes/No`
  - API status page: `_________________`

---

## 📝 **6. Compliance & Documentation**

### **6.1 API Documentation** ✅ **REQUIRED**
- [ ] **Swagger/OpenAPI Documentation**
  - Production Swagger URL: `_________________`
  - API documentation URL: `_________________`
  
- [ ] **API Changelog**
  - Changelog URL: `_________________`
  - Update frequency: `_________________`
  
- [ ] **Error Codes**
  - Error code documentation: `_________________`
  - Error handling guide: `_________________`

### **6.2 Compliance Requirements** ✅ **REQUIRED**
- [ ] **PCI DSS Compliance**
  - PCI DSS level: `_________________`
  - Compliance certificate: `_________________`
  
- [ ] **Data Protection**
  - GDPR compliance: `Yes/No`
  - POPIA compliance: `Yes/No`
  - Data retention policy: `_________________`
  
- [ ] **Audit & Logging**
  - Audit log access: `Yes/No`
  - Log retention period: `_________________`
  - Log access method: `_________________`

### **6.3 Legal & Contracts** ✅ **REQUIRED**
- [ ] **Service Agreement**
  - [ ] Service agreement signed
  - [ ] Agreement effective date: `_________________`
  - [ ] Agreement expiration date: `_________________`
  
- [ ] **SLA Agreement**
  - [ ] SLA agreement signed
  - [ ] SLA terms: `_________________`
  - [ ] Penalty clauses: `_________________`

---

## 🔐 **7. Security Requirements**

### **7.1 Authentication & Authorization** ✅ **REQUIRED**
- [ ] **OAuth 2.0 Configuration**
  - Grant type: `client_credentials`
  - Token expiry: `_________________seconds`
  - Token refresh: `Automatic/Manual`
  
- [ ] **API Key Security**
  - Key rotation policy: `_________________`
  - Key expiration: `_________________`
  - Key revocation process: `_________________`

### **7.2 Data Security** ✅ **REQUIRED**
- [ ] **Data Encryption**
  - Data in transit: `TLS 1.3/TLS 1.2`
  - Data at rest: `Yes/No`
  - Encryption algorithm: `_________________`
  
- [ ] **PII Handling**
  - PII data handling: `_________________`
  - PII data retention: `_________________`
  - PII data deletion: `_________________`

---

## 💰 **8. Billing & Settlement**

### **8.1 Settlement Configuration** ✅ **REQUIRED**
- [ ] **Settlement Account**
  - Settlement account number: `_________________`
  - Settlement bank: `_________________`
  - Settlement frequency: `_________________`
  
- [ ] **Commission Structure**
  - Commission rates: `_________________`
  - Commission calculation: `_________________`
  - Commission payment: `_________________`
  
- [ ] **Reconciliation**
  - Reconciliation process: `_________________`
  - Reconciliation frequency: `_________________`
  - Reconciliation reports: `_________________`

### **8.2 Billing & Invoicing** ✅ **REQUIRED**
- [ ] **Invoicing**
  - Invoice frequency: `_________________`
  - Invoice format: `_________________`
  - Invoice delivery: `_________________`
  
- [ ] **Payment Terms**
  - Payment terms: `_________________`
  - Payment method: `_________________`
  - Payment processing: `_________________`

---

## 🚀 **9. Deployment & Go-Live**

### **9.1 Deployment Schedule** ✅ **REQUIRED**
- [ ] **Go-Live Date**
  - Planned go-live date: `_________________`
  - Go-live time: `_________________`
  - Go-live timezone: `_________________`
  
- [ ] **Deployment Windows**
  - Preferred deployment window: `_________________`
  - Maintenance windows: `_________________`
  - Blackout periods: `_________________`

### **9.2 Deployment Support** ✅ **REQUIRED**
- [ ] **MobileMart Support**
  - [ ] Support team available during go-live
  - [ ] Support contact during go-live: `_________________`
  - [ ] Support escalation process: `_________________`
  
- [ ] **Rollback Plan**
  - [ ] Rollback procedure documented
  - [ ] Rollback trigger conditions: `_________________`
  - [ ] Rollback contact: `_________________`

### **9.3 Monitoring & Alerting** ✅ **REQUIRED**
- [ ] **Monitoring Setup**
  - [ ] Monitoring dashboard access
  - [ ] Monitoring alerts configured
  - [ ] Monitoring contact: `_________________`
  
- [ ] **Alert Configuration**
  - [ ] Error rate alerts: `_________________`
  - [ ] Latency alerts: `_________________`
  - [ ] Availability alerts: `_________________`

---

## 📞 **10. Support & Contacts**

### **10.1 Support Contacts** ✅ **REQUIRED**
- [ ] **Technical Support**
  - Email: `_________________`
  - Phone: `_________________`
  - Hours: `_________________`
  
- [ ] **Account Management**
  - Account manager: `_________________`
  - Email: `_________________`
  - Phone: `_________________`
  
- [ ] **Emergency Support**
  - Emergency contact: `_________________`
  - Emergency phone: `_________________`
  - Emergency email: `_________________`

### **10.2 Escalation Process** ✅ **REQUIRED**
- [ ] **Escalation Levels**
  - Level 1: `_________________`
  - Level 2: `_________________`
  - Level 3: `_________________`
  
- [ ] **Escalation Contacts**
  - Level 1 contact: `_________________`
  - Level 2 contact: `_________________`
  - Level 3 contact: `_________________`

---

## 📊 **11. Environment Configuration**

### **11.1 Production Environment Variables** ✅ **REQUIRED**
```env
# MobileMart Production Configuration
MOBILEMART_LIVE_INTEGRATION=true
MOBILEMART_CLIENT_ID=_________________
MOBILEMART_CLIENT_SECRET=_________________
MOBILEMART_API_URL=https://fulcrumswitch.com
MOBILEMART_TOKEN_URL=https://fulcrumswitch.com/connect/token
MOBILEMART_SCOPE=api
```

### **11.2 Configuration Validation** ✅ **REQUIRED**
- [ ] **Credentials Validation**
  - [ ] Client ID validated
  - [ ] Client Secret validated
  - [ ] API URL validated
  - [ ] Token URL validated
  
- [ ] **Connectivity Testing**
  - [ ] OAuth token retrieval tested
  - [ ] Product listing tested
  - [ ] Purchase transactions tested
  - [ ] Error handling tested

---

## ✅ **12. Checklist Summary**

### **Critical Requirements** (Must Have)
- [ ] Production OAuth credentials
- [ ] Production API URLs
- [ ] IP whitelisting
- [ ] Rate limit information
- [ ] Test accounts
- [ ] Support contacts

### **Important Requirements** (Should Have)
- [ ] Load testing approval
- [ ] Performance SLAs
- [ ] Webhook configuration (if applicable)
- [ ] Compliance documentation
- [ ] Settlement configuration

### **Nice to Have** (Could Have)
- [ ] Monitoring dashboard access
- [ ] API documentation access
- [ ] Changelog access
- [ ] Additional test accounts

---

## 📝 **13. Next Steps**

1. **Submit Requirements Request** to MobileMart
2. **Schedule Production Onboarding** call
3. **Receive Production Credentials** and documentation
4. **Configure Production Environment** with credentials
5. **Test Production Connectivity** and functionality
6. **Coordinate Load Testing** with MobileMart
7. **Schedule Go-Live** date and time
8. **Deploy to Production** and monitor

---

## 📚 **Related Documentation**

- `MOBILEMART_UAT_STATUS.md` - UAT integration status
- `MOBILEMART_UAT_TEST_SUCCESS.md` - UAT test results
- `UAT_RATE_LIMITING.md` - UAT rate limiting limitations
- `LOAD_TESTING_GUIDE.md` - Load testing guide

---

**Last Updated:** November 10, 2025  
**Status:** 📋 **PRODUCTION REQUIREMENTS CHECKLIST - READY FOR SUBMISSION**

