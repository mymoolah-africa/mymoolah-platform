# MyMoolah Platform - Testing Guide

## 🎉 **CURRENT STATUS: DASHBOARD TESTING COMPLETE - ALL SYSTEMS WORKING**

**Last Updated:** July 29, 2025  
**Test Environment:** Development (SQLite)  
**Production Environment:** MySQL (Future)

---

## **OVERVIEW**

This guide covers comprehensive testing procedures for the MyMoolah platform, including backend API testing, database testing, integration testing, and frontend integration testing. All backend endpoints have been tested and are fully functional.

### **Dashboard Integration Status (NEW - JULY 29, 2025)**
- ✅ **Real Data Integration:** Dashboard fetches live data from SQLite database
- ✅ **API Endpoints Working:** All wallet balance, transactions, and vouchers endpoints functional
- ✅ **Contextual Icons:** Smart icon selection based on transaction descriptions
- ✅ **Clean Console:** Production-ready output with no errors or warnings
- ✅ **Transaction Limit:** Shows last 5 transactions as required

### **Testing Philosophy**
- **Real API Calls:** Never use hardcoded data in frontend
- **Database Seeding:** Use realistic dummy data for testing
- **End-to-End Testing:** Test complete user flows
- **Error Handling:** Test all error scenarios
- **Performance Testing:** Monitor response times and throughput

---

## **DASHBOARD TESTING (NEW - JULY 29, 2025)**

### ✅ **Dashboard Page Testing**

#### **Real Data Integration Testing**
```bash
# Test wallet balance endpoint
curl -X GET http://localhost:3001/api/v1/wallets/balance \
  -H "Authorization: Bearer <your_jwt_token>"
# Expected: Real balance data from database
# Response: {"success": true, "data": {"available": 5204.50, "pending": 0, "total": 5204.50}}

# Test recent transactions endpoint
curl -X GET "http://localhost:3001/api/v1/wallets/transactions?limit=5" \
  -H "Authorization: Bearer <your_jwt_token>"
# Expected: Last 5 transactions with real data
# Response: {"success": true, "data": {"transactions": [...]}}

# Test active vouchers endpoint
curl -X GET http://localhost:3001/api/v1/vouchers/active \
  -H "Authorization: Bearer <your_jwt_token>"
# Expected: Active vouchers with count and value
# Response: {"success": true, "data": [...]}
```

#### **Frontend Dashboard Testing**
```bash
# Start frontend server
cd mymoolah-wallet-frontend
npm run dev

# Access dashboard at http://localhost:3002
# Login with Andre Botes credentials
# Verify dashboard displays:
# - Real wallet balance (R5204.50)
# - Last 5 transactions with contextual icons
# - Active vouchers count and value
# - Clean console with no errors
```

#### **Transaction Icon Testing**
```bash
# Verify contextual icons display correctly:
# - "Woolworths Sandton" → Shopping cart icon 🛒
# - "Vodacom Airtime" → Phone icon 📱
# - "Initial deposit" → Green arrow down ⬇️
# - "From Sarah M." → Green arrow down ⬇️
```

#### **Console Cleanup Testing**
```bash
# Verify clean console output:
# - No 404 errors for manifest.json or vite.svg
# - No React Router warnings
# - No debug console.log statements
# - Only expected React DevTools suggestion
```

#### **Database Integration Testing**
```bash
# Check Andre Botes transactions in database
sqlite3 data/mymoolah.db "SELECT t.type, t.description, t.amount, t.createdAt FROM transactions t JOIN wallets w ON t.walletId = w.walletId WHERE w.userId = (SELECT id FROM users WHERE firstName = 'Andre' AND lastName = 'Botes') ORDER BY t.createdAt DESC LIMIT 5;"

# Expected output:
# credit|Initial deposit|5000|2025-07-29 18:39:58
# debit|Woolworths Sandton|245.5|2025-07-29 17:40:08
# credit|From Sarah M.|500|2025-07-29 15:40:15
# debit|Vodacom Airtime|55|2025-07-28 18:40:26
```

---

## **BACKEND TESTING (COMPLETE)**

### ✅ **API Endpoint Testing**

#### **Health & System Endpoints**
```bash
# Test health endpoint
curl http://localhost:3001/health
# Expected: Server health status

# Test system endpoint
curl http://localhost:3001/test
# Expected: List of all available endpoints
```

