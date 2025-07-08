# Backend Verification Checklist

**Date:** Tomorrow's Session  
**Purpose:** Verify all backend components are ready for frontend development

## 1. Docker & Mojaloop Setup ✅

### Start Docker
```bash
# Start Docker Desktop (if not running)
open -a Docker
# Wait for Docker to fully start (check status)
docker --version
docker ps
```

### Verify Mojaloop Sandbox
```bash
# Navigate to project directory
cd /Users/andremacbookpro/mymoolah

# Check if Mojaloop containers are available
docker-compose -f docker-compose.yml ps

# Start Mojaloop sandbox if needed
docker-compose -f docker-compose.yml up -d
```

## 2. Database Connection Test ✅

### Test Cloud SQL Connection
```bash
# Start Cloud SQL Auth Proxy (if not running)
./cloud_sql_proxy --address 127.0.0.1 --port 3306 mymoolah-db:africa-south1:mymoolah-instance &

# Test connection
mysql --host=127.0.0.1 --user=mymoolah_user --password --database=mymoolah_db -e 'SHOW TABLES;'
```

### Verify Database Schema
```sql
-- Check if all required tables exist
SHOW TABLES;

-- Verify key tables have correct structure
DESCRIBE users;
DESCRIBE wallets;
DESCRIBE transactions;
DESCRIBE vouchers;
```

## 3. Backend API Testing ✅

### Start Backend Server
```bash
# Navigate to backend directory
cd mymoolah

# Install dependencies (if needed)
npm install

# Start the server
npm start
# or
node server.js
```

### Test API Endpoints
```bash
# Test basic connectivity
curl http://localhost:5050/
curl http://localhost:5050/test

# Test user endpoints
curl http://localhost:5050/api/v1/users

# Test wallet endpoints
curl http://localhost:5050/api/v1/wallets

# Test authentication
curl http://localhost:5050/api/v1/auth
```

## 4. Route Implementation Check ✅

### Verify Route Files
Check these files have proper implementation (not just placeholders):
- `routes/users.js` (should be > 100B)
- `routes/wallets.js` (should be > 100B)
- `routes/transactions.js` (should be > 100B)
- `routes/auth.js` (should be > 100B)
- `routes/kyc.js` (should be > 100B)

### Test Critical Endpoints
```bash
# Test user registration
curl -X POST http://localhost:5050/api/v1/users \
  -H "Content-Type: application/json" \
  -d '{"name":"Test User","email":"test@example.com"}'

# Test wallet creation
curl -X POST http://localhost:5050/api/v1/wallets \
  -H "Content-Type: application/json" \
  -d '{"userId":1,"type":"main"}'
```

## 5. Environment Variables ✅

### Check Required Environment Variables
```bash
# Verify these are set (or create .env file)
echo $GOOGLE_CLOUD_PROJECT
echo $DB_HOST
echo $DB_USER
echo $DB_PASSWORD
echo $DB_NAME
```

## 6. Security & Compliance ✅

### Verify SSL/TLS
```bash
# Test database SSL connection
mysql --host=127.0.0.1 --user=mymoolah_user --password --database=mymoolah_db --ssl-mode=REQUIRED -e 'SELECT 1;'
```

### Check Authentication
```bash
# Test JWT/authentication endpoints
curl http://localhost:5050/api/v1/auth/login
```

## 7. Frontend Integration Readiness ✅

### CORS Configuration
Verify CORS is properly configured in `server.js`:
```javascript
app.use(cors({
  origin: ['http://localhost:3000', 'http://localhost:5173'],
  credentials: true
}));
```

### API Documentation
Check if OpenAPI spec is up to date:
```bash
# Check if openapi.yaml exists and is current
ls -la docs/openapi.yaml
```

## Success Criteria ✅

**Backend is ready for frontend development when:**
- [ ] Docker is running and Mojaloop containers are accessible
- [ ] Database connection works with SSL
- [ ] All API endpoints return proper responses (not 404/500 errors)
- [ ] Authentication system is functional
- [ ] CORS is configured for frontend development
- [ ] Environment variables are properly set

## Troubleshooting Commands

### If Docker won't start:
```bash
# Check Docker status
docker info
# Restart Docker Desktop if needed
```

### If database connection fails:
```bash
# Check Cloud SQL Auth Proxy
ps aux | grep cloud-sql-proxy
# Restart proxy if needed
pkill cloud-sql-proxy
./cloud_sql_proxy --address 127.0.0.1 --port 3306 mymoolah-db:africa-south1:mymoolah-instance &
```

### If API endpoints fail:
```bash
# Check server logs
tail -f logs/app.log
# Restart server
npm start
```

## Next Steps After Verification

Once backend is verified:
1. ✅ Start Figma design session
2. ✅ Begin dashboard component design
3. ✅ Set up React/TypeScript frontend
4. ✅ Connect frontend to verified backend APIs

---

**Note:** This checklist should be completed before starting frontend development to ensure smooth integration. 