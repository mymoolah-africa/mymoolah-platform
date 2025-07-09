# MyMoolah Sandbox Best Practices

**Purpose:** Ensure safe, consistent, and reliable development and integration testing

## 🎯 **Core Principles**

### **1. Always Use Sandbox for Development**
- ✅ **Never test new features directly in production**
- ✅ **All integrations (SPs, RTs, APIs) must be tested in sandbox first**
- ✅ **Use sandbox for all development, QA, and partner testing**

### **2. Regular Sandbox Maintenance**
- ✅ **Reset sandbox weekly** to avoid stale data and conflicts
- ✅ **Clean up containers and volumes** after major testing sessions
- ✅ **Keep sandbox version aligned** with production Mojaloop version

### **3. Documentation & Process**
- ✅ **Document all test cases** and integration flows
- ✅ **Use consistent naming conventions** for test data
- ✅ **Track all sandbox changes** in version control

---

## 🚀 **Sandbox Management Commands**

### **Start Fresh Sandbox**
```bash
# Automated setup with cleanup
./scripts/sandbox-setup.sh

# Manual setup
docker-compose up -d
```

### **Reset Sandbox**
```bash
# Complete reset (removes all containers, networks, volumes)
./scripts/sandbox-reset.sh

# Quick reset (keeps volumes)
docker-compose down
docker-compose up -d
```

### **Check Sandbox Status**
```bash
# View running containers
docker-compose ps

# View logs
docker-compose logs -f

# Check specific service
docker-compose logs [service-name]
```

---

## 📋 **Integration Testing Workflow**

### **Before Testing New Integration**
1. **Reset sandbox** to clean state
2. **Document test plan** with expected outcomes
3. **Prepare test data** (fake accounts, transactions)
4. **Set up monitoring** (logs, metrics)

### **During Testing**
1. **Use consistent test data** (same account numbers, amounts)
2. **Test both success and failure scenarios**
3. **Verify all API responses** match expected format
4. **Check error handling** and edge cases

### **After Testing**
1. **Document results** and any issues found
2. **Clean up test data** if needed
3. **Update integration documentation**
4. **Plan production deployment** if successful

---

## 🔧 **Sandbox Configuration**

### **Environment Variables**
```bash
# Sandbox-specific settings
SANDBOX_MODE=true
LOG_LEVEL=debug
ENABLE_MOCK_SERVICES=true
```

### **Service Endpoints**
- **Testing Toolkit UI:** http://localhost:9660
- **MySQL Database:** localhost:3306
- **Redis Cache:** localhost:6379
- **Kafka Message Broker:** localhost:9092
- **API Adapter:** http://localhost:3000

---

## 🛡️ **Security Best Practices**

### **Sandbox Security**
- ✅ **Never use real credentials** in sandbox
- ✅ **Use fake/test data** for all transactions
- ✅ **Isolate sandbox network** from production
- ✅ **Regular security updates** for sandbox components

### **Data Protection**
- ✅ **No real user data** in sandbox
- ✅ **Fake account numbers** and test amounts
- ✅ **Encrypted test data** if simulating sensitive scenarios
- ✅ **Regular data cleanup** to prevent accumulation

---

## 📊 **Monitoring & Logging**

### **Essential Monitoring**
```bash
# Check service health
docker-compose ps

# Monitor logs in real-time
docker-compose logs -f

# Check resource usage
docker stats
```

### **Key Metrics to Track**
- **Container health** (all services running)
- **API response times** (under 2 seconds)
- **Error rates** (should be 0% for stable features)
- **Memory usage** (prevent resource exhaustion)

---

## 🔄 **Version Management**

### **Mojaloop Version Alignment**
- ✅ **Keep sandbox version** close to production
- ✅ **Test version upgrades** in sandbox first
- ✅ **Document version differences** and their impact
- ✅ **Regular version updates** (monthly recommended)

### **Backup & Recovery**
```bash
# Backup sandbox configuration
docker-compose config > sandbox-config-backup.yml

# Restore from backup
docker-compose -f sandbox-config-backup.yml up -d
```

---

## 🚨 **Troubleshooting Guide**

### **Common Issues**

**1. Container Won't Start**
```bash
# Check Docker resources
docker system df
docker system prune -f

# Restart Docker Desktop
# Then retry: ./scripts/sandbox-setup.sh
```

**2. Service Not Responding**
```bash
# Check service logs
docker-compose logs [service-name]

# Restart specific service
docker-compose restart [service-name]
```

**3. Port Conflicts**
```bash
# Check what's using the port
lsof -i :9660

# Kill conflicting process or change port in docker-compose.yml
```

**4. Database Connection Issues**
```bash
# Check MySQL container
docker-compose logs mysql

# Reset database
docker-compose down -v
docker-compose up -d
```

---

## 📚 **Integration Testing Checklist**

### **Before Each Integration Test**
- [ ] Sandbox is clean and running
- [ ] Test data is prepared
- [ ] API endpoints are accessible
- [ ] Monitoring is active
- [ ] Documentation is updated

### **During Integration Test**
- [ ] All API calls return expected responses
- [ ] Error scenarios are handled properly
- [ ] Performance meets requirements
- [ ] Security measures are in place
- [ ] Logs are being captured

### **After Integration Test**
- [ ] Results are documented
- [ ] Issues are logged and tracked
- [ ] Test data is cleaned up
- [ ] Lessons learned are recorded
- [ ] Next steps are planned

---

## 🎯 **Success Metrics**

### **Sandbox Health**
- ✅ **100% uptime** during development sessions
- ✅ **All services responsive** within 30 seconds
- ✅ **Zero data corruption** incidents
- ✅ **Consistent performance** across resets

### **Integration Quality**
- ✅ **All test cases pass** before production deployment
- ✅ **Zero critical bugs** found in production
- ✅ **Partner integrations** work seamlessly
- ✅ **Compliance requirements** are met

---

**Remember:** The sandbox is your safe playground. Use it wisely, maintain it regularly, and always test thoroughly before going live! 🚀 