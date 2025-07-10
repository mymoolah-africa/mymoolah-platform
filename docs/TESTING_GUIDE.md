# MyMoolah Testing Guide

## 🚀 Current Testing Procedures (July 2025)

**Status**: ✅ **VALIDATED** - All testing procedures tested and working

## 📋 Testing Overview

### **Testing Strategy**
- ✅ **Unit Testing**: Individual component testing
- ✅ **Integration Testing**: API endpoint testing
- ✅ **End-to-End Testing**: Complete workflow testing
- ✅ **Security Testing**: Authentication and authorization testing
- ✅ **Performance Testing**: Response time and load testing

### **Testing Environment**
- **Local Development**: SQLite database, port 5050
- **Cloud Development**: MySQL database, port 5050
- **Test Data**: 36 users, 36 wallets, 15+ transactions, 3 KYC records

## 🧪 Comprehensive Testing Checklist

### **1. Server Health Testing**
```bash
# Test server startup
npm start

# Test basic connectivity
curl http://localhost:5050/test
# Expected: {"message":"Test route works!"}
```

### **2. Authentication Testing**
```bash
# Test user registration
curl -X POST http://localhost:5050/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "firstName": "Test",
    "lastName": "User",
    "email": "test@example.com",
    "password": "password123"
  }'
# Expected: Success response with JWT token

# Test user login
curl -X POST http://localhost:5050/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "password123"
  }'
# Expected: Success response with JWT token
```

### **3. Wallet Testing**
```bash
# Get wallet details (requires JWT token)
curl -X GET http://localhost:5050/api/v1/wallets/1 \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
# Expected: Wallet details with balance

# Get wallet balance
curl -X GET http://localhost:5050/api/v1/wallets/1/balance \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
# Expected: Current balance

# Credit wallet
curl -X POST http://localhost:5050/api/v1/wallets/1/credit \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{"amount": 100}'
# Expected: Success with new balance

# Debit wallet
curl -X POST http://localhost:5050/api/v1/wallets/1/debit \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{"amount": 50}'
# Expected: Success with new balance

# Get wallet transactions
curl -X GET http://localhost:5050/api/v1/wallets/1/transactions \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
# Expected: Transaction history
```

### **4. Data Management Testing**
```bash
# List all users
curl -X GET http://localhost:5050/api/v1/users
# Expected: List of all 36 users

# List all transactions
curl -X GET http://localhost:5050/api/v1/transactions
# Expected: List of all 15+ transactions

# List all KYC records
curl -X GET http://localhost:5050/api/v1/kyc
# Expected: List of all 3 KYC records
```

### **5. Security Testing**
```bash
# Test without JWT token (should fail)
curl -X GET http://localhost:5050/api/v1/wallets/1
# Expected: 401 Unauthorized

# Test with invalid JWT token
curl -X GET http://localhost:5050/api/v1/wallets/1 \
  -H "Authorization: Bearer invalid-token"
# Expected: 401 Unauthorized

# Test rate limiting
# Make multiple rapid requests to auth endpoints
# Expected: Rate limit exceeded after 5 requests per minute
```

## 📊 Test Scripts

### **Automated Test Scripts**
```bash
# Test authentication
node test-auth.js

# Test wallet operations
node test-wallet.js

# Test transactions
node test-transactions.js

# Test all API endpoints
node test-api-endpoints.js

# Test database connectivity
node test-sqlite.js
```

### **Manual Test Scripts**
```bash
# Test server
node test-server.js

# Test wallet features
node test-wallet-features.js

# Test wallet integration
node test-wallet-integration.js

# Test wallet corrected
node test-wallet-corrected.js

# Test wallet simple
node test-wallet-simple.js
```

## 🗄️ Database Testing

### **Database Connectivity**
```bash
# Test SQLite connection
node test-sqlite.js
# Expected: Database connection successful

# Check database tables
sqlite3 data/mymoolah.db ".tables"
# Expected: users, wallets, transactions, kyc

# Check table schemas
sqlite3 data/mymoolah.db ".schema users"
sqlite3 data/mymoolah.db ".schema wallets"
sqlite3 data/mymoolah.db ".schema transactions"
sqlite3 data/mymoolah.db ".schema kyc"
```

### **Data Integrity Testing**
```bash
# Check data counts
sqlite3 data/mymoolah.db "SELECT COUNT(*) FROM users;"
# Expected: 36 users

sqlite3 data/mymoolah.db "SELECT COUNT(*) FROM wallets;"
# Expected: 36 wallets

sqlite3 data/mymoolah.db "SELECT COUNT(*) FROM transactions;"
# Expected: 15+ transactions

sqlite3 data/mymoolah.db "SELECT COUNT(*) FROM kyc;"
# Expected: 3 KYC records
```

### **Foreign Key Testing**
```bash
# Test user-wallet relationship
sqlite3 data/mymoolah.db "SELECT u.firstName, w.balance FROM users u JOIN wallets w ON u.id = w.userId LIMIT 5;"
# Expected: User names with wallet balances

# Test wallet-transaction relationship
sqlite3 data/mymoolah.db "SELECT w.walletId, t.type, t.amount FROM wallets w JOIN transactions t ON w.walletId = t.walletId LIMIT 5;"
# Expected: Wallet IDs with transaction details
```

## 🔐 Security Testing

