# MyMoolah Treasury Platform - Development & Deployment Workflow

**Date:** November 10, 2025  
**Status:** 📋 **DEVELOPMENT WORKFLOW DOCUMENTATION**

---

## 🎯 **Overview**

This document outlines the development and deployment workflow for the MyMoolah Treasury Platform (MMTP), including how to test integrations before deploying to production.

---

## 🏗️ **Architecture Overview**

### **Development Environment (Codespaces/GitHub)**
- **Purpose:** Active development and testing
- **Location:** GitHub Codespaces
- **Database:** Google Cloud SQL (`mmtp-pg` - Development database `mymoolah`)
- **Integrations:** UAT/Test credentials
- **Status:** ✅ **Current Setup**

### **Staging Environment (Google Cloud Services)**
- **Purpose:** Production-like testing and validation
- **Location:** Google Cloud Platform (GCP)
- **Database:** Google Cloud SQL (`mmtp-pg-staging` - Staging database `mymoolah_staging`)
- **Instance:** `mmtp-pg-staging` (PostgreSQL 16, ENTERPRISE edition, `db-custom-1-3840`)
- **Password Storage:** Google Secret Manager (`db-mmtp-pg-staging-password`)
- **Integrations:** Production credentials (with test accounts)
- **Status:** ✅ **Created and Running** (November 11, 2025)

### **Production Environment (Google Cloud Services)**
- **Purpose:** Live production deployment
- **Location:** Google Cloud Platform (GCP)
- **Database:** Google Cloud SQL (`mmtp-pg-production` - Production database `mymoolah_production`)
- **Instance:** `mmtp-pg-production` (PostgreSQL 16, ENTERPRISE edition, `db-custom-4-15360`)
- **Password Storage:** Google Secret Manager (`db-mmtp-pg-production-password`)
- **Integrations:** Production credentials (with real accounts)
- **Status:** ✅ **Created and Running** (November 11, 2025)

---

## 🗄️ **Database Schema Identity Policy (CRITICAL)**

### **Policy: Identical Schemas Across All Environments**

**UAT, Staging, and Production databases MUST always have identical database schemas** (tables, columns, constraints, indexes).

**Key Principles:**
- ✅ **Schema Structure**: All environments share the same schema structure
- ✅ **Schema Changes**: All schema changes are developed and tested in UAT first
- ✅ **Schema Sync**: Staging and Production schemas are synced FROM UAT
- ✅ **No Schema Drift**: No environment-specific schema additions allowed

**What Differs Between Environments:**
- 🔑 **Credentials**: UAT uses test/UAT credentials; Staging/Production use production credentials
- 📊 **Data**: Different data (products, transactions, users) but same schema structure
- 🎯 **Purpose**: Same codebase, same schema, different endpoints and data

**Workflow:**
1. **Develop in UAT**: Create migrations and schema changes in UAT (development environment)
2. **Test in UAT**: Validate schema changes with UAT credentials and test data
3. **Sync to Staging**: Run migrations in Staging to match UAT schema exactly
4. **Sync to Production**: Run migrations in Production to match UAT schema exactly

**Rationale:**
- Ensures code portability across environments
- Prevents "works in staging but not production" schema issues
- Simplifies deployment and rollback procedures
- Maintains consistency and predictability

**Enforcement:**
- Schema comparison scripts verify identity
- Sync scripts enforce UAT → Staging → Production direction
- No migrations should exist only in Staging or Production

---

## 🔄 **Development Workflow**

### **1. Development Phase (Codespaces/GitHub)**

#### **1.1 Development Environment**
```
GitHub Repository
    ↓
GitHub Codespaces (Development)
    ↓
Google Cloud SQL (Development Database)
    ↓
External Integrations (UAT/Test Credentials)
```

**Characteristics:**
- ✅ Active development and feature addition
- ✅ Integration testing with UAT credentials
- ✅ Database: Development/Test database
- ✅ Test transactions only
- ✅ Rapid iteration and testing

#### **1.2 Integration Testing**
- **UAT Credentials:** Use UAT/test credentials for all integrations
- **Test Data:** Use test accounts and test transactions
- **Test Products:** Use UAT product catalogs
- **Rate Limits:** Accept UAT rate limiting constraints
- **Purpose:** Validate integration functionality

