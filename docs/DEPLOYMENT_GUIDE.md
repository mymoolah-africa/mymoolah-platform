# MyMoolah Deployment Guide

**Last Updated**: February 18, 2026

---

## 📚 **DEPLOYMENT DOCUMENT INDEX**

| Document | Purpose |
|----------|---------|
| **This file** | Main deployment procedures, local/cloud setup |
| [GCP_PRODUCTION_DEPLOYMENT.md](./GCP_PRODUCTION_DEPLOYMENT.md) | Production deployment (api-mm, wallet) |
| [DEPLOYMENT_CHECKLIST.md](./DEPLOYMENT_CHECKLIST.md) | Pre-deployment checklist |
| [GCP_DEPLOYMENT_QUICK_START.md](./GCP_DEPLOYMENT_QUICK_START.md) | Quick start for GCP |
| [FRESH_STAGING_DEPLOYMENT_GUIDE.md](./FRESH_STAGING_DEPLOYMENT_GUIDE.md) | Fresh staging setup |
| [WALLET_DEPLOYMENT_GUIDE.md](./WALLET_DEPLOYMENT_GUIDE.md) | Wallet-specific deployment |
| [DEVELOPMENT_DEPLOYMENT_WORKFLOW.md](./DEVELOPMENT_DEPLOYMENT_WORKFLOW.md) | Dev → deploy workflow |
| [GCP_DEPLOYMENT_STATUS.md](./GCP_DEPLOYMENT_STATUS.md) | Deployment status |
| [GCP_STAGING_DEPLOYMENT.md](./GCP_STAGING_DEPLOYMENT.md) | Staging deployment |
| [GCP_STAGING_DEPLOYMENT_STATUS.md](./GCP_STAGING_DEPLOYMENT_STATUS.md) | Staging status |

---

## 🚀 Current Deployment Procedures

**Status**: ✅ **VALIDATED** - Production live at api-mm.mymoolah.africa, wallet.mymoolah.africa

## 📋 Deployment Overview

### **Platform Status**
- ✅ **Production Ready**: All core features complete
- ✅ **API Endpoints**: 28/28 working (100%)
- ✅ **Database**: All tables functional with real data
- ✅ **Security**: JWT authentication and rate limiting working
- ✅ **Authentication**: Multi-input auth with complex password system
- ✅ **KYC System**: Document upload with camera support
- ✅ **Frontend**: React 18 with Figma AI integration
- ✅ **Transaction Display**: Clean, no duplicate references, professional formatting
- ✅ **QR Code Scanning**: Cross-browser camera support (iOS Safari, Android Chrome, Opera Mini)
- ✅ **QR Upload**: Enhanced detection with 6 strategies for logos and overlays
- ✅ **All Integrations**: EasyPay, Flash, MobileMart, dtMercury, Peach Payments
- ✅ **AI Supplier Comparison**: Real-time deal analysis and recommendations
- ✅ **Documentation**: All files updated and current

### **Deployment Environments**
- **Local Development**: Backend 3001, Frontend 3000. DB is PostgreSQL via Cloud SQL proxy.
- **Cloud Development**: PostgreSQL (Cloud SQL) recommended. Backend 3001, Frontend 3000.
- **Staging**: PostgreSQL (Cloud SQL `mmtp-pg-staging` → `mymoolah_staging`). Backend 3001, Frontend 3000.
- **Production**: PostgreSQL (Cloud SQL `mmtp-pg-production` → `mymoolah_production`), HA recommended.

## 🔧 Local Deployment

### **Prerequisites**
- Node.js 18+
- npm or yarn
- Git

### **Installation Steps**
```bash
# Clone repository
git clone <repository-url>
cd mymoolah

# Install dependencies
npm install

# Create environment file
echo "PORT=5050
JWT_SECRET=your-secret-key
NODE_ENV=development" > .env

# Start backend server
npm start

# In new terminal, start frontend
cd mymoolah-wallet-frontend
npm install
npm run dev

# Verify deployment
curl http://localhost:5050/test
# Expected: {"message":"Test route works!"}

# Verify frontend
curl http://localhost:3000
# Expected: HTML content

# Verify network access
curl http://192.168.3.160:3000
# Expected: HTML content
```

### **Database Setup (Cloud SQL for PostgreSQL)**

