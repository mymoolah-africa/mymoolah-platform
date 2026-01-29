# MyMoolah Treasury Platform - Development Guide

**Last Updated**: January 26, 2026  
**Version**: 2.7.3 - Consolidated Development & Onboarding Guide  
**Status**: ✅ **CONSOLIDATED** ✅ **RULE 12A ENFORCED** ✅ **DB CONNECTION PATTERN ESTABLISHED** ✅ **CORS CONFIGURATION VERIFIED** ✅ **UAT DEPLOYED**

---

## 🚀 **DEVELOPMENT OVERVIEW**

Welcome to the MyMoolah Treasury Platform (MMTP) development guide! This platform is built on **banking-grade standards** and **Mojaloop compliance**, designed to handle **millions of transactions** with enterprise-grade security and performance.

### **Platform Architecture**
- **Multi-Supplier Integration**: Unified product catalog across Flash, MobileMart, dtMercury, and Zapper.
- **Product Variants System**: Advanced multi-supplier product management with automatic supplier selection.
- **Banking-Grade Security**: ISO 27001 compliant with end-to-end encryption (AES-256-GCM, TLS 1.3).
- **Mojaloop Compliance**: FSPIOP standards for financial services interoperability.
- **3-Layer Architecture**: Directives (Docs) → Orchestration (Agent) → Execution (Deterministic Scripts).

---

## 💻 **GETTING STARTED**

### **1. Setup Quick Start**

| Environment | Backend Port | Frontend Port | DB Proxy Port |
| :--- | :--- | :--- | :--- |
| **Local (Mac)** | `3001` | `3000` | `5433` |
| **Codespaces** | `5050` | `3000` (forwarded) | `6543` (UAT) / `6544` (Staging) |

#### **Commands**

**Local (Mac):**
```bash
# Terminal 1: Backend
cd /Users/andremacbookpro/mymoolah && npm start

# Terminal 2: Frontend
cd /Users/andremacbookpro/mymoolah/mymoolah-wallet-frontend && npm run dev
```

**Codespaces:**
```bash
# Terminal 1: Backend
cd /workspaces/mymoolah-platform && npm start

# Terminal 2: Frontend
cd /workspaces/mymoolah-platform/mymoolah-wallet-frontend && npm run dev
```

### **2. Prerequisites**
- **Node.js**: Version 18.x or higher
- **PostgreSQL**: Version 15.x or higher
- **Redis**: Version 7.0 or higher (optional in dev, logs suppressed if missing)
- **Git**: Latest version

---

## 🗄️ **DATABASE DEVELOPMENT**

### **1. Connection Policy (RULE 12A)**
**CRITICAL**: NEVER write custom connection logic. Always use the standardized helpers.
- **Guide**: See `docs/DATABASE_CONNECTION_GUIDE.md` for full details.
- **Helper**: `require('./scripts/db-connection-helper')`
- **Proxy**: Run `./scripts/ensure-proxies-running.sh` before any DB work.

### **2. Running Migrations**
**NEVER** run `npx sequelize-cli db:migrate` directly.
```bash
# Run all UAT migrations
./scripts/run-migrations-master.sh uat

# Run all Staging migrations
./scripts/run-migrations-master.sh staging
```

---

## 🔄 **GIT WORKFLOW (MANDATORY)**

To maintain environment sync, follow this exact sequence:

1.  **Local Development**: Work on local machine (`/Users/andremacbookpro/mymoolah/`).
2.  **Commit Locally**: `git add . && git commit -m "[description]"`
3.  **Push to GitHub**: `git push origin main` (User manually pushes).
4.  **Pull in Codespaces**: `git pull origin main` (In Codespaces environment).
5.  **Test in Codespaces**: **MANDATORY** - Never test critical features locally.
6.  **Deploy to Staging**: Build and deploy from Codespaces.

See `docs/git-sync-workflow.md` for detailed sync procedures.

---

## 🏗️ **PRODUCT CATALOG ARCHITECTURE**

The platform uses a **sophisticated multi-supplier product catalog system** that automatically handles supplier selection based on commission rates and availability.

### **Automatic Supplier Selection Algorithm**
1. **Commission Rate Priority**: Higher commission rates preferred.
2. **Availability**: Supplier must have stock/availability.
3. **Performance**: Historical success rate of supplier.
4. **Cost**: Lowest cost to user while maximizing commission.

---

## 🔒 **SECURITY STANDARDS**

- **TLS 1.3**: Enforced for all production-like environments.
- **JWT HS512**: Used for secure authentication with short expiry.
- **Optimistic Locking**: Prevents race conditions in high-volume transactions.
- **PII Protection**: Phone numbers must be encrypted at rest (AES-256-GCM).
- **Audit Logging**: Immutable audit trails for all financial operations.

---

## 🧪 **TESTING STRATEGY**

- **Requirement**: **ALWAYS** test in Codespaces. Local tests are for rapid iteration only.
- **Coverage**: Aim for >90% code coverage.
- **Reconciliation**: Run `npm test -- tests/reconciliation.test.js`.
- **OTP System**: Test via `scripts/test-otp-flow.js`.

---

## 📚 **RESOURCES**

- **API Reference**: `docs/API_DOCUMENTATION.md`
- **Security Guide**: `docs/SECURITY.md`
- **Performance Guide**: `docs/PERFORMANCE.md`
- **Database Guide**: `docs/DATABASE_CONNECTION_GUIDE.md`
- **Testing Guide**: `docs/TESTING_GUIDE.md`

---

*This guide is the single source of truth for MMTP development. Maintain it after every major change.*