#### **1.3 Code Management**
- **Version Control:** GitHub
- **Branching Strategy:** Feature branches → Main branch
- **Code Reviews:** Pull request reviews
- **Testing:** Automated and manual testing
- **Documentation:** Keep documentation updated

---

### **2. Staging Phase (✅ IMPLEMENTED)**

#### **2.1 Staging Environment**
```
GitHub Repository (Main Branch)
    ↓
Staging Environment (GCS Staging)
    ↓
Google Cloud SQL (mmtp-pg-staging → mymoolah_staging)
    ↓
External Integrations (Production Credentials + Test Accounts)
```

**Characteristics:**
- ✅ Production-like environment
- ✅ Production credentials (but test accounts)
- ✅ Database: `mymoolah_staging` (separate from production)
- ✅ Instance: `mmtp-pg-staging` (PostgreSQL 16, ENTERPRISE edition)
- ✅ Machine Type: `db-custom-1-3840` (1 vCPU, 3.75 GB RAM)
- ✅ Storage: 20GB SSD with auto-increase
- ✅ Backups: 7-day retention, point-in-time recovery enabled
- ✅ Security: No authorized networks (Cloud SQL Auth Proxy only), SSL required
- ✅ Password: Stored in Google Secret Manager (`db-mmtp-pg-staging-password`)
- ✅ Test transactions with production APIs
- ✅ Final validation before production
- ✅ Status: **Created and Running** (November 11, 2025)

#### **2.2 Staging Testing**
- **Production Credentials:** Use production API credentials
- **Test Accounts:** Use production test accounts
- **Test Transactions:** Real API calls, but test data
- **Rate Limits:** Production rate limits
- **Purpose:** Validate production integration before go-live

#### **2.3 Staging Benefits**
- **Risk Mitigation:** Test production integrations safely
- **Performance Testing:** Test under production-like conditions
- **Integration Validation:** Validate production credentials
- **Load Testing:** Test production rate limits
- **Final Validation:** Last check before production deployment

---

### **3. Production Phase (✅ IMPLEMENTED)**

#### **3.1 Production Environment**
```
GitHub Repository (Main Branch - Production Ready)
    ↓
Google Cloud Services (Production)
    ↓
Google Cloud SQL (mmtp-pg-production → mymoolah_production)
    ↓
External Integrations (Production Credentials + Real Accounts)
```

**Characteristics:**
- ✅ Live production deployment
- ✅ Production credentials
- ✅ Database: `mymoolah_production` (separate from staging)
- ✅ Instance: `mmtp-pg-production` (PostgreSQL 16, ENTERPRISE edition)
- ✅ Machine Type: `db-custom-4-15360` (4 vCPU, 15 GB RAM)
- ✅ Storage: 100GB SSD with auto-increase
- ✅ Backups: 30-day retention, point-in-time recovery enabled
- ✅ Security: No authorized networks (Cloud SQL Auth Proxy only), SSL required, deletion protection
- ✅ Password: Stored in Google Secret Manager (`db-mmtp-pg-production-password`)
- ✅ Real transactions
- ✅ Real customers and data
- ✅ Status: **Created and Running** (November 11, 2025)

#### **3.2 Production Deployment**
- **Deployment Method:** Automated deployment from GitHub
- **Database Migration:** Run migrations on production database
- **Configuration:** Production environment variables
- **Monitoring:** Production monitoring and alerting
- **Backup:** Production backups and disaster recovery

---

## 🧪 **Testing Strategy**

### **❌ Common Misconception**

**❌ WRONG:** Test production integrations in production environment
- **Problem:** Risk of affecting real customers
- **Problem:** Risk of real transactions during testing
- **Problem:** Difficult to rollback
- **Problem:** No safe testing environment

### **✅ Correct Approach**

**✅ CORRECT:** Test production integrations in staging environment
- **Solution:** Use staging environment with production credentials
- **Solution:** Use test accounts for production APIs
- **Solution:** Validate production integration safely
- **Solution:** Rollback easily if issues occur

---

## 📋 **Integration Testing Workflow**

