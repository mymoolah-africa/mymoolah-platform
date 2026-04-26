# MyMoolah Treasury Platform - Documentation Index

**Last Updated**: April 26, 2026  
**Project Status**: 🚀 **PRODUCTION LIVE - api-mm.mymoolah.africa, wallet.mymoolah.africa**  
**Version**: 3.0.1 - VAT pass-through accounting strategy  

For recent work, see [CHANGELOG.md](./CHANGELOG.md) and [AGENT_HANDOVER.md](./AGENT_HANDOVER.md). **Apr 26, 2026:** VAT pass-through accounting strategy formalised in [VAT_ACCOUNTING_STRATEGY.md](./VAT_ACCOUNTING_STRATEGY.md). MMTP records VAT control only on MMTP-owned revenue, markup, and commission; supplier, bank, client, and merchant pass-through fees post VAT-inclusive to clearing/payable accounts. Session log: [2026-04-26 VAT pass-through strategy](./session_logs/2026-04-26_1610_vat-pass-through-strategy.md). **Apr 25:** Wallet-to-bank payments activated for UAT. Bank payments default to **SBSA H2H EFT** with an **Instant Payment** toggle for existing PayShap RPP rails. New API: `POST /api/v1/wallet-bank-payments/quote` and `POST /api/v1/wallet-bank-payments/submit`. Migration `20260425110000_create_wallet_bank_payments_and_fee_policies.js` (fee policies + wallet-bank payment tracking + R2 EFT UAT fee) was hardened for partial reruns and confirmed successful in Codespaces for UAT and staging. Website SEO/content/FAQ/AI support belongs in the separate website project/Claude Code; MMTP docs here remain the source for secure APIs, MMAP integration, auth, audit, and backend/wallet services. **Apr 20:** [20-Cash-Withdrawal-Policy.md](./policies/20-Cash-Withdrawal-Policy.md) (POL-020 — Cash Withdrawal & Ring-Fencing of Own Funds). **Apr 16:** [WITHDRAWALS_COMPLIANCE_AND_KB.md](./WITHDRAWALS_COMPLIANCE_AND_KB.md). **Apr 5:** Chart of Accounts visual, electricity supplier comparison, ledger audit — [CHART_OF_ACCOUNTS.md](./CHART_OF_ACCOUNTS.md).

---

## 🎯 **PROJECT OVERVIEW**

MyMoolah is a **full Treasury Platform** (wallet + general ledger + integrations) built on **Mojaloop standards** and **ISO 20022 banking standards**. The platform is designed to handle **millions of transactions** with banking-grade security and performance.

### **🏆 ACHIEVEMENTS COMPLETED**
- ✅ **VAT pass-through accounting strategy** formalised and production RPP/RTP corrections applied
- ✅ **Wallet-to-bank EFT H2H UAT activation** with Instant Payment PayShap toggle
- ✅ **Wallet-bank EFT migration hardening** confirmed through UAT and staging Codespaces migration scripts
- ✅ **Banking-Grade Support Engine** with AI-powered assistance
- ✅ **Complete VAS Integration** (Flash, MobileMart, Peach Payments)
- ✅ **DTMercury Banking Integration** for external transfers
- ✅ **KYC System** with 3-tier verification
- ✅ **Database Optimization** for millions of transactions
- ✅ **Performance Monitoring Dashboard** with real-time metrics
- ✅ **High-Performance Caching** with Redis + Memory
- ✅ **Security Hardening** with banking-grade protection
- ✅ **Cash-Out Services Integration** with 3 new overlay services

---

## 📚 **CORE DOCUMENTATION**

### **🚀 Project Status & Roadmap**
- [**PROJECT_STATUS.md**](./PROJECT_STATUS.md) - Current project status and achievements
- [**AGENT_HANDOVER.md**](./AGENT_HANDOVER.md) - Agent handover, next priorities, operational context
- [**CHANGELOG.md**](./CHANGELOG.md) - Detailed change history and releases

