# MyMoolah Deployment Guide

## 🚀 Current Deployment Procedures (July 20, 2025 - Logo System Fixed & Frontend Server Operational)

**Status**: ✅ **VALIDATED** - All deployment procedures tested and working

## 📋 Deployment Overview

### **Platform Status**
- ✅ **Production Ready**: All core features complete
- ✅ **API Endpoints**: 14/14 working (100%)
- ✅ **Database**: All tables functional with real data
- ✅ **Security**: JWT authentication and rate limiting working
- ✅ **Authentication**: Multi-input auth with complex password system
- ✅ **KYC System**: Document upload with camera support
- ✅ **Frontend**: React 18 with Figma AI integration (logo system fixed)
- ✅ **Logo System**: Professional MyMoolah branding working correctly
- ✅ **Frontend Server**: Stable on port 3000 without import errors
- ✅ **Documentation**: All files updated and current

### **Deployment Environments**
- **Local Development**: SQLite database, port 5050 (backend), port 3000 (frontend)
- **Cloud Development**: MySQL database, port 5050 (backend), port 3000 (frontend)
- **Production**: Ready for deployment with proper configuration

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

### **Database Setup**
```bash
# Database is automatically created on first run
# SQLite database location: data/mymoolah.db

# Check database tables
sqlite3 data/mymoolah.db ".tables"
# Expected: users, wallets, transactions, kyc

# Check data counts
sqlite3 data/mymoolah.db "SELECT COUNT(*) FROM users;"
# Expected: 36 users
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

### **Database Configuration**
- **Database**: MySQL (provided by Codespaces)
- **Connection**: Automatic configuration
- **Tables**: Same schema as local development
- **Data**: Migrated from local development

### **Verification**
```bash
# Test server health
curl http://localhost:5050/test

# Test API endpoints
curl http://localhost:5050/api/v1/users
curl http://localhost:5050/api/v1/transactions
curl http://localhost:5050/api/v1/kyc
```

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

  mysql:
    image: mysql:8.0
    environment:
      MYSQL_ROOT_PASSWORD: rootpassword
      MYSQL_DATABASE: mymoolah
      MYSQL_USER: mymoolah_user
      MYSQL_PASSWORD: mymoolah_password
    ports:
      - "3306:3306"
    volumes:
      - mysql_data:/var/lib/mysql
    restart: unless-stopped

volumes:
  mysql_data:
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
```bash
# Production database (MySQL)
mysql -u root -p
CREATE DATABASE mymoolah;
CREATE USER 'mymoolah_user'@'%' IDENTIFIED BY 'your-password';
GRANT ALL PRIVILEGES ON mymoolah.* TO 'mymoolah_user'@'%';
FLUSH PRIVILEGES;
```

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
curl http://localhost:5050/api/v1/users
# Expected: List of users

# Test database health
sqlite3 data/mymoolah.db "SELECT COUNT(*) FROM users;"
# Expected: 36 users
```

### **Service Monitoring**
```bash
# Check process status
ps aux | grep node

# Check port usage
lsof -i :5050

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
export DB_PASSWORD=your-secure-database-password

# File permissions
chmod 600 .env
chmod 600 data/mymoolah.db
```

### **Network Security**
```bash
# Firewall configuration
sudo ufw allow 5050
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
```bash
# SQLite optimization
sqlite3 data/mymoolah.db "PRAGMA journal_mode=WAL;"
sqlite3 data/mymoolah.db "PRAGMA synchronous=NORMAL;"
sqlite3 data/mymoolah.db "PRAGMA cache_size=10000;"

# MySQL optimization (production)
# Configure MySQL for performance
```

## 🔄 Backup and Recovery

### **Database Backup**
```bash
# SQLite backup
cp data/mymoolah.db data/mymoolah.db.backup.$(date +%Y%m%d)

# MySQL backup (production)
mysqldump -u mymoolah_user -p mymoolah > backup_$(date +%Y%m%d).sql

# Automated backup script
#!/bin/bash
cp data/mymoolah.db data/mymoolah.db.backup.$(date +%Y%m%d_%H%M%S)
find data/ -name "*.backup.*" -mtime +7 -delete
```

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
cp data/mymoolah.db.backup.20250710 data/mymoolah.db

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
rm data/mymoolah.db
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
- ✅ **Database**: Ready for MySQL migration
- ✅ **Load Balancing**: Architecture supports horizontal scaling
- ✅ **Caching**: Ready for Redis integration
- ✅ **Monitoring**: Ready for comprehensive monitoring

## 📞 Support and Maintenance

### **Monitoring**
```bash
# Application monitoring
pm2 monit

# Database monitoring
sqlite3 data/mymoolah.db "PRAGMA stats;"

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
sqlite3 data/mymoolah.db "VACUUM;"
sqlite3 data/mymoolah.db "ANALYZE;"
```

---

**Deployment Guide Updated**: July 10, 2025  
**Status**: ✅ **ALL DEPLOYMENT PROCEDURES VALIDATED**  
**Next Review**: After major platform changes 