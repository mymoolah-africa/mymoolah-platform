# MyMoolah Treasury Platform - Quick Fixes Guide

**Last Updated**: August 17, 2025  
**Current Version**: 3.2.0

This document contains quick solutions for common issues encountered during development and operation of the MyMoolah Treasury Platform.

---

## **🔧 Transaction Display Issues**

### **Issue: Duplicate Names in Transaction Descriptions**
**Symptoms**: Transactions show duplicate names like "Andre Botes | Andre Botes | Ref:Test"

**Root Cause**: Frontend was sending recipient names to backend, and backend was adding sender names again

**Solution**: 
1. **Frontend Fix**: Remove recipient names from description in `SendMoneyPage.tsx`
2. **Backend Fix**: Use `userDescription` directly in transaction creation
3. **Format**: `<Counterparty> | <User Description>`

**Files Modified**:
- `mymoolah-wallet-frontend/pages/SendMoneyPage.tsx` (lines 610-615, 680-685)
- `controllers/walletController.js` (transaction description logic)

**Status**: ✅ **RESOLVED** - All new transactions display correctly

---

### **Issue: System-Generated References in User Display**
**Symptoms**: Transaction descriptions show "TXN-1755461830436-SEND" instead of clean descriptions

**Root Cause**: Frontend was concatenating system references unnecessarily

**Solution**: 
1. **Remove Reference Concatenation**: Clean up `getPrimaryText` functions
2. **Use Backend Descriptions**: Trust backend to provide correct format
3. **Simplify Logic**: Remove unnecessary parsing and formatting

**Files Modified**:
- `mymoolah-wallet-frontend/pages/DashboardPage.tsx`
- `mymoolah-wallet-frontend/pages/TransactionHistoryPage.tsx`

**Status**: ✅ **RESOLVED** - Clean transaction descriptions displayed

---

## **🗄️ Database Integrity Issues**

### **Issue: Missing Wallet References in Transactions**
**Symptoms**: `senderWalletId` and `receiverWalletId` fields are NULL in transactions table

**Root Cause**: Database migration or transaction creation logic didn't populate these fields

**Solution**: 
1. **Run Database Fix Script**: `fix-database-integrity.js`
2. **Restore Wallet References**: Populate missing wallet IDs from existing data
3. **Verify Audit Trail**: Ensure complete money flow tracing

**Script Used**: `fix-database-integrity.js` (created and executed)

**Status**: ✅ **RESOLVED** - All 24 transactions now have complete wallet references

---

### **Issue: Orphaned Transactions**
**Symptoms**: Transactions exist without associated user references

**Root Cause**: Data integrity issues during development or testing

**Solution**: 
1. **Audit Database**: Use `audit-transaction-data.js` script
2. **Identify Orphaned Records**: Find transactions without user links
3. **Manual Investigation**: Review and clean up orphaned data

**Script Used**: `audit-transaction-data.js` (created and executed)

**Status**: ⚠️ **IDENTIFIED** - 1 orphaned transaction found, needs manual review

---

## **🌐 Frontend Integration Issues**

### **Issue: "Failed to fetch" CORS Errors**
**Symptoms**: Frontend can't connect to backend APIs

**Root Cause**: CORS configuration mismatch or backend not running

**Solution**: 
1. **Check Backend Status**: Ensure server is running on port 3001
2. **Verify CORS Settings**: Check `ALLOWED_ORIGINS` in backend `.env`
3. **Check Frontend URL**: Verify `VITE_API_BASE_URL` in frontend `.env.local`

**Environment Variables**:
```bash
# Backend (.env)
ALLOWED_ORIGINS=http://localhost:3000,http://127.0.0.1:3000

# Frontend (.env.local)
VITE_API_BASE_URL=http://localhost:3001
```

**Status**: ✅ **RESOLVED** - CORS properly configured

---

### **Issue: Stale Data in Frontend**
**Symptoms**: Frontend shows old transaction data even after backend updates

**Root Cause**: Browser caching of API responses

**Solution**: 
1. **Add Cache Busting**: Append `_t=${Date.now()}` to API calls
2. **Force Refresh**: Use timestamp parameters to prevent caching
3. **Clear Browser Cache**: Hard refresh or clear browser data

**Files Modified**:
- `mymoolah-wallet-frontend/pages/DashboardPage.tsx`
- `mymoolah-wallet-frontend/contexts/MoolahContext.tsx`

**Status**: ✅ **RESOLVED** - Cache busting implemented

---

## **🔐 Authentication Issues**

### **Issue: 401 Unauthorized Errors**
**Symptoms**: API calls return 401 status even with valid tokens

**Root Cause**: Token expiration, invalid tokens, or authentication middleware issues

**Solution**: 
1. **Check Token Validity**: Verify JWT token hasn't expired
2. **Refresh Token**: Use refresh token to get new access token
3. **Check Authentication**: Ensure user is properly logged in
4. **Verify Middleware**: Check authentication middleware configuration

**Debugging Steps**:
```bash
# Check token in browser console
console.log('Token:', localStorage.getItem('token'))

# Check token expiration
const token = JSON.parse(atob(token.split('.')[1]))
console.log('Expires:', new Date(token.exp * 1000))
```

**Status**: ✅ **RESOLVED** - JWT authentication working properly

---

### **Issue: Password Reset Failures**
**Symptoms**: Password reset emails not sent or reset links not working

**Root Cause**: Email service configuration or reset token issues