### **🏗️ Architecture & Design**
- [**architecture.md**](./architecture.md) - System architecture overview
- [**BANKING_GRADE_ARCHITECTURE.md**](./BANKING_GRADE_ARCHITECTURE.md) - Banking-grade architecture details
- [**DOMAIN_MODEL.md**](./DOMAIN_MODEL.md) - Business domain model
- [**FIGMA_INTEGRATION_COMPLETE.md**](./FIGMA_INTEGRATION_COMPLETE.md) - Frontend integration workflow
- [**CHART_OF_ACCOUNTS.md**](./CHART_OF_ACCOUNTS.md) - Canonical Chart of Accounts (28 accounts, 15 journal templates, solvency rules)
- [**VAT_ACCOUNTING_STRATEGY.md**](./VAT_ACCOUNTING_STRATEGY.md) - Canonical VAT policy for MMTP revenue vs pass-through fees
- [**CHART_OF_ACCOUNTS_VISUAL.html**](./CHART_OF_ACCOUNTS_VISUAL.html) - Print-ready PDF/HTML Chart of Accounts
- [**SETTLEMENTS.md**](./SETTLEMENTS.md) - Float model and settlement architecture

### **💳 Cash-Out Services**
- [**Withdrawals — compliance & KB hub**](./WITHDRAWALS_COMPLIANCE_AND_KB.md) — TPPP / eeziCash legal characterisation, AML/monitoring, security logging, FAQ + RAG seeding (Apr 2026)
- [**TPPP withdrawal flow diagrams (HTML/PDF)**](./integrations/MyMoolah_TPPP_Withdrawal_Flow_Diagrams.html) — eeziCash, EasyPay, EFT, PayShap, VAS (Apr 2026)
- [**Cash-Out Overlay Services**](./CHANGELOG.md#-version-210---cash-out-services-integration-august-28-2025) - New cash-out overlay services integration
- [**TransactPage Integration**](./CHANGELOG.md#-frontend-integration) - Frontend integration details
- [**Navigation & Quick Access**](./CHANGELOG.md#-navigation-fixes) - Navigation and Quick Access Services updates

### **💾 Database & Performance**
- [**DATABASE_CONNECTION_GUIDE.md**](./DATABASE_CONNECTION_GUIDE.md) - Database connection and migration procedures
- [**PERFORMANCE_OPTIMIZATION_COMPLETE.md**](./PERFORMANCE_OPTIMIZATION_COMPLETE.md) - Performance optimization summary
- [**PERFORMANCE.md**](./PERFORMANCE.md) - Performance optimization strategies
- [**RECONCILIATION_QUICK_START.md**](./RECONCILIATION_QUICK_START.md) - Reconciliation system quick start
- [**RECONCILIATION_FRAMEWORK.md**](./RECONCILIATION_FRAMEWORK.md) - Full reconciliation architecture

---

## 🔧 **DEVELOPMENT GUIDES**

### **👨‍💻 Development & Setup**
- [**DEVELOPMENT_GUIDE.md**](./DEVELOPMENT_GUIDE.md) - Complete development guide (consolidated setup + onboarding)
- [**CURSOR_2.0_RULES_FINAL.md**](./CURSOR_2.0_RULES_FINAL.md) - Agent rules and workflow (MANDATORY for new agents)
- [**TESTING_GUIDE.md**](./TESTING_GUIDE.md) - Testing strategies and procedures
- [**DEPLOYMENT_GUIDE.md**](./DEPLOYMENT_GUIDE.md) - Production deployment guide

### **🔌 API & Integration**
- [**API_DOCUMENTATION.md**](./API_DOCUMENTATION.md) - Complete API reference
- [**MMTP_PARTNER_API_IMPLEMENTATION_PLAN.md**](./MMTP_PARTNER_API_IMPLEMENTATION_PLAN.md) - Partner API plan (sandbox: staging.mymoolah.africa)
- [**FIGMA_INTEGRATION_COMPLETE.md**](./FIGMA_INTEGRATION_COMPLETE.md) - Frontend integration; [FIGMA_API_WIRING](./archive/figma/FIGMA_API_WIRING.md) in archive
- [**mojaloop-integration.md**](./mojaloop-integration.md) - Mojaloop compliance details

---

## 🌐 **INTEGRATIONS & SERVICES**

### **💳 Payment Integrations**
- [**INTEGRATIONS_COMPLETE.md**](./INTEGRATIONS_COMPLETE.md) - Integration overview
- [**integrations/EasyPay_API_Integration_Guide.md**](./integrations/EasyPay_API_Integration_Guide.md) - EasyPay API
- [**integrations/PeachPayments.md**](./integrations/PeachPayments.md) - Peach Payments (archived)

### **📱 VAS & Mobile Services**
- [**FLASH_INTEGRATION_AUDIT_2026-02-01.md**](./FLASH_INTEGRATION_AUDIT_2026-02-01.md) - Flash VAS integration
- [**integrations/MobileMart_Integration_Guide.md**](./integrations/MobileMart_Integration_Guide.md) - MobileMart integration (unified guide)
- [**AIRTIME_DUMMY_DATA_SUMMARY.md**](./AIRTIME_DUMMY_DATA_SUMMARY.md) - VAS testing data

### **🤖 AI & Support Systems**
- [**AI_SUPPORT_SYSTEM.md**](./AI_SUPPORT_SYSTEM.md) - AI-powered support engine
- [**BANKING_GRADE_SUPPORT_SYSTEM.md**](./BANKING_GRADE_SUPPORT_SYSTEM.md) - Support system architecture
- [**VOICE_INPUT_SYSTEM.md**](./VOICE_INPUT_SYSTEM.md) - Voice input capabilities

---

## 🔒 **SECURITY & COMPLIANCE**

### **🛡️ Security Implementation**
- [**SECURITY.md**](./SECURITY.md) - Security overview, badge, certificate, token (consolidated)

### **📋 KYC & Compliance**
- [**KYC_SYSTEM.md**](./KYC_SYSTEM.md) - KYC verification system
- [**SANDBOX_BEST_PRACTICES.md**](./SANDBOX_BEST_PRACTICES.md) - Development best practices

---

## 📊 **OPERATIONS & MONITORING**

### **📈 Performance & Monitoring**
- [**CODEBASE_SWEEP_SYSTEM.md**](./CODEBASE_SWEEP_SYSTEM.md) - System monitoring tools
- [**POLLING_OPTIMIZATION.md**](./POLLING_OPTIMIZATION.md) - Polling optimization strategies
- [**SERVICES_CONSOLIDATION.md**](./SERVICES_CONSOLIDATION.md) - Service architecture

### **💼 Business Logic**
- [**VOUCHER_BUSINESS_LOGIC.md**](./VOUCHER_BUSINESS_LOGIC.md) - Voucher system logic
- [**SETTLEMENTS.md**](./SETTLEMENTS.md) - Settlement processing
- [**PRIORITIZED_TODO_LIST.md**](./PRIORITIZED_TODO_LIST.md) - Feature roadmap and priorities

---

## 🚀 **QUICK START**

### **For Developers**
1. Read [**CURSOR_2.0_RULES_FINAL.md**](./CURSOR_2.0_RULES_FINAL.md) (new agents: MANDATORY first)
2. Read [**DEVELOPMENT_GUIDE.md**](./DEVELOPMENT_GUIDE.md)
3. Review [**API_DOCUMENTATION.md**](./API_DOCUMENTATION.md)

### **For System Administrators**
1. Review [**DEPLOYMENT_GUIDE.md**](./DEPLOYMENT_GUIDE.md)
2. Check [**PERFORMANCE.md**](./PERFORMANCE.md)
3. Monitor via [**CODEBASE_SWEEP_SYSTEM.md**](./CODEBASE_SWEEP_SYSTEM.md)

### **For Business Users**
1. Review [**PROJECT_STATUS.md**](./PROJECT_STATUS.md)
2. Check [**CHANGELOG.md**](./CHANGELOG.md)
3. Review [**PRIORITIZED_TODO_LIST.md**](./PRIORITIZED_TODO_LIST.md)

---

## 📝 **DOCUMENTATION MAINTENANCE**

### **Last Updated**
- **Main Documentation**: February 21, 2026
- **Optimizations**: All 6 optimizations completed
- **Security**: Banking-grade security implemented
- **Performance**: Production-ready for millions of transactions

### **Documentation Standards**
- All documentation follows markdown format
- Regular updates with each major release
- Comprehensive coverage of all system components
- Banking-grade documentation quality

---

## 🎉 **CURRENT STATUS**

**🚀 PRODUCTION READY - ALL SYSTEMS OPTIMIZED**

Your MyMoolah Treasury Platform is now:
- ✅ **Performance Optimized** - Handles millions of transactions
- ✅ **Security Hardened** - Banking-grade protection
- ✅ **Fully Monitored** - Real-time performance tracking
- ✅ **Production Ready** - Deployable to production environment

**Next Steps**: Load testing, security auditing, and production deployment preparation.

---

*This documentation is maintained by the MyMoolah Development Team and updated with each major release.*