#### **User Management Endpoints**
```bash
# Test users endpoint
curl http://localhost:3001/api/v1/users
# Expected: 5 demo users with complete data

# Test user registration
curl -X POST http://localhost:3001/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "firstName": "Test",
    "lastName": "User",
    "email": "test@example.com",
    "phoneNumber": "27821234567",
    "password": "Test123!"
  }'
# Expected: User account created with JWT token

# Test user login
curl -X POST http://localhost:3001/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "phoneNumber": "27821234567",
    "password": "Test123!"
  }'
# Expected: JWT token for authenticated requests
```

#### **Wallet Management Endpoints**
```bash
# Test wallets endpoint
curl http://localhost:3001/api/v1/wallets
# Expected: 5 demo wallets with realistic balances

# Test wallet balance (with auth token)
curl -X GET http://localhost:3001/api/v1/wallets/balance \
  -H "Authorization: Bearer <your_jwt_token>"
# Expected: Current wallet balance and details

# Test wallet credit (with auth token)
curl -X POST http://localhost:3001/api/v1/wallets/credit \
  -H "Authorization: Bearer <your_jwt_token>" \
  -H "Content-Type: application/json" \
  -d '{
    "amount": 1000,
    "description": "Bank deposit"
  }'
# Expected: Updated balance and transaction details
```

#### **Transaction Management Endpoints**
```bash
# Test transactions endpoint
curl http://localhost:3001/api/v1/transactions
# Expected: 7 demo transactions with different types

# Test transaction history (with auth token)
curl -X GET http://localhost:3001/api/v1/transactions/history \
  -H "Authorization: Bearer <your_jwt_token>"
# Expected: User's transaction history with pagination
```

#### **KYC Management Endpoints**
```bash
# Test KYC endpoint
curl http://localhost:3001/api/v1/kyc
# Expected: 5 demo KYC records with verification statuses

# Test KYC submission (with auth token)
curl -X POST http://localhost:3001/api/v1/kyc/submit \
  -H "Authorization: Bearer <your_jwt_token>" \
  -H "Content-Type: application/json" \
  -d '{
    "firstName": "John",
    "lastName": "Doe",
    "dateOfBirth": "1990-01-01",
    "nationality": "South African",
    "address": "123 Main Street, Johannesburg",
    "city": "Johannesburg",
    "postalCode": "2000"
  }'
# Expected: KYC submission confirmation
```

#### **Voucher Management Endpoints**
```bash
# Test vouchers endpoint
curl http://localhost:3001/api/v1/vouchers
# Expected: 6 demo vouchers with different types

# Test voucher redemption
curl -X POST http://localhost:3001/api/v1/vouchers/redeem \
  -H "Content-Type: application/json" \
  -d '{
    "voucherCode": "VOUCH20250729123456"
  }'
# Expected: Voucher redemption confirmation
```

### ✅ **Database Testing**

#### **Database Connection Test**
```bash
# Test database connection
sqlite3 data/mymoolah.db "SELECT COUNT(*) FROM users;"
# Expected: Number of users in database

# Test table structure
sqlite3 data/mymoolah.db "PRAGMA table_info(users);"
# Expected: Table structure information
```

#### **Migration Testing**
```bash
# Check migration status
cd /mymoolah && npx sequelize-cli db:migrate:status --env development
# Expected: All migrations marked as "up"

# Run migrations (if needed)
cd /mymoolah && npx sequelize-cli db:migrate --env development
# Expected: All tables created successfully

# Run seeders
cd /mymoolah && npx sequelize-cli db:seed:all --env development
# Expected: All dummy data inserted successfully
```

#### **Data Integrity Testing**
```bash
# Test user data integrity
sqlite3 data/mymoolah.db "SELECT COUNT(*) FROM users WHERE email IS NOT NULL;"
# Expected: All users have email addresses

# Test wallet data integrity
sqlite3 data/mymoolah.db "SELECT COUNT(*) FROM wallets WHERE balance >= 0;"
# Expected: All wallets have non-negative balances

# Test foreign key relationships
sqlite3 data/mymoolah.db "SELECT COUNT(*) FROM wallets w JOIN users u ON w.userId = u.id;"
# Expected: All wallets have valid user references
```

