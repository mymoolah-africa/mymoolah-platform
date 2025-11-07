# Zapper Integration - Questions & Requirements for Production Deployment

**Date**: November 6, 2025  
**From**: MyMoolah Treasury Platform Development Team  
**Subject**: Zapper QR Code Payment Integration - Production Deployment Requirements

---

## 📋 **EXECUTIVE SUMMARY**

MyMoolah Treasury Platform has completed **85% of the Zapper QR code payment integration** and is ready to proceed with production deployment. We require the following information and support from the Zapper development team to complete the integration and enable real-life QR code payments at merchant locations.

**Integration Status**:
- ✅ Backend API integration: Complete
- ✅ Frontend QR scanning: Complete
- ✅ Database structure: Ready
- ⚠️ Production credentials: Required
- ⚠️ Webhook implementation: Pending
- ⚠️ Float account setup: Pending

**Timeline**: Ready to deploy within 5 weeks upon receiving required information and credentials.

---

## 🔑 **CRITICAL REQUIREMENTS**

### **1. Production API Credentials**
We require the following production credentials to complete the integration:

- **Production API URL**: Confirm if `https://api.zapper.com/v1` is correct or provide production URL
- **Organisation ID** (`ZAPPER_ORG_ID`): Required for service account authentication
- **API Token** (`ZAPPER_API_TOKEN`): Required for service account login
- **X-API-Key** (`ZAPPER_X_API_KEY`): Required for API authentication

**Question**: How do we obtain these production credentials? Is there an onboarding process?

---

### **2. Sandbox/Test Environment**
We need a test environment to complete integration testing before production deployment.

**Questions**:
1. Is there a sandbox/test environment available for integration testing?
2. How do we obtain test credentials?
3. Can you provide test QR codes for testing?
4. Are there test merchants we can use for testing?

---

### **3. Webhook Configuration**
We need to implement webhook handling for payment status updates and confirmations.

**Questions**:
1. What webhook events does Zapper send? (e.g., `payment.completed`, `payment.failed`, `payment.refunded`)
2. What webhook URL should we provide to Zapper?
3. How do we verify webhook signatures? What is the verification method?
4. Does Zapper retry failed webhook deliveries? What is the retry policy?
5. How do we handle duplicate webhook deliveries? Is there an idempotency key?

**Required Information**:
- Webhook event types and payload structure
- Webhook signature verification method
- Webhook retry policy
- Idempotency handling

---

### **4. Float Account Setup**
We need to set up and configure a float account for Zapper payments.

**Questions**:
1. How do we set up a float account with Zapper?
2. What is the minimum required float account balance?
3. How do we check float account balance? Is there an API endpoint?
4. How do we top up the float account? What is the process?
5. How does settlement work? (Real-time, daily, weekly?)
6. How do we reconcile settlements? Is there a reconciliation API or report?

**Required Information**:
- Float account setup process
- Minimum balance requirements
- Top-up process and API endpoints
- Settlement schedule and process
- Reconciliation process

---

### **5. Transaction Fee Structure**
We need to understand the exact transaction fee structure to implement accurate fee calculation.

**Questions**:
1. What is the exact transaction fee structure?
   - Fixed fee per transaction?
   - Percentage of transaction amount?
   - Tiered based on transaction volume?
2. Who pays the transaction fees?
   - Customer pays?
   - Merchant pays?
   - Split between customer and merchant?
3. What is the VAT rate on transaction fees?
4. How are fees calculated? (e.g., Transaction amount × fee percentage + fixed fee)
5. Are there volume-based fee discounts? If yes, what are the tiers?

**Current Implementation**: We have a hardcoded R3.00 transaction fee. We need the actual fee structure to update our implementation.

---

## 📱 **QR CODE & PAYMENT PROCESSING**

### **QR Code Processing**

**Questions**:
1. What is the exact format of Zapper QR codes? Can you provide examples?
2. Does the `/v1/codes/decode` endpoint work for all Zapper QR codes?
3. Is there a validation endpoint to verify QR codes before processing?
4. How do we identify merchants from QR codes?
5. Do QR codes expire? What is the expiry time?

### **Payment Processing Flow**

**Questions**:
1. What is the exact payment processing flow? Is it:
   - Decode QR → Validate → Process Payment → Webhook Confirmation?
2. What are all possible payment statuses?
3. What is the payment timeout period?
4. Can payments be cancelled? How?
5. How are refunds processed? Is there a refund API?

**Current Implementation**: We have implemented the following flow:
- QR code scanning and decoding
- Merchant validation
- Wallet balance validation
- Payment initiation and confirmation
- Transaction record creation

---

## 🏪 **MERCHANT INFORMATION**

**Questions**:
1. How do we get a list of supported merchants? Is there an API endpoint?
2. Is there an API to validate merchant IDs?
3. How are merchants categorized?
4. Can we get merchant location data?

**Current Implementation**: We have hardcoded a list of 6 merchants (Woolworths, Checkers, Steers, Ocean Basket, Pick n Pay, SPAR). We need to know if this list should be dynamic or if we should use a different approach.

---

## ⚠️ **ERROR HANDLING & RETRY LOGIC**

**Questions**:
1. What are all possible error codes from Zapper API?
2. What are the standard error message formats?
3. Which errors should we retry? Which should we not retry?
4. How should we handle API timeouts?
5. Is there a recommended circuit breaker pattern?

**Required Information**:
- Complete error code reference
- Error message format documentation
- Retry policy recommendations
- Timeout handling guidelines

---

## 📊 **API PERFORMANCE & LIMITS**

**Questions**:
1. What are the API rate limits for production?
2. What is the expected API response time?
3. Are there any restrictions on load testing?
4. What is the recommended timeout for API calls?

**Current Implementation**: We have implemented:
- Token-based authentication with 14-minute expiry
- Automatic token refresh
- Basic error handling with fallback to local processing

---

## 🔒 **SECURITY & COMPLIANCE**

**Questions**:
1. Is Zapper PCI DSS compliant?
2. What encryption standards does Zapper use?
3. How should we handle PII (Personally Identifiable Information)?
4. What audit logging requirements are there?
5. What regulatory compliance requirements are there?

**Current Implementation**: We have implemented:
- TLS 1.3 encryption for all API calls
- Secure credential storage (environment variables)
- Token-based authentication
- Input validation and sanitization

---

## 📚 **DOCUMENTATION & SUPPORT**

**Questions**:
1. Is there updated API documentation we should reference?
2. Is there a step-by-step integration guide?
3. What is the support channel for integration issues?
4. What is the expected response time for support requests?
5. Is there a status page for API availability?

**Current Documentation**: We have reviewed:
- Zapper API Documentation 20250909.docx
- Postman collection: MyMoolah.postman_collection (2).json
- QR code examples: qr_code_examples (2).docx

**Question**: Are there any updates to this documentation we should be aware of?

---

## 🎯 **INTEGRATION ARCHITECTURE**

### **Current Implementation**

**Backend Services**:
- `ZapperService` - Handles all Zapper API calls
- `QRPaymentController` - Handles QR payment processing
- Authentication: Service account login with identity token
- Token Management: Automatic token refresh (14-minute expiry)

**API Endpoints Used**:
- `POST /v1/auth/service/login` - Authentication
- `POST /v1/codes/decode` - QR code decoding
- `POST /v1/merchants/{merchantId}/validate-wallet` - Wallet validation
- `POST /v1/merchants/{merchantId}/process-payment` - Payment processing
- `GET /v1/payment/status/{paymentId}` - Payment status
- `GET /v1/health` - Health check

**Frontend**:
- QR code scanning (camera and upload)
- Real-time QR code detection
- Payment initiation and confirmation
- Error handling and user feedback

**Database**:
- Transaction records with Zapper metadata
- Transaction types: `zapper_payment`, `zapper_fee`, `zapper_float_credit`
- Transaction filtering for internal accounting

### **Missing Components**

1. **Webhook Endpoint**: Need to implement webhook handling
2. **Float Account Management**: Need float account setup and monitoring
3. **Transaction Fee Calculation**: Need actual fee structure
4. **Production Credentials**: Need production API credentials
5. **Error Handling**: Need complete error code reference

---

## 📅 **PROPOSED TIMELINE**

**Week 1**: Preparation
- Obtain production credentials
- Set up float account
- Configure test environment

**Week 2**: Webhook Implementation
- Implement webhook endpoint
- Handle webhook events
- Test webhook delivery

**Week 3**: Fee Configuration & Error Handling
- Configure transaction fees
- Implement retry logic
- Enhance error handling

**Week 4**: Testing & Monitoring
- Integration testing
- End-to-end testing
- Monitoring setup

**Week 5**: Production Deployment
- Final testing
- Production deployment
- Post-deployment monitoring

**Target Go-Live**: 5 weeks from receiving required information and credentials

---

## 📞 **CONTACT INFORMATION**

**MyMoolah Treasury Platform Development Team**

**Primary Contact**:  
- **Name**: Development Team Lead
- **Email**: [To be provided]
- **Phone**: [To be provided]

**Technical Questions**:  
- **Email**: [To be provided]
- **Response Time**: Within 24 hours

**Integration Status**:  
- **Repository**: [GitHub repository URL]
- **Documentation**: Available upon request

---

## ✅ **NEXT STEPS**

1. **Zapper Team**: Please provide answers to the questions above
2. **Zapper Team**: Please provide production credentials (or onboarding process)
3. **Zapper Team**: Please provide webhook documentation and configuration
4. **Zapper Team**: Please provide float account setup process
5. **MyMoolah Team**: Will implement webhook handling upon receiving documentation
6. **MyMoolah Team**: Will configure transaction fees upon receiving fee structure
7. **MyMoolah Team**: Will complete testing and deploy to production

---

## 📎 **ATTACHMENTS**

1. **Integration Status Report**: Comprehensive analysis of current implementation
2. **API Integration Code**: Code snippets showing current implementation
3. **Postman Collection**: Our current API test collection

**Available Upon Request**:
- Complete integration code
- Database schema
- Frontend implementation
- Test scenarios

---

## 🎯 **SUCCESS CRITERIA**

**Technical Requirements**:
- ✅ API connectivity: 99.9% uptime
- ✅ Payment success rate: > 95%
- ✅ API response time: < 2 seconds (p95)
- ✅ Webhook delivery: > 99% success rate
- ✅ Float account balance: Always above minimum threshold

**Business Requirements**:
- ✅ Real transactions processing at merchant locations
- ✅ Zero payment failures due to integration issues
- ✅ Accurate transaction fee calculation
- ✅ Proper settlement reconciliation
- ✅ User satisfaction with QR payment experience

---

**Thank you for your support in completing this integration. We look forward to enabling Zapper QR code payments for MyMoolah users.**

---

**Status**: ⚠️ **AWAITING ZAPPER TEAM RESPONSE**  
**Priority**: **HIGH** - Production deployment blocked pending information