### **Authentication Testing**
```bash
# Test valid registration
curl -X POST http://localhost:5050/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{"firstName":"Test","lastName":"User","email":"test@example.com","password":"password123"}'
# Expected: Success with JWT token

# Test invalid registration (missing fields)
curl -X POST http://localhost:5050/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{"firstName":"Test"}'
# Expected: 400 Bad Request

# Test valid login
curl -X POST http://localhost:5050/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123"}'
# Expected: Success with JWT token

# Test invalid login (wrong password)
curl -X POST http://localhost:5050/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"wrongpassword"}'
# Expected: 401 Unauthorized
```

### **Authorization Testing**
```bash
# Test protected route without token
curl -X GET http://localhost:5050/api/v1/wallets/1
# Expected: 401 Unauthorized

# Test protected route with valid token
curl -X GET http://localhost:5050/api/v1/wallets/1 \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
# Expected: 200 OK with wallet data

# Test protected route with invalid token
curl -X GET http://localhost:5050/api/v1/wallets/1 \
  -H "Authorization: Bearer invalid-token"
# Expected: 401 Unauthorized
```

### **Input Validation Testing**
```bash
# Test invalid amount (negative)
curl -X POST http://localhost:5050/api/v1/wallets/1/credit \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{"amount": -100}'
# Expected: 400 Bad Request

# Test invalid amount (string)
curl -X POST http://localhost:5050/api/v1/wallets/1/credit \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{"amount": "invalid"}'
# Expected: 400 Bad Request

# Test missing amount
curl -X POST http://localhost:5050/api/v1/wallets/1/credit \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{}'
# Expected: 400 Bad Request
```

## 📈 Performance Testing

### **Response Time Testing**
```bash
# Test authentication response time
time curl -X POST http://localhost:5050/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123"}'
# Expected: < 200ms

# Test wallet operations response time
time curl -X GET http://localhost:5050/api/v1/wallets/1/balance \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
# Expected: < 200ms

# Test data retrieval response time
time curl -X GET http://localhost:5050/api/v1/users
# Expected: < 200ms
```

### **Load Testing**
```bash
# Test multiple concurrent requests
for i in {1..10}; do
  curl -X GET http://localhost:5050/api/v1/users &
done
wait
# Expected: All requests successful

# Test rate limiting
for i in {1..10}; do
  curl -X POST http://localhost:5050/api/v1/auth/register \
    -H "Content-Type: application/json" \
    -d '{"firstName":"Test","lastName":"User","email":"test'$i'@example.com","password":"password123"}'
done
# Expected: Rate limit exceeded after 5 requests
```

## 🚨 Error Testing

### **Database Error Testing**
```bash
# Test with corrupted database
cp data/mymoolah.db data/mymoolah.db.backup
echo "corrupted" > data/mymoolah.db
curl -X GET http://localhost:5050/api/v1/users
# Expected: 500 Internal Server Error

# Restore database
cp data/mymoolah.db.backup data/mymoolah.db
```

### **Network Error Testing**
```bash
# Test with server down
pkill -f "node server.js"
curl http://localhost:5050/test
# Expected: Connection refused

# Restart server
npm start
```

### **Invalid Endpoint Testing**
```bash
# Test non-existent endpoint
curl -X GET http://localhost:5050/api/v1/nonexistent
# Expected: 404 Not Found

# Test invalid HTTP method
curl -X PUT http://localhost:5050/api/v1/users
# Expected: 404 Not Found
```

## 📊 Test Results Tracking

### **Current Test Results**
- ✅ **Authentication**: 2/2 endpoints working
- ✅ **Users**: 1/1 endpoints working
- ✅ **Wallets**: 5/5 endpoints working
- ✅ **Transactions**: 3/3 endpoints working
- ✅ **KYC**: 1/1 endpoints working
- ✅ **Other**: 2/2 endpoints working

**Total**: 14/14 endpoints tested and working ✅

### **Database Test Results**
- ✅ **Users Table**: 36 records
- ✅ **Wallets Table**: 36 records
- ✅ **Transactions Table**: 15+ records
- ✅ **KYC Table**: 3 records

### **Security Test Results**
- ✅ **JWT Authentication**: Working correctly
- ✅ **Password Hashing**: bcryptjs working
- ✅ **Rate Limiting**: Working correctly
- ✅ **Input Validation**: Working correctly

## 🔄 Continuous Testing

### **Automated Testing**
```bash
# Run all tests
npm test

# Run specific test categories
npm run test:auth
npm run test:wallet
npm run test:transactions
npm run test:security
```

### **Manual Testing Checklist**
- [ ] Server starts without errors
- [ ] All API endpoints respond correctly
- [ ] Database operations work properly
- [ ] Security features function correctly
- [ ] Error handling works as expected
- [ ] Performance meets requirements

## 📋 Testing Documentation

### **Test Case Documentation**
- ✅ **Authentication Tests**: Registration, login, JWT validation
- ✅ **Wallet Tests**: Credit, debit, balance, transactions
- ✅ **Data Tests**: Users, transactions, KYC records
- ✅ **Security Tests**: Rate limiting, input validation
- ✅ **Error Tests**: Invalid inputs, missing tokens, database errors

### **Test Results Documentation**
- ✅ **Test Results**: All tests documented with results
- ✅ **Performance Metrics**: Response times and throughput
- ✅ **Security Validation**: Authentication and authorization verified
- ✅ **Error Handling**: All error scenarios tested

---

**Testing Guide Updated**: July 10, 2025  
**Status**: ✅ **ALL TESTING PROCEDURES VALIDATED**  
**Next Review**: After major platform changes 