**Solution**: 
1. **Check Email Service**: Verify SMTP configuration in backend
2. **Check Reset Tokens**: Ensure tokens are properly generated and stored
3. **Verify Frontend URL**: Check reset link construction in frontend

**Files to Check**:
- `controllers/authController.js` (password reset logic)
- `config/email.js` (SMTP configuration)
- Frontend reset password components

**Status**: ✅ **RESOLVED** - Password reset system operational

---

## **💾 Database Connection Issues**

### **Issue: PostgreSQL Connection Failures**
**Symptoms**: Database connection errors or timeout issues

**Root Cause**: Cloud SQL Auth Proxy not running or configuration issues

**Solution**: 
1. **Start Cloud SQL Auth Proxy**: 
   ```bash
   cloud-sql-proxy --instances=mmtp_pg:us-central1:mmtp-pg
   ```
2. **Check Environment Variables**: Verify `DATABASE_URL` in `.env`
3. **Test Connection**: Use `psql` to test direct connection

**Environment Check**:
```bash
# Backend .env
DATABASE_URL=postgresql://username:password@localhost:5432/mymoolah_db

# Test connection
psql "postgresql://username:password@localhost:5432/mymoolah_db"
```

**Status**: ✅ **RESOLVED** - Database connection stable

---

### **Issue: Sequelize Migration Failures**
**Symptoms**: Database migrations fail with errors

**Root Cause**: Schema conflicts, missing dependencies, or migration order issues

**Solution**: 
1. **Check Migration Order**: Ensure migrations run in correct sequence
2. **Verify Dependencies**: Check for required tables and columns
3. **Rollback and Retry**: Use `npx sequelize-cli db:migrate:undo` if needed

**Migration Commands**:
```bash
# Check migration status
npx sequelize-cli db:migrate:status

# Run migrations
npx sequelize-cli db:migrate

# Undo last migration
npx sequelize-cli db:migrate:undo
```

**Status**: ✅ **RESOLVED** - All migrations successful

---

## **📱 Frontend Performance Issues**

### **Issue: Slow API Response Times**
**Symptoms**: Frontend takes long time to load data

**Root Cause**: Backend performance issues or inefficient queries

**Solution**: 
1. **Check Backend Performance**: Monitor API response times
2. **Optimize Database Queries**: Add proper indexes and optimize queries
3. **Implement Caching**: Add Redis or in-memory caching for frequently accessed data

**Performance Monitoring**:
```bash
# Check API response times
curl -w "@curl-format.txt" -o /dev/null -s "http://localhost:3001/api/v1/wallets/balance"

# Monitor database performance
psql -c "SELECT query, mean_time, calls FROM pg_stat_statements ORDER BY mean_time DESC LIMIT 10;"
```

**Status**: ✅ **RESOLVED** - API performance optimized

---

### **Issue: Memory Leaks in Frontend**
**Symptoms**: Frontend becomes slow over time or crashes

**Root Cause**: Unmanaged state, event listeners, or component lifecycle issues

**Solution**: 
1. **Check Component Lifecycle**: Ensure proper cleanup in useEffect
2. **Manage State Properly**: Avoid unnecessary re-renders
3. **Clean Event Listeners**: Remove listeners on component unmount

**Best Practices**:
```typescript
useEffect(() => {
  // Setup
  const subscription = api.subscribe();
  
  // Cleanup
  return () => {
    subscription.unsubscribe();
  };
}, []);
```

**Status**: ✅ **RESOLVED** - Frontend memory management optimized

---

## **🔍 Debugging Tools**

### **Database Audit Scripts**
```bash
# Audit transaction data integrity
node audit-transaction-data.js

# Fix database integrity issues
node fix-database-integrity.js

# Verify fixes
node final-audit-verification.js
```

### **API Testing Tools**
```bash
# Test API endpoints
curl http://localhost:3001/api/v1/health

# Test with authentication
curl -H "Authorization: Bearer YOUR_TOKEN" http://localhost:3001/api/v1/wallets/balance
```

### **Frontend Debug Tools**
```typescript
// Add to components for debugging
console.log('🔍 Debug:', { data, state, props });

// Check API responses
console.log('📡 API Response:', response);
```

---

## **📞 Getting Help**

### **Immediate Issues**
1. **Check this Quick Fixes Guide** for common solutions
2. **Review Recent Changes** in CHANGELOG.md
3. **Check System Status** in PROJECT_STATUS.md

### **Complex Issues**
1. **Review Agent Handover** in AGENT_HANDOVER.md
2. **Check Development Guide** in DEVELOPMENT_GUIDE.md
3. **Examine API Documentation** in API_DOCUMENTATION.md

### **Emergency Procedures**
1. **Database Backup**: Use `scripts/backup.sh` for immediate backup
2. **Rollback Changes**: Use git to revert to last working state
3. **Contact Development Team**: For critical production issues

---

## **📋 Quick Fix Checklist**

Before reporting an issue, try these steps:

- [ ] **Restart Services**: Backend and frontend servers
- [ ] **Check Logs**: Review console and server logs
- [ ] **Verify Environment**: Check `.env` and `.env.local` files
- [ ] **Clear Cache**: Browser cache and API response cache
- [ ] **Test API**: Use curl or Postman to test endpoints directly
- [ ] **Check Database**: Verify database connection and data integrity
- [ ] **Review Recent Changes**: Check what was modified recently

---

**Quick Fixes Guide**: ✅ **UP TO DATE**  
**All Critical Issues**: ✅ **RESOLVED**  
**System Status**: ✅ **OPERATIONAL** 