### **Phase 1: Development Testing (Codespaces)**
```
1. Develop feature/integration in Codespaces
2. Use UAT credentials for integration
3. Test with UAT test accounts
4. Validate functionality
5. Commit to GitHub
6. Create pull request
7. Code review and merge
```

### **Phase 2: Staging Testing (GCS Staging)**
```
1. Deploy to staging environment
2. Use production credentials (but test accounts)
3. Test with production APIs
4. Validate production integration
5. Load testing (if applicable)
6. Performance testing
7. Final validation
```

### **Phase 3: Production Deployment (GCS Production)**
```
1. Deploy to production environment
2. Use production credentials
3. Monitor production traffic
4. Validate real transactions
5. Monitor performance
6. Handle issues if they arise
```

---

## 🔐 **Credential Management**

### **Development Environment (Codespaces)**
```env
# UAT/Test Credentials
MOBILEMART_LIVE_INTEGRATION=false
MOBILEMART_CLIENT_ID=mymoolah
MOBILEMART_CLIENT_SECRET=<UAT_SECRET>
MOBILEMART_API_URL=https://uat.fulcrumswitch.com
```

### **Staging Environment (GCS Staging)**
```env
# Production Credentials (but test accounts)
MOBILEMART_LIVE_INTEGRATION=true
MOBILEMART_CLIENT_ID=<PROD_CLIENT_ID>
MOBILEMART_CLIENT_SECRET=<PROD_CLIENT_SECRET>
MOBILEMART_API_URL=https://fulcrumswitch.com
# Use test accounts for transactions
```

### **Production Environment (GCS Production)**
```env
# Production Credentials (real accounts)
MOBILEMART_LIVE_INTEGRATION=true
MOBILEMART_CLIENT_ID=<PROD_CLIENT_ID>
MOBILEMART_CLIENT_SECRET=<PROD_CLIENT_SECRET>
MOBILEMART_API_URL=https://fulcrumswitch.com
# Real transactions with real customers
```

---

## 🎯 **Recommended Workflow**

### **Option 1: Two-Environment Workflow (Recommended)**

#### **Development → Production**
```
1. Develop in Codespaces (UAT credentials)
2. Test in Codespaces (UAT test accounts)
3. Deploy to GCS Production (Production credentials)
4. Monitor in Production
```

**Pros:**
- ✅ Simpler setup
- ✅ Faster deployment
- ✅ Lower cost

**Cons:**
- ⚠️ Less safe (testing production credentials in production)
- ⚠️ Higher risk
- ⚠️ Harder to rollback

### **Option 2: Three-Environment Workflow (Best Practice)**

#### **Development → Staging → Production**
```
1. Develop in Codespaces (UAT credentials)
2. Test in Codespaces (UAT test accounts)
3. Deploy to GCS Staging (Production credentials + test accounts)
4. Test in Staging (Production APIs, test data)
5. Deploy to GCS Production (Production credentials + real data)
6. Monitor in Production
```

**Pros:**
- ✅ Safer (test production credentials in staging)
- ✅ Lower risk
- ✅ Easier to rollback
- ✅ Better validation
- ✅ Industry best practice

**Cons:**
- ⚠️ More complex setup
- ⚠️ Additional cost (staging environment)
- ⚠️ Longer deployment cycle

---

## 📊 **Integration Testing Matrix**

| Environment | Credentials | Accounts | Data | Purpose |
|------------|-------------|----------|------|---------|
| **Development (Codespaces)** | UAT | Test | Test | Development & Integration Testing |
| **Staging (GCS Staging)** | Production | Test | Test | Production Integration Validation |
| **Production (GCS Production)** | Production | Real | Real | Live Production |

---

## 🔍 **Key Insights**

### **1. You DON'T Test Production Integrations in Production**
- ❌ **Wrong:** Test production credentials in production environment
- ✅ **Right:** Test production credentials in staging environment
- ✅ **Right:** Use test accounts with production APIs
- ✅ **Right:** Validate production integration safely

### **2. Staging Environment is Critical**
- ✅ **Purpose:** Test production integrations safely
- ✅ **Credentials:** Production credentials
- ✅ **Accounts:** Test accounts
- ✅ **Data:** Test data
- ✅ **Benefit:** Validate production integration before go-live

