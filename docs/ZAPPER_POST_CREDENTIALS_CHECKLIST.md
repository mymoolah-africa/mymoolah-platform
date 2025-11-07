# Zapper Integration - Post-Credentials Checklist

**Date**: November 6, 2025  
**Status**: ⚠️ **AWAITING PRODUCTION CREDENTIALS**  
**Purpose**: Action items required after receiving Zapper production credentials

---

## 🎯 **OVERVIEW**

Once we receive production credentials from Zapper, we still need to complete the following tasks to make the integration production-ready. This checklist provides a clear, actionable list of all remaining work.

**Estimated Time**: 4-5 weeks after receiving credentials

---

## ✅ **IMMEDIATE TASKS (Week 1)**

### **1. Configure Production Credentials** ⏱️ 2 hours

- [ ] **Add credentials to production environment**
  ```bash
  ZAPPER_API_URL=<production_url>  # Confirm with Zapper team
  ZAPPER_ORG_ID=<org_id>
  ZAPPER_API_TOKEN=<api_token>
  ZAPPER_X_API_KEY=<x_api_key>
  ```

- [ ] **Test API connectivity**
  - [ ] Test authentication endpoint
  - [ ] Verify identity token generation
  - [ ] Test token expiry and refresh
  - [ ] Verify API response times

- [ ] **Update environment configuration**
  - [ ] Update `.env` files (local, Codespaces, production)
  - [ ] Update environment variable documentation
  - [ ] Verify credentials are not committed to git

**Files to Update**:
- `.env` (production)
- `env.template` (if needed)
- `config/security.js` (if credential validation needed)

---

### **2. Test Production API Endpoints** ⏱️ 4 hours

- [ ] **Test QR Code Decoding**
  - [ ] Test `/v1/codes/decode` endpoint
  - [ ] Verify QR code format handling
  - [ ] Test with real Zapper QR codes (if available)
  - [ ] Verify error handling for invalid QR codes

- [ ] **Test Payment Processing**
  - [ ] Test `/v1/merchants/{merchantId}/validate-wallet`
  - [ ] Test `/v1/merchants/{merchantId}/process-payment`
  - [ ] Verify payment status endpoint
  - [ ] Test payment flow end-to-end

- [ ] **Test Error Scenarios**
  - [ ] Test with invalid credentials
  - [ ] Test with insufficient balance
  - [ ] Test with invalid merchant ID
  - [ ] Test API timeout scenarios

**Files to Update**:
- `services/zapperService.js` (if API changes needed)
- `controllers/qrPaymentController.js` (if flow changes needed)

---

### **3. Float Account Setup** ⏱️ 6 hours

- [ ] **Obtain Float Account Information from Zapper**
  - [ ] Float account ID/number
  - [ ] Minimum balance requirement
  - [ ] Top-up process details
  - [ ] Settlement schedule

- [ ] **Create Float Account Record in Database**
  ```sql
  INSERT INTO supplier_floats (
    supplier_id, supplier_name, float_account_number,
    current_balance, minimum_balance, settlement_period
  ) VALUES (
    'ZAPPER', 'Zapper', '<float_account_id>',
    0.00, <minimum_balance>, 'real_time'
  );
  ```

- [ ] **Implement Float Account Monitoring**
  - [ ] Create balance check endpoint
  - [ ] Set up low balance alerts
  - [ ] Create balance monitoring dashboard
  - [ ] Configure alert thresholds

- [ ] **Implement Float Account Top-up Process**
  - [ ] Create top-up API endpoint (if needed)
  - [ ] Implement top-up workflow
  - [ ] Add top-up transaction logging
  - [ ] Test top-up process

**Files to Create/Update**:
- `models/SupplierFloat.js` (verify Zapper record exists)
- `controllers/floatController.js` (if not exists)
- `services/floatMonitoringService.js` (new)
- Database migration (if schema changes needed)

---

## 🔔 **WEBHOOK IMPLEMENTATION (Week 2)**

### **4. Create Webhook Endpoint** ⏱️ 8 hours

- [ ] **Create Webhook Route**
  ```javascript
  POST /api/v1/zapper/webhooks
  ```

- [ ] **Implement Webhook Signature Verification**
  - [ ] Get webhook secret from Zapper
  - [ ] Implement signature verification algorithm
  - [ ] Add signature validation middleware
  - [ ] Test signature verification