### ✅ **Authentication Testing**

#### **JWT Token Testing**
```bash
# Test token generation
curl -X POST http://localhost:3001/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "phoneNumber": "27821234567",
    "password": "Demo123!"
  }'
# Expected: Valid JWT token

# Test protected endpoint with token
curl -X GET http://localhost:3001/api/v1/wallets/balance \
  -H "Authorization: Bearer <your_jwt_token>"
# Expected: Wallet balance data

# Test protected endpoint without token
curl -X GET http://localhost:3001/api/v1/wallets/balance
# Expected: 401 Unauthorized error
```

#### **Password Security Testing**
```bash
# Test password validation
curl -X POST http://localhost:3001/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "firstName": "Test",
    "lastName": "User",
    "email": "test@example.com",
    "phoneNumber": "27821234567",
    "password": "weak"
  }'
# Expected: Password validation error

# Test strong password
curl -X POST http://localhost:3001/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "firstName": "Test",
    "lastName": "User",
    "email": "test@example.com",
    "phoneNumber": "27821234567",
    "password": "StrongPassword123!"
  }'
# Expected: User registration success
```

### ✅ **Error Handling Testing**

#### **Validation Error Testing**
```bash
# Test invalid email
curl -X POST http://localhost:3001/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "firstName": "Test",
    "lastName": "User",
    "email": "invalid-email",
    "phoneNumber": "27821234567",
    "password": "Test123!"
  }'
# Expected: Email validation error

# Test invalid phone number
curl -X POST http://localhost:3001/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "firstName": "Test",
    "lastName": "User",
    "email": "test@example.com",
    "phoneNumber": "123",
    "password": "Test123!"
  }'
# Expected: Phone number validation error
```

#### **Database Error Testing**
```bash
# Test duplicate email registration
curl -X POST http://localhost:3001/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "firstName": "Test",
    "lastName": "User",
    "email": "john.doe@mymoolah.com",
    "phoneNumber": "27821234567",
    "password": "Test123!"
  }'
# Expected: Duplicate email error
```

---

## **FRONTEND INTEGRATION TESTING (READY TO START)**

### 🔄 **Dashboard Integration Testing**

#### **User Data Integration**
```javascript
// Test user data fetching
const response = await fetch('/api/v1/users/me', {
  headers: {
    'Authorization': `Bearer ${token}`
  }
});
// Expected: User profile data

// Test wallet balance fetching
const balanceResponse = await fetch('/api/v1/wallets/balance', {
  headers: {
    'Authorization': `Bearer ${token}`
  }
});
// Expected: Current wallet balance
```

#### **Transaction Data Integration**
```javascript
// Test transaction history fetching
const transactionsResponse = await fetch('/api/v1/transactions', {
  headers: {
    'Authorization': `Bearer ${token}`
  }
});
// Expected: Recent transaction list

// Test transaction summary fetching
const summaryResponse = await fetch('/api/v1/transactions/summary', {
  headers: {
    'Authorization': `Bearer ${token}`
  }
});
// Expected: Transaction analytics
```

### 🔄 **Authentication Flow Testing**

#### **Login Flow Testing**
```javascript
// Test login form submission
const loginResponse = await fetch('/api/v1/auth/login', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    phoneNumber: '27821234567',
    password: 'Demo123!'
  })
});
// Expected: JWT token and user data

// Test login error handling
const invalidLoginResponse = await fetch('/api/v1/auth/login', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    phoneNumber: '27821234567',
    password: 'WrongPassword'
  })
});
// Expected: Authentication error
```

#### **Registration Flow Testing**
```javascript
// Test registration form submission
const registerResponse = await fetch('/api/v1/auth/register', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    firstName: 'Test',
    lastName: 'User',
    email: 'test@example.com',
    phoneNumber: '27821234567',
    password: 'Test123!'
  })
});
// Expected: User account created
```

### 🔄 **KYC Flow Testing**