#### **Development Database**
```bash
# Instance: mmtp-pg (PostgreSQL 16, africa-south1)
# Connection name: mymoolah-db:africa-south1:mmtp-pg
# Database: mymoolah
# User: mymoolah_app
# Access: Cloud SQL Auth Proxy recommended

# Recommended local connectivity via Cloud SQL Auth Proxy
bash scripts/setup-cloud-sql-proxy.sh
./bin/cloud-sql-proxy --address 127.0.0.1 --port 5433 mymoolah-db:africa-south1:mmtp-pg

# Backend .env (proxy on 127.0.0.1:5433)
# DATABASE_URL=postgres://mymoolah_app:YOUR_APP_PASSWORD@127.0.0.1:5433/mymoolah?sslmode=disable
# DB_DIALECT=postgres

# Install PG driver and run migrations
npm i pg pg-hstore
DATABASE_URL="$DATABASE_URL" npx sequelize-cli db:migrate
```

#### **Staging Database** ✅ **CREATED** (November 11, 2025)
```bash
# Instance: mmtp-pg-staging (PostgreSQL 16, ENTERPRISE edition, africa-south1)
# Connection name: mymoolah-db:africa-south1:mmtp-pg-staging
# Database: mymoolah_staging
# User: mymoolah_app
# Machine Type: db-custom-1-3840 (1 vCPU, 3.75 GB RAM)
# Storage: 20GB SSD with auto-increase
# Backups: 7-day retention, point-in-time recovery enabled
# Security: No authorized networks (Cloud SQL Auth Proxy only), SSL required
# Password: Stored in Google Secret Manager (db-mmtp-pg-staging-password)

# Setup script (automated):
./scripts/setup-staging-production-databases.sh

# Access via Cloud SQL Auth Proxy:
./bin/cloud-sql-proxy --address 127.0.0.1 --port 5434 mymoolah-db:africa-south1:mmtp-pg-staging

# Retrieve password from Secret Manager:
gcloud secrets versions access latest --secret="db-mmtp-pg-staging-password" --project=mymoolah-db

# Backend .env (Staging):
# DATABASE_URL=postgres://mymoolah_app:$(gcloud secrets versions access latest --secret="db-mmtp-pg-staging-password" --project=mymoolah-db)@127.0.0.1:5434/mymoolah_staging?sslmode=disable
```

#### **Production Database** ✅ **CREATED** (November 11, 2025)
```bash
# Instance: mmtp-pg-production (PostgreSQL 16, ENTERPRISE edition, africa-south1)
# Connection name: mymoolah-db:africa-south1:mmtp-pg-production
# Database: mymoolah_production
# User: mymoolah_app
# Machine Type: db-custom-4-15360 (4 vCPU, 15 GB RAM)
# Storage: 100GB SSD with auto-increase
# Backups: 30-day retention, point-in-time recovery enabled
# Security: No authorized networks (Cloud SQL Auth Proxy only), SSL required, deletion protection
# Password: Stored in Google Secret Manager (db-mmtp-pg-production-password)

# Setup script (automated):
./scripts/setup-staging-production-databases.sh

# Access via Cloud SQL Auth Proxy:
./bin/cloud-sql-proxy --address 127.0.0.1 --port 5435 mymoolah-db:africa-south1:mmtp-pg-production

# Retrieve password from Secret Manager:
gcloud secrets versions access latest --secret="db-mmtp-pg-production-password" --project=mymoolah-db

# Backend .env (Production):
# DATABASE_URL=postgres://mymoolah_app:$(gcloud secrets versions access latest --secret="db-mmtp-pg-production-password" --project=mymoolah-db)@127.0.0.1:5435/mymoolah_production?sslmode=disable
```

### **Logo System Verification**
```bash
# Verify logo assets
ls -la mymoolah-wallet-frontend/src/assets/
# Expected: logo.svg, logo2.svg, logo3.svg

# Test logo accessibility
curl -I http://localhost:3000/src/assets/logo2.svg
# Expected: 200 OK

# Test network logo access
curl -I http://192.168.3.160:3000/src/assets/logo2.svg
# Expected: 200 OK
```

### **Testing Deployment**
```bash
# Test authentication
node test-auth.js

# Test wallet operations
node test-wallet.js

# Test all endpoints
node test-api-endpoints.js

# Test frontend logo display
open http://localhost:3000
# Verify logo2.svg displays correctly
```