### **3. Development Environment Uses UAT**
- ✅ **Purpose:** Develop and test integrations
- ✅ **Credentials:** UAT credentials
- ✅ **Accounts:** UAT test accounts
- ✅ **Data:** UAT test data
- ✅ **Benefit:** Rapid development and testing

### **4. Production Environment is for Real Traffic**
- ✅ **Purpose:** Serve real customers
- ✅ **Credentials:** Production credentials
- ✅ **Accounts:** Real customer accounts
- ✅ **Data:** Real transaction data
- ✅ **Benefit:** Live production service

---

## 🚀 **Recommended Approach for MMTP**

### **Current Setup (Two-Environment)**
```
1. Development (Codespaces) → UAT Credentials → Test Accounts
2. Production (GCS) → Production Credentials → Real Accounts
```

### **Recommended Setup (Three-Environment)**
```
1. Development (Codespaces) → UAT Credentials → Test Accounts
2. Staging (GCS Staging) → Production Credentials → Test Accounts
3. Production (GCS Production) → Production Credentials → Real Accounts
```

### **Why Staging is Important**
- ✅ **Safety:** Test production integrations without affecting real customers
- ✅ **Validation:** Validate production credentials before go-live
- ✅ **Performance:** Test under production-like conditions
- ✅ **Load Testing:** Test production rate limits
- ✅ **Rollback:** Easy rollback if issues occur

---

## 📝 **Implementation Steps**

### **Step 1: Development (Codespaces)**
1. Develop features in Codespaces
2. Use UAT credentials for integrations
3. Test with UAT test accounts
4. Commit to GitHub
5. Create pull request
6. Code review and merge

### **Step 2: Staging (GCS Staging)** ✅ **IMPLEMENTED** (November 11, 2025)
1. ✅ Create staging environment in GCS (`mmtp-pg-staging`)
2. ✅ Create staging database (`mymoolah_staging`)
3. ✅ Create database user (`mymoolah_app`)
4. ✅ Store password in Google Secret Manager
5. ⏳ Configure production credentials
6. ⏳ Use test accounts for transactions
7. ⏳ Deploy code from GitHub
8. ⏳ Test production integrations
9. ⏳ Validate functionality
10. ⏳ Load testing (if applicable)
11. ⏳ Performance testing
12. ⏳ Run database migrations

### **Step 3: Production (GCS Production)** ✅ **INFRASTRUCTURE READY** (November 11, 2025)
1. ✅ Create production environment in GCS (`mmtp-pg-production`)
2. ✅ Create production database (`mymoolah_production`)
3. ✅ Create database user (`mymoolah_app`)
4. ✅ Store password in Google Secret Manager
5. ⏳ Deploy to production environment
6. ⏳ Use production credentials
7. ⏳ Use real customer accounts
8. ⏳ Run database migrations
9. ⏳ Monitor production traffic
10. ⏳ Handle issues if they arise
11. ⏳ Rollback if necessary

---

## 🎯 **Answer to Your Question**

### **Question:** "Do we have to run production-ready (live) versions of all integrations in Git/CS and test in prod before deploying to GCS?"

### **Answer:** ❌ **NO - This is NOT the correct approach**

### **✅ Correct Approach:**
1. **Development (Codespaces):** Use UAT credentials → Test with UAT accounts
2. **Staging (GCS Staging):** Use production credentials → Test with test accounts
3. **Production (GCS Production):** Use production credentials → Real customers

### **Why This is Better:**
- ✅ **Safety:** Test production integrations in staging, not production
- ✅ **Risk Mitigation:** Lower risk of affecting real customers
- ✅ **Validation:** Validate production integration before go-live
- ✅ **Rollback:** Easy rollback if issues occur
- ✅ **Best Practice:** Industry standard approach

---

## 📚 **Best Practices**

### **1. Environment Separation**
- ✅ Separate environments for development, staging, and production
- ✅ Different credentials for each environment
- ✅ Different databases for each environment
- ✅ Different configuration for each environment