- [ ] **Implement Idempotency**
  - [ ] Create idempotency key storage
  - [ ] Check for duplicate webhook deliveries
  - [ ] Handle duplicate webhook gracefully
  - [ ] Test idempotency handling

- [ ] **Add Webhook Logging**
  - [ ] Log all webhook requests
  - [ ] Log webhook processing results
  - [ ] Add webhook error logging
  - [ ] Create webhook monitoring dashboard

**Files to Create**:
- `routes/zapperWebhooks.js` (new)
- `controllers/zapperWebhookController.js` (new)
- `middleware/webhookSignatureVerification.js` (new)
- `services/webhookIdempotencyService.js` (new)

---

### **5. Implement Webhook Event Handlers** ⏱️ 12 hours

- [ ] **Handle `payment.completed` Event**
  - [ ] Update transaction status to 'completed'
  - [ ] Update wallet balance
  - [ ] Create transaction records
  - [ ] Send confirmation notification
  - [ ] Test event handling

- [ ] **Handle `payment.failed` Event**
  - [ ] Update transaction status to 'failed'
  - [ ] Revert wallet balance (if needed)
  - [ ] Log failure reason
  - [ ] Send failure notification
  - [ ] Test event handling

- [ ] **Handle `payment.refunded` Event**
  - [ ] Update transaction status to 'refunded'
  - [ ] Credit wallet balance
  - [ ] Create refund transaction record
  - [ ] Send refund notification
  - [ ] Test event handling

- [ ] **Handle `payment.pending` Event**
  - [ ] Update transaction status to 'pending'
  - [ ] Log pending reason
  - [ ] Set up status polling (if needed)
  - [ ] Test event handling

- [ ] **Handle `settlement.completed` Event**
  - [ ] Update float account balance
  - [ ] Create settlement record
  - [ ] Reconcile transactions
  - [ ] Send settlement notification
  - [ ] Test event handling

**Files to Update**:
- `controllers/zapperWebhookController.js` (add event handlers)
- `services/transactionService.js` (if needed)
- `services/notificationService.js` (if needed)

---

### **6. Test Webhook Integration** ⏱️ 4 hours

- [ ] **Test Webhook Delivery**
  - [ ] Configure webhook URL with Zapper
  - [ ] Test webhook delivery from Zapper
  - [ ] Verify webhook signature
  - [ ] Test webhook retry mechanism

- [ ] **Test Event Processing**
  - [ ] Test each webhook event type
  - [ ] Verify transaction updates
  - [ ] Verify wallet balance updates
  - [ ] Test error scenarios

- [ ] **Test Idempotency**
  - [ ] Send duplicate webhook
  - [ ] Verify idempotency handling
  - [ ] Verify no duplicate processing

**Files to Create**:
- `tests/webhookTests.js` (new)
- `scripts/testWebhookDelivery.js` (new)

---

## 💰 **TRANSACTION FEE CONFIGURATION (Week 2-3)**

### **7. Implement Transaction Fee Structure** ⏱️ 8 hours

- [ ] **Get Fee Structure from Zapper**
  - [ ] Confirm fee calculation method
  - [ ] Get fee rates (fixed or percentage)
  - [ ] Get VAT rate on fees
  - [ ] Get volume discount tiers (if any)

- [ ] **Update Fee Calculation Logic**
  - [ ] Remove hardcoded R3.00 fee
  - [ ] Implement actual fee calculation
  - [ ] Add VAT calculation
  - [ ] Add volume discount logic (if applicable)
  - [ ] Test fee calculation

- [ ] **Update Transaction Creation**
  - [ ] Create `zapper_payment` transaction
  - [ ] Create `zapper_fee` transaction
  - [ ] Create `vat_payable` transaction (internal)
  - [ ] Create `mymoolah_revenue` transaction (internal)
  - [ ] Verify transaction amounts

- [ ] **Update Wallet Balance Calculation**
  - [ ] Verify fee deduction from wallet
  - [ ] Verify payment amount deduction
  - [ ] Verify total deduction (payment + fee)
  - [ ] Test balance calculations

**Files to Update**:
- `controllers/qrPaymentController.js` (fee calculation)
- `services/transactionService.js` (if needed)
- `models/Transaction.js` (verify transaction types)
- `scripts/reconcile-wallet-transactions.js` (if needed)

---

### **8. Configure Fee Rates in Database** ⏱️ 2 hours

- [ ] **Add Zapper Supplier Record** (if not exists)
  ```sql
  INSERT INTO suppliers (
    code, name, type, is_active
  ) VALUES (
    'ZAPPER', 'Zapper', 'payment_processor', true
  );
  ```

- [ ] **Add Fee Configuration**
  ```sql
  INSERT INTO supplier_pricing (
    supplier_code, service_type, fee_type, fee_amount, fee_percentage
  ) VALUES (
    'ZAPPER', 'qr_payment', 'fixed', <fee_amount>, <fee_percentage>
  );
  ```

- [ ] **Add VAT Configuration**
  ```sql
  INSERT INTO supplier_pricing (
    supplier_code, service_type, vat_rate
  ) VALUES (
    'ZAPPER', 'qr_payment', <vat_rate>
  );
  ```

**Files to Create/Update**:
- Database migration (if needed)
- `services/supplierPricingService.js` (if needed)

---

## 🔄 **ERROR HANDLING & RETRY LOGIC (Week 3)**

### **9. Implement Retry Logic** ⏱️ 6 hours

- [ ] **Get Error Code Reference from Zapper**
  - [ ] Get complete error code list
  - [ ] Identify retryable errors
  - [ ] Identify non-retryable errors
  - [ ] Get retry policy recommendations

- [ ] **Implement Exponential Backoff**
  - [ ] Create retry service
  - [ ] Implement exponential backoff algorithm
  - [ ] Configure max retry attempts
  - [ ] Add retry logging
  - [ ] Test retry logic

- [ ] **Update API Calls with Retry**
  - [ ] Add retry to authentication calls
  - [ ] Add retry to QR decode calls
  - [ ] Add retry to payment processing calls
  - [ ] Add retry to status check calls
  - [ ] Test retry scenarios

**Files to Create**:
- `services/retryService.js` (new)
- `utils/exponentialBackoff.js` (new)

**Files to Update**:
- `services/zapperService.js` (add retry logic)

---

### **10. Implement Circuit Breaker** ⏱️ 4 hours

- [ ] **Create Circuit Breaker Service**
  - [ ] Implement circuit breaker pattern
  - [ ] Configure failure thresholds
  - [ ] Configure timeout periods
  - [ ] Add circuit breaker state monitoring
  - [ ] Test circuit breaker

- [ ] **Integrate Circuit Breaker**
  - [ ] Add circuit breaker to Zapper API calls
  - [ ] Handle circuit breaker states (open, half-open, closed)
  - [ ] Add fallback logic when circuit is open
  - [ ] Test circuit breaker scenarios

**Files to Create**:
- `services/circuitBreakerService.js` (new)

**Files to Update**:
- `services/zapperService.js` (add circuit breaker)

---

### **11. Enhance Error Handling** ⏱️ 4 hours

- [ ] **Update Error Messages**
  - [ ] Create user-friendly error messages
  - [ ] Map Zapper error codes to user messages
  - [ ] Add error context and details
  - [ ] Test error message display

- [ ] **Implement Transaction Rollback**
  - [ ] Create rollback logic for failed payments
  - [ ] Revert wallet balance on failure
  - [ ] Update transaction status
  - [ ] Log rollback actions
  - [ ] Test rollback scenarios

- [ ] **Add Error Logging**
  - [ ] Enhance error logging
  - [ ] Add error context
  - [ ] Add error tracking
  - [ ] Create error monitoring dashboard

**Files to Update**:
- `controllers/qrPaymentController.js` (error handling)
- `services/zapperService.js` (error handling)
- `utils/errorMessages.js` (if exists, or create new)

---

## 📊 **MONITORING & ALERTING (Week 4)**

### **12. Set Up API Monitoring** ⏱️ 6 hours

- [ ] **Implement Response Time Monitoring**
  - [ ] Track API response times (p50, p95, p99)
  - [ ] Log slow API calls
  - [ ] Create response time dashboard
  - [ ] Set up response time alerts

- [ ] **Implement Error Rate Monitoring**
  - [ ] Track API error rates
  - [ ] Categorize errors by type
  - [ ] Create error rate dashboard
  - [ ] Set up error rate alerts

- [ ] **Implement Success Rate Monitoring**
  - [ ] Track payment success rates
  - [ ] Track API call success rates
  - [ ] Create success rate dashboard
  - [ ] Set up success rate alerts

**Files to Create**:
- `services/monitoringService.js` (new)
- `middleware/apiMonitoring.js` (new)

**Files to Update**:
- `services/zapperService.js` (add monitoring)

---

### **13. Set Up Float Account Monitoring** ⏱️ 4 hours

- [ ] **Implement Balance Monitoring**
  - [ ] Track float account balance
  - [ ] Monitor balance changes
  - [ ] Create balance dashboard
  - [ ] Set up low balance alerts

- [ ] **Implement Top-up Alerts**
  - [ ] Alert when balance below minimum
  - [ ] Alert when top-up needed
  - [ ] Alert when top-up completed
  - [ ] Test alert delivery

**Files to Create/Update**:
- `services/floatMonitoringService.js` (enhance)
- `services/alertService.js` (if not exists)

---

### **14. Set Up Webhook Monitoring** ⏱️ 4 hours

- [ ] **Implement Webhook Delivery Monitoring**
  - [ ] Track webhook delivery success rate
  - [ ] Track webhook processing time
  - [ ] Track webhook failures
  - [ ] Create webhook dashboard

- [ ] **Set Up Webhook Alerts**
  - [ ] Alert on webhook delivery failures
  - [ ] Alert on webhook processing errors
  - [ ] Alert on duplicate webhook deliveries
  - [ ] Test alert delivery

**Files to Update**:
- `controllers/zapperWebhookController.js` (add monitoring)
- `services/monitoringService.js` (add webhook monitoring)

---

## 🧪 **TESTING (Week 4-5)**

### **15. Create Integration Test Suite** ⏱️ 8 hours

- [ ] **Test QR Code Decoding**
  - [ ] Test with valid Zapper QR codes
  - [ ] Test with invalid QR codes
  - [ ] Test with expired QR codes
  - [ ] Test error handling

- [ ] **Test Payment Processing**
  - [ ] Test successful payment flow
  - [ ] Test payment with insufficient balance
  - [ ] Test payment with invalid merchant
  - [ ] Test payment timeout scenarios

- [ ] **Test Webhook Handling**
  - [ ] Test all webhook event types
  - [ ] Test webhook signature verification
  - [ ] Test webhook idempotency
  - [ ] Test webhook error handling

- [ ] **Test Error Scenarios**
  - [ ] Test API failures
  - [ ] Test network timeouts
  - [ ] Test invalid credentials
  - [ ] Test circuit breaker

**Files to Create**:
- `tests/integration/zapperIntegration.test.js` (new)
- `tests/integration/zapperWebhooks.test.js` (new)

---

### **16. End-to-End Testing** ⏱️ 8 hours

- [ ] **Test Complete Payment Flow**
  - [ ] Scan QR code
  - [ ] Validate merchant
  - [ ] Process payment
  - [ ] Receive webhook confirmation
  - [ ] Verify transaction records
  - [ ] Verify wallet balance

- [ ] **Test Error Recovery**
  - [ ] Test payment failure recovery
  - [ ] Test webhook retry handling
  - [ ] Test transaction rollback
  - [ ] Test circuit breaker recovery

- [ ] **Test High-Volume Scenarios**
  - [ ] Test multiple concurrent payments
  - [ ] Test rapid payment processing
  - [ ] Test system performance under load
  - [ ] Verify no duplicate transactions

**Files to Create**:
- `tests/e2e/zapperPaymentFlow.test.js` (new)
- `scripts/loadTestZapper.js` (new)

---

### **17. Load Testing** ⏱️ 4 hours

- [ ] **Set Up Load Testing**
  - [ ] Create load test scenarios
  - [ ] Configure load test parameters
  - [ ] Set up load test environment
  - [ ] Run load tests

- [ ] **Analyze Results**
  - [ ] Analyze API performance
  - [ ] Identify bottlenecks
  - [ ] Optimize slow endpoints
  - [ ] Verify system stability

**Files to Create**:
- `scripts/loadTestZapper.js` (new)
- `tests/load/zapperLoadTest.js` (new)

---

## 🚀 **PRODUCTION DEPLOYMENT (Week 5)**

### **18. Pre-Deployment Checklist** ⏱️ 4 hours

- [ ] **Code Review**
  - [ ] Review all Zapper-related code
  - [ ] Verify error handling
  - [ ] Verify security measures
  - [ ] Verify logging and monitoring

- [ ] **Documentation**
  - [ ] Update API documentation
  - [ ] Update integration guide
  - [ ] Update troubleshooting guide
  - [ ] Update deployment guide

- [ ] **Configuration**
  - [ ] Verify production environment variables
  - [ ] Verify database migrations
  - [ ] Verify float account configuration
  - [ ] Verify webhook URL configuration

- [ ] **Monitoring Setup**
  - [ ] Verify monitoring dashboards
  - [ ] Verify alerting configuration
  - [ ] Test alert delivery
  - [ ] Verify log aggregation

**Files to Update**:
- `docs/API_DOCUMENTATION.md`
- `docs/DEVELOPMENT_GUIDE.md`
- `docs/DEPLOYMENT_GUIDE.md`

---

### **19. Production Deployment** ⏱️ 4 hours

- [ ] **Deploy to Production**
  - [ ] Deploy backend code
  - [ ] Deploy frontend code
  - [ ] Run database migrations
  - [ ] Verify deployment success

- [ ] **Verify Production Setup**
  - [ ] Test API connectivity
  - [ ] Test authentication
  - [ ] Test QR code decoding
  - [ ] Test payment processing

- [ ] **Configure Webhooks**
  - [ ] Register webhook URL with Zapper
  - [ ] Test webhook delivery
  - [ ] Verify webhook signature
  - [ ] Test webhook processing

**Files to Verify**:
- Production `.env` file
- Database configuration
- Webhook URL configuration

---

### **20. Post-Deployment Monitoring** ⏱️ Ongoing

- [ ] **Monitor Initial Transactions**
  - [ ] Monitor first 24 hours of transactions
  - [ ] Track payment success rate
  - [ ] Track API performance
  - [ ] Track error rates

- [ ] **Monitor Float Account**
  - [ ] Monitor float account balance
  - [ ] Verify top-up process
  - [ ] Verify settlement process
  - [ ] Monitor balance trends

- [ ] **Monitor Webhooks**
  - [ ] Monitor webhook delivery
  - [ ] Monitor webhook processing
  - [ ] Track webhook failures
  - [ ] Verify webhook idempotency

- [ ] **Address Issues**
  - [ ] Respond to alerts immediately
  - [ ] Fix any issues found
  - [ ] Update documentation
  - [ ] Communicate with team

---

## 📋 **SUMMARY CHECKLIST**

### **Critical Path Items** (Must Complete)
1. ✅ Configure production credentials
2. ✅ Test production API endpoints
3. ✅ Set up float account
4. ✅ Implement webhook endpoint
5. ✅ Implement webhook event handlers
6. ✅ Configure transaction fees
7. ✅ Implement retry logic
8. ✅ Set up monitoring
9. ✅ Complete testing
10. ✅ Deploy to production

### **Estimated Timeline**
- **Week 1**: Credentials, API testing, Float account (12 hours)
- **Week 2**: Webhooks, Fee configuration (20 hours)
- **Week 3**: Error handling, Retry logic (14 hours)
- **Week 4**: Monitoring, Testing (20 hours)
- **Week 5**: Deployment, Post-deployment (12 hours)

**Total Estimated Time**: ~78 hours (approximately 2 weeks of full-time work, or 4-5 weeks part-time)

---

## 🎯 **SUCCESS CRITERIA**

Before going live, verify:
- ✅ All API endpoints working with production credentials
- ✅ Webhook endpoint receiving and processing events
- ✅ Float account configured and monitored
- ✅ Transaction fees calculated correctly
- ✅ Error handling and retry logic working
- ✅ Monitoring and alerting active
- ✅ All tests passing
- ✅ Documentation complete

---

**Status**: ⚠️ **READY TO START UPON RECEIVING CREDENTIALS**  
**Next Step**: Wait for Zapper production credentials, then begin Week 1 tasks