## ☁️ Cloud Deployment (Codespaces)

### **Environment Setup**
```bash
# Same installation as local
git clone <repository-url>
cd mymoolah
npm install

# Environment variables (Codespaces)
echo "PORT=5050
JWT_SECRET=your-secret-key
NODE_ENV=production" > .env

# Start backend server
npm start

# Start frontend server
cd mymoolah-wallet-frontend
npm install
npm run dev
```

### **Codespaces Auto-Start & DB (Current)**
- Backend auto-starts on container open (postStart). Manual fallback: `npm run start:cs-ip`
- Frontend on port 3000 (forwarded URL). Set `CORS_ORIGINS` to your 3000 URL
- Dev DB uses runtime TLS overrides only for Codespaces; for a fully secure setup use Cloud SQL Auth Proxy
- See `docs/CODESPACES_DB_CONNECTION.md` and `docs/START_SERVICES_CODESPACES.md`

### **Database Configuration**
- **Database**: PostgreSQL (Cloud SQL)
- **Connection**: via `DATABASE_URL`
- **Migrations**: `npx sequelize-cli db:migrate`

### **Verification**
```bash
# Test server health
curl http://localhost:5050/test

# Test API endpoints
curl http://localhost:5050/api/v1/users
curl http://localhost:5050/api/v1/transactions
curl http://localhost:5050/api/v1/kyc
```

---

## 🏦 **Reconciliation System Deployment**

### **Overview**
The reconciliation system is deployed as part of the main MyMoolah platform. It requires additional database tables and configuration for SFTP access.

### **Prerequisites**
- Database migration completed (`20260113000001_create_reconciliation_system.js`)
- SFTP service configured (Google Cloud Storage + SFTP server)
- Supplier SSH keys configured
- Email SMTP configured (optional, for alerts)

### **Deployment Steps**

#### **1. Database Migration**
```bash
# In Codespaces (UAT)
cd /workspaces/mymoolah-platform
./scripts/run-migrations-master.sh uat

# For Staging
./scripts/run-migrations-master.sh staging

# Verify tables created
node -e "
const { Sequelize } = require('sequelize');
require('dotenv').config();
const { getUATDatabaseURL } = require('./scripts/db-connection-helper');
(async () => {
  const sequelize = new Sequelize(getUATDatabaseURL(), { logging: false });
  const [tables] = await sequelize.query(\`
    SELECT table_name FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name LIKE 'recon_%'
    ORDER BY table_name;
  \`);
  console.log('Reconciliation Tables:', tables.map(t => t.table_name));
  process.exit(0);
})();
"
```

#### **2. Install Dependencies**
```bash
# Install reconciliation-specific packages
npm install exceljs@^4.4.0 moment-timezone@^0.5.45 csv-parse@^5.5.3 @google-cloud/storage@^7.14.0

# Verify installation
npm audit fix
```

#### **3. Configure Environment Variables**
```bash
# Add to .env file

# Reconciliation System
RECON_SFTP_HOST=34.35.137.166
RECON_SFTP_PORT=22
RECON_GCS_BUCKET=mymoolah-sftp-inbound

# Email Alerts (Optional)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=alerts@mymoolah.africa
SMTP_PASS=your-smtp-password
RECON_ALERT_EMAIL=finance@mymoolah.africa

# GCS Configuration (already configured)
GOOGLE_CLOUD_PROJECT=mymoolah-platform
GOOGLE_APPLICATION_CREDENTIALS=/path/to/service-account-key.json
```

#### **4. Configure Supplier Access**
```bash
# Add MobileMart SSH public key to SFTP service
# (Done via Google Cloud Console or gcloud CLI)

# Configure firewall rules for MobileMart IP range
gcloud compute firewall-rules create allow-mobilemart-sftp \
  --allow=tcp:22 \
  --source-ranges=MOBILEMART_IP_RANGE \
  --target-tags=sftp-server \
  --description="Allow SFTP access from MobileMart"
```