### **2. Credential Management**
- ✅ Store credentials in environment variables (Development)
- ✅ Store credentials in Google Secret Manager (Staging/Production)
- ✅ Use secure secret management (Google Secret Manager)
- ✅ Never commit credentials to Git
- ✅ Rotate credentials regularly (90 days for Production)
- ✅ Banking-grade password complexity (32+ characters)
- ✅ Unique passwords per environment (security isolation)
- ✅ IAM service accounts for Secret Manager access

### **3. Testing Strategy**
- ✅ Test with UAT credentials in development
- ✅ Test with production credentials in staging
- ✅ Use test accounts for staging testing
- ✅ Monitor production closely after deployment

### **4. Deployment Strategy**
- ✅ Automated deployment from GitHub
- ✅ Database migrations
- ✅ Configuration management
- ✅ Monitoring and alerting
- ✅ Rollback procedures

---

## 🔄 **Continuous Integration/Deployment (CI/CD)**

### **Recommended CI/CD Pipeline**
```
1. Development (Codespaces)
   ↓
2. GitHub (Version Control)
   ↓
3. CI/CD Pipeline (Automated Testing)
   ↓
4. Staging (GCS Staging) - Automated Deployment
   ↓
5. Staging Testing (Manual/Automated)
   ↓
6. Production (GCS Production) - Manual/Automated Deployment
   ↓
7. Production Monitoring
```

### **CI/CD Benefits**
- ✅ Automated testing
- ✅ Automated deployment
- ✅ Consistent deployments
- ✅ Faster deployment cycles
- ✅ Reduced human error

---

## 📊 **Environment Comparison**

| Aspect | Development (Codespaces) | Staging (GCS) | Production (GCS) |
|--------|-------------------------|---------------|------------------|
| **Purpose** | Development & Testing | Production Validation | Live Production |
| **Credentials** | UAT | Production | Production |
| **Accounts** | UAT Test | Production Test | Real Customers |
| **Data** | Test Data | Test Data | Real Data |
| **Database** | Dev Database | Staging Database | Production Database |
| **Rate Limits** | UAT Limits | Production Limits | Production Limits |
| **Monitoring** | Basic | Comprehensive | Comprehensive |
| **Cost** | Low | Medium | High |
| **Risk** | Low | Medium | High |

---

## 🎯 **Recommendations for MMTP**

### **1. Immediate (Current Setup)**
- ✅ Continue development in Codespaces with UAT credentials
- ✅ Test with UAT test accounts
- ✅ Deploy to GCS Production when ready
- ⚠️ **Risk:** Testing production credentials in production

### **2. Short-Term (Recommended)**
- ✅ Create staging environment in GCS
- ✅ Use production credentials in staging
- ✅ Test with production test accounts
- ✅ Validate production integration
- ✅ Deploy to production after validation

### **3. Long-Term (Best Practice)**
- ✅ Implement CI/CD pipeline
- ✅ Automated testing
- ✅ Automated deployment
- ✅ Comprehensive monitoring
- ✅ Disaster recovery plan

---

## 📚 **Related Documentation**

- `AGENT_HANDOVER.md` - Agent handover documentation
- `DEVELOPMENT_GUIDE.md` - Development guide
- `SECURITY.md` - Security documentation
- `PERFORMANCE.md` - Performance documentation

---

## 🎉 **Conclusion**

### **Key Takeaways:**
1. ✅ **Don't test production integrations in production**
2. ✅ **Use staging environment for production credential testing**
3. ✅ **Use UAT credentials in development**
4. ✅ **Use production credentials in staging (with test accounts)**
5. ✅ **Use production credentials in production (with real customers)**

### **Recommended Workflow:**
```
Development (Codespaces) → UAT Credentials → Test Accounts
    ↓
Staging (GCS Staging) → Production Credentials → Test Accounts
    ↓
Production (GCS Production) → Production Credentials → Real Customers
```

### **This is the industry standard approach and ensures:**
- ✅ Safety (no risk to real customers)
- ✅ Validation (test production integration before go-live)
- ✅ Risk Mitigation (easy rollback if issues occur)
- ✅ Best Practice (industry standard workflow)

---

**Last Updated:** November 11, 2025  
**Status:** 📋 **DEVELOPMENT WORKFLOW DOCUMENTATION - COMPLETE** ✅ **STAGING/PRODUCTION DATABASES CREATED**