#### **Document Upload Testing**
```javascript
// Test document upload
const formData = new FormData();
formData.append('documentType', 'identity');
formData.append('document', file);

const uploadResponse = await fetch('/api/v1/kyc/upload-document', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`
  },
  body: formData
});
// Expected: Document upload confirmation
```

#### **KYC Status Testing**
```javascript
// Test KYC status checking
const statusResponse = await fetch('/api/v1/kyc/status', {
  headers: {
    'Authorization': `Bearer ${token}`
  }
});
// Expected: Current KYC verification status
```

### 🔄 **Wallet Operations Testing**

#### **Balance Operations Testing**
```javascript
// Test wallet credit
const creditResponse = await fetch('/api/v1/wallets/credit', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    amount: 1000,
    description: 'Bank deposit'
  })
});
// Expected: Updated balance and transaction details

// Test wallet debit
const debitResponse = await fetch('/api/v1/wallets/debit', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    amount: 500,
    description: 'Payment for services'
  })
});
// Expected: Updated balance and transaction details
```

---

## **PERFORMANCE TESTING**

### 📊 **API Response Time Testing**

#### **Response Time Benchmarks**
```bash
# Test health endpoint response time
time curl http://localhost:3001/health
# Expected: < 50ms

# Test users endpoint response time
time curl http://localhost:3001/api/v1/users
# Expected: < 100ms

# Test wallets endpoint response time
time curl http://localhost:3001/api/v1/wallets
# Expected: < 100ms

# Test transactions endpoint response time
time curl http://localhost:3001/api/v1/transactions
# Expected: < 150ms
```

#### **Database Query Performance**
```bash
# Test database query performance
sqlite3 data/mymoolah.db "EXPLAIN QUERY PLAN SELECT * FROM users;"
# Expected: Efficient query plan

# Test indexed queries
sqlite3 data/mymoolah.db "EXPLAIN QUERY PLAN SELECT * FROM users WHERE email = 'john.doe@mymoolah.com';"
# Expected: Index usage
```

### 📊 **Load Testing**

#### **Concurrent Request Testing**
```bash
# Test concurrent API requests
for i in {1..10}; do
  curl http://localhost:3001/api/v1/users &
done
wait
# Expected: All requests complete successfully
```

#### **Database Connection Testing**
```bash
# Test database connection pool
for i in {1..20}; do
  sqlite3 data/mymoolah.db "SELECT COUNT(*) FROM users;" &
done
wait
# Expected: All queries complete successfully
```

---

## **SECURITY TESTING**

### 🔐 **Input Validation Testing**

#### **SQL Injection Testing**
```bash
# Test SQL injection prevention
curl -X POST http://localhost:3001/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "phoneNumber": "27821234567\"; DROP TABLE users; --",
    "password": "Test123!"
  }'
# Expected: Validation error, not SQL injection
```

#### **XSS Prevention Testing**
```bash
# Test XSS prevention
curl -X POST http://localhost:3001/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "firstName": "<script>alert(\"XSS\")</script>",
    "lastName": "User",
    "email": "test@example.com",
    "phoneNumber": "27821234567",
    "password": "Test123!"
  }'
# Expected: Input sanitization, not XSS execution
```

### 🔐 **Authentication Security Testing**

#### **Token Security Testing**
```bash
# Test invalid token
curl -X GET http://localhost:3001/api/v1/wallets/balance \
  -H "Authorization: Bearer invalid_token"
# Expected: 401 Unauthorized error

# Test expired token
curl -X GET http://localhost:3001/api/v1/wallets/balance \
  -H "Authorization: Bearer expired_token"
# Expected: 401 Unauthorized error
```

---

## **INTEGRATION TESTING**

### 🔗 **Payment Integration Testing**

#### **Flash Integration Testing**
```bash
# Test Flash payment processing
curl -X POST http://localhost:3001/api/v1/flash/process \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "amount": 1000,
    "recipientNumber": "27821234567",
    "description": "Payment via Flash"
  }'
# Expected: Flash payment confirmation
```

#### **MobileMart Integration Testing**
```bash
# Test MobileMart service purchase
curl -X POST http://localhost:3001/api/v1/mobilemart/purchase \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "serviceType": "airtime",
    "provider": "MTN",
    "amount": 50,
    "recipientNumber": "27821234567"
  }'
# Expected: MobileMart purchase confirmation
```

---

## **AUTOMATED TESTING**

### 🤖 **API Test Scripts**

#### **Backend API Test Script**
```bash
#!/bin/bash
# scripts/test-backend-api.sh