#### **5. Verify Deployment**
```bash
# Test database connection
curl -X GET http://localhost:3001/api/v1/reconciliation/suppliers \
  -H "Authorization: Bearer $ADMIN_JWT_TOKEN"

# Expected response:
# {
#   "success": true,
#   "data": {
#     "suppliers": [
#       {
#         "code": "MMART",
#         "name": "MobileMart",
#         "is_active": true
#       }
#     ]
#   }
# }

# Test manual reconciliation trigger (with test file)
curl -X POST http://localhost:3001/api/v1/reconciliation/trigger \
  -H "Authorization: Bearer $ADMIN_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "supplierCode": "MMART",
    "filePath": "gs://mymoolah-sftp-inbound/mobilemart/test_recon.csv",
    "runType": "manual"
  }'
```

### **Production Deployment Checklist**
- [ ] Database migration applied to production
- [ ] Environment variables configured
- [ ] Supplier SSH keys configured
- [ ] Firewall rules configured
- [ ] SMTP configured for alerts
- [ ] Test reconciliation run completed
- [ ] Monitoring alerts configured
- [ ] Documentation updated
- [ ] Team trained on reconciliation reports
- [ ] Backup procedures verified

### **Rollback Procedure**
```bash
# If issues occur, rollback migration
./scripts/rollback-reconciliation-migration.sh

# Or manually
npx sequelize-cli db:migrate:undo --name 20260113000001_create_reconciliation_system.js
```

### **Post-Deployment Monitoring**
```bash
# Monitor reconciliation runs
curl -X GET "http://localhost:3001/api/v1/reconciliation/runs?limit=10" \
  -H "Authorization: Bearer $ADMIN_JWT_TOKEN"

# Monitor reconciliation analytics
curl -X GET "http://localhost:3001/api/v1/reconciliation/analytics" \
  -H "Authorization: Bearer $ADMIN_JWT_TOKEN"

# Check audit trail integrity
node scripts/verify-recon-audit-trail.js
```

### **Documentation**
- **Framework**: `docs/RECONCILIATION_FRAMEWORK.md`
- **Quick Start**: `docs/RECONCILIATION_QUICK_START.md`
- **Testing**: `docs/TESTING_GUIDE.md#reconciliation-testing`
- **API Reference**: `docs/API_DOCUMENTATION.md#reconciliation-api`

---

## 🐳 Docker Deployment

### **Docker Configuration**
```yaml
# docker-compose.yml
version: '3.8'
services:
  mymoolah:
    build: .
    ports:
      - "5050:5050"
    environment:
      - NODE_ENV=production
      - PORT=5050
    volumes:
      - ./data:/app/data
    depends_on:
      - mysql
    restart: unless-stopped

  # Example Postgres service (optional for local containerized dev)
  postgres:
    image: postgres:16
    environment:
      POSTGRES_DB: mymoolah
      POSTGRES_USER: mymoolah_user
      POSTGRES_PASSWORD: strongpassword
    ports:
      - "5432:5432"
    volumes:
      - pg_data:/var/lib/postgresql/data
    restart: unless-stopped

volumes:
  pg_data:
```

### **Dockerfile**
```dockerfile
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY . .

EXPOSE 5050

CMD ["npm", "start"]
```

### **Docker Commands**
```bash
# Build and start services
docker-compose up -d

# Check service status
docker-compose ps

# View logs
docker-compose logs -f

# Stop services
docker-compose down
```

## 🚀 Production Deployment

### **Environment Configuration**
```bash
# Production environment variables
NODE_ENV=production
PORT=5050
JWT_SECRET=your-production-secret-key
DB_HOST=your-database-host
DB_USER=your-database-user
DB_PASSWORD=your-database-password
DB_NAME=your-database-name
```

### **Database Setup**
Use Cloud SQL for PostgreSQL; create roles and grants via psql or Cloud Console. See `scripts/create-db-role.sql`.

### **Application Deployment**
```bash
# Install dependencies
npm install --production

# Start application
npm start

# Or use PM2 for process management
npm install -g pm2
pm2 start server.js --name mymoolah
pm2 save
pm2 startup
```

## 📊 Health Checks

### **Application Health**
```bash
# Test server health
curl http://localhost:5050/test
# Expected: {"message":"Test route works!"}

# Test API health
curl http://localhost:3001/api/v1/users
# Expected: List of users

# Test database health
psql -h localhost -p 5433 -U mymoolah_app -d mymoolah -c "SELECT COUNT(*) FROM users;"
# Expected: 2 users
```