echo "🧪 Testing MyMoolah Backend API..."

# Test health endpoint
echo "Testing health endpoint..."
curl -s http://localhost:3001/health | jq '.'

# Test users endpoint
echo "Testing users endpoint..."
curl -s http://localhost:3001/api/v1/users | jq '.'

# Test wallets endpoint
echo "Testing wallets endpoint..."
curl -s http://localhost:3001/api/v1/wallets | jq '.'

# Test transactions endpoint
echo "Testing transactions endpoint..."
curl -s http://localhost:3001/api/v1/transactions | jq '.'

# Test KYC endpoint
echo "Testing KYC endpoint..."
curl -s http://localhost:3001/api/v1/kyc | jq '.'

# Test vouchers endpoint
echo "Testing vouchers endpoint..."
curl -s http://localhost:3001/api/v1/vouchers | jq '.'

echo "✅ Backend API testing complete!"
```

#### **Database Test Script**
```bash
#!/bin/bash
# scripts/test-database.sh

echo "🧪 Testing MyMoolah Database..."

# Test database connection
echo "Testing database connection..."
sqlite3 data/mymoolah.db "SELECT COUNT(*) as user_count FROM users;"

# Test table structure
echo "Testing table structure..."
sqlite3 data/mymoolah.db "PRAGMA table_info(users);"

# Test data integrity
echo "Testing data integrity..."
sqlite3 data/mymoolah.db "SELECT COUNT(*) as wallet_count FROM wallets WHERE balance >= 0;"

echo "✅ Database testing complete!"
```

---

## **TESTING CHECKLIST**

### ✅ **Backend Testing Checklist**
- [x] Health endpoint working
- [x] All API endpoints responding
- [x] Database migrations successful
- [x] Dummy data seeded correctly
- [x] Authentication working
- [x] Error handling working
- [x] Input validation working
- [x] Security measures working
- [x] Performance benchmarks met
- [x] Integration services working

### 🔄 **Frontend Integration Testing Checklist**
- [ ] Dashboard data integration
- [ ] Authentication flow integration
- [ ] KYC flow integration
- [ ] Wallet operations integration
- [ ] Error handling in frontend
- [ ] User experience validation
- [ ] Performance testing
- [ ] Cross-browser testing
- [ ] Mobile responsiveness testing

### 📋 **Production Testing Checklist**
- [ ] MySQL migration testing
- [ ] Environment configuration testing
- [ ] Security audit completion
- [ ] Load testing completion
- [ ] Performance optimization
- [ ] Monitoring setup
- [ ] Backup and recovery testing
- [ ] Disaster recovery testing

---

## **TESTING TOOLS**

### 🛠️ **Recommended Testing Tools**
- **API Testing:** curl, Postman, Insomnia
- **Database Testing:** sqlite3, MySQL Workbench
- **Performance Testing:** Apache Bench, Artillery
- **Security Testing:** OWASP ZAP, Burp Suite
- **Frontend Testing:** Jest, React Testing Library
- **E2E Testing:** Cypress, Playwright

### 📊 **Monitoring Tools**
- **Application Monitoring:** New Relic, DataDog
- **Database Monitoring:** MySQL Enterprise Monitor
- **Log Monitoring:** ELK Stack, Splunk
- **Error Tracking:** Sentry, Bugsnag

---

## **TESTING BEST PRACTICES**

### 📋 **General Testing Principles**
1. **Test Early and Often:** Test throughout development
2. **Automate Everything:** Automate repetitive tests
3. **Test Real Data:** Use realistic test data
4. **Test Error Scenarios:** Test all error conditions
5. **Performance Test:** Monitor response times
6. **Security Test:** Test all security measures
7. **Document Tests:** Document all test procedures
8. **Version Control:** Keep test scripts in version control

### 🔄 **Continuous Testing**
1. **Unit Tests:** Test individual functions
2. **Integration Tests:** Test component interactions
3. **API Tests:** Test all API endpoints
4. **Database Tests:** Test data integrity
5. **Security Tests:** Test security measures
6. **Performance Tests:** Test system performance
7. **User Acceptance Tests:** Test user workflows

---

**Last Updated:** July 29, 2025  
**Status:** Backend Testing Complete, Frontend Integration Ready  
**Next Update:** Frontend Integration Testing Results 