### **Service Monitoring**
```bash
# Check process status
ps aux | grep node

# Check port usage
lsof -i :3001

# Check memory usage
top -p $(pgrep node)

# Check disk usage
df -h
```

## 🔐 Security Configuration

### **Environment Security**
```bash
# Secure environment variables
export NODE_ENV=production
export JWT_SECRET=your-very-secure-secret-key
export DATABASE_URL=postgresql://username:password@localhost:5433/mymoolah

# File permissions
chmod 600 .env
```

### **Network Security**
```bash
# Firewall configuration
sudo ufw allow 3001
sudo ufw enable

# SSL/TLS configuration (for production)
# Install and configure SSL certificates
```

### **Application Security**
- ✅ **JWT Authentication**: Secure token generation and validation
- ✅ **Rate Limiting**: Per-endpoint rate limiting
- ✅ **Input Validation**: Sanitization and validation
- ✅ **Error Handling**: Secure error responses

## 📈 Performance Optimization

### **Application Performance**
```bash
# Enable compression
npm install compression

# Enable caching
npm install redis

# Monitor performance
npm install pm2
pm2 start server.js --name mymoolah
pm2 monit
```

### **Database Performance**
- Use Cloud SQL Query Insights to monitor slow queries.
- Ensure adequate CPU/RAM; enable auto storage increase.

## 🔄 Backup and Recovery

### **Database Backup**
Cloud SQL automated backups and PITR are enabled; for manual logical backups use `pg_dump`.

### **Application Backup**
```bash
# Code backup
git archive --format=tar --output=backup_$(date +%Y%m%d).tar HEAD

# Configuration backup
cp .env .env.backup.$(date +%Y%m%d)
```

### **Recovery Procedures**
```bash
# Database recovery
# Use Cloud SQL point-in-time recovery or restore from backup

# Application recovery
git checkout HEAD
npm install
npm start
```

## 🚨 Troubleshooting

### **Common Issues**
```bash
# Port already in use
lsof -i :5050
kill -9 <PID>

# Database issues
npm start

# Dependencies issues
rm -rf node_modules package-lock.json
npm install

# Memory issues
node --max-old-space-size=4096 server.js
```

### **Log Analysis**
```bash
# Application logs
tail -f logs/app.log

# Error logs
grep ERROR logs/app.log

# Performance logs
grep "response time" logs/app.log
```

### **Debug Mode**
```bash
# Enable debug logging
DEBUG=* npm start

# Verbose logging
NODE_ENV=development npm start
```

## 📋 Deployment Checklist

### **Pre-Deployment**
- [ ] All tests passing
- [ ] Documentation updated
- [ ] Environment variables configured
- [ ] Database backup completed
- [ ] Security measures in place

### **Deployment**
- [ ] Code deployed to target environment
- [ ] Dependencies installed
- [ ] Database migrations completed
- [ ] Application started successfully
- [ ] Health checks passing

### **Post-Deployment**
- [ ] All endpoints responding correctly
- [ ] Database connectivity verified
- [ ] Security features working
- [ ] Performance metrics acceptable
- [ ] Monitoring configured

## 🎯 Deployment Metrics

### **Current Performance**
- ✅ **Response Time**: < 200ms for most endpoints
- ✅ **Uptime**: 99.9% (target)
- ✅ **Error Rate**: < 0.1% (target)
- ✅ **Security**: All security features working

### **Scalability Ready**
- ✅ **Database**: Migrated to PostgreSQL
- ✅ **Load Balancing**: Architecture supports horizontal scaling
- ✅ **Caching**: Ready for Redis integration
- ✅ **Monitoring**: Ready for comprehensive monitoring

## 📞 Support and Maintenance

### **Monitoring**
```bash
# Application monitoring
pm2 monit

# Database monitoring
psql "$DATABASE_URL" -c "SELECT 1" | cat

# Network monitoring
netstat -tulpn | grep :5050
```

### **Maintenance**
```bash
# Regular updates
git pull origin main
npm install
npm start

# Database maintenance
VACUUM and ANALYZE are managed by Postgres auto‑vacuum; no manual action needed for Cloud SQL.
```

---

**Deployment Guide Updated**: July 10, 2025  
**Status**: ✅ **ALL DEPLOYMENT PROCEDURES VALIDATED**  
**Next Review**: After major platform changes 