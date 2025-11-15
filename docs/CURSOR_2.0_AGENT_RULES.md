# Cursor 2.0 Agent Rules - Top 10 Most Important Rules

**Last Updated**: November 14, 2025  
**Purpose**: Essential rules for Cursor 2.0 settings to ensure maximum accuracy and first-time fixes

---

## 🎯 **RULE 1: Git Workflow & Environment Synchronization**

**CRITICAL**: Always follow the Git sync workflow to keep local and Codespaces environments synchronized.

### **Local Development Workflow**:
1. **Before starting work**: `cd /Users/andremacbookpro/mymoolah && git pull origin main`
2. **After completing work**: 
   - `git add .`
   - `git commit -m "descriptive commit message"`
   - `git push origin main`

### **Codespaces Development Workflow**:
1. **Before starting work**: `cd /workspaces/mymoolah-platform && git pull origin main`
2. **After completing work**:
   - `git add .`
   - `git commit -m "descriptive commit message"`
   - `git push origin main`

### **Key Principles**:
- **GitHub is the source of truth** - Always pull before work, push after work
- **Never work with uncommitted changes** - Commit or stash before pulling
- **Always use explicit directory paths** in commands
- **Prefer Codespaces for cloud development** when applicable

---

## 🎯 **RULE 2: Agent Handover & Context Continuity**

**CRITICAL**: Every agent session must read and understand the agent handover documentation.

### **Required Reading at Session Start**:
1. **`docs/agent_handover.md`** - Current session status, recent changes, next priorities
2. **`docs/agent_role_template.md`** - Operating charter, constraints, and standards
3. **`docs/changelog.md`** - Recent changes and version history
4. **`docs/readme.md`** - Current system status and architecture overview

### **Session Continuity Requirements**:
- **Understand current priorities** from agent handover before making changes
- **Check for pending migrations** or incomplete work from previous sessions
- **Review recent changelog entries** to understand what was changed and why
- **Verify environment state** matches documentation before proceeding

### **Documentation Updates**:
- **Update `agent_handover.md`** at the end of each session with:
  - Task summary
  - Files changed
  - API/data model changes
  - Security notes
  - Tests added
  - Restart requirements
  - Next steps

---

## 🎯 **RULE 3: Working Directory & File Constraints**

**CRITICAL**: Strict constraints on where and what files can be modified.

### **Working Directory Rules**:
- **ONLY work in `/mymoolah/` and subdirectories** - Never at local root
- **Local paths**: `/Users/andremacbookpro/mymoolah/`
- **Codespaces paths**: `/workspaces/mymoolah-platform/`
- **Always use explicit directory paths** in all commands

### **File Modification Rules**:
- **NEVER edit Figma-managed pages** in `mymoolah-wallet-frontend/pages/*.tsx` - Treat as read-only API clients
- **NEVER modify `/Figma/` sources** - Adapt backend APIs to match Figma designs
- **Settings changes**: Only in new portal directories (`/portal/`), not in existing wallet directories
- **Admin portal pages**: Save in `/portal/admin/frontend/`, NOT in `/mymoolah-wallet-frontend/pages/`

### **Backend Adaptation Principle**:
- **Figma pages are read-only clients** - Adjust backend API contracts and adapters to match them
- **If contracts evolve**: Document diffs and provide compatibility shims as needed

---

## 🎯 **RULE 4: Definition of Done (DoD) - Every Task**

**CRITICAL**: Every task must meet the complete Definition of Done before being considered complete.

### **Complete DoD Checklist**:
- [ ] **Clean, maintainable code** with complete file contents and zero linter errors
- [ ] **Documentation updated** in `mymoolah/docs/` (API docs, changelog, runbook, audit notes)
- [ ] **Tests authored** (unit/integration/E2E as needed) with seed data and clear run instructions
- [ ] **Data model migrations** with safe rollbacks (forward and backward migrations)
- [ ] **Security review complete** with notable decisions recorded
- [ ] **Clear statement** whether a service restart is required
- [ ] **Changes committed and pushed** to GitHub with descriptive commit message
- [ ] **PR created** (if applicable) with concise summary and links

### **Additional Quality Checks**:
- **No hardcoded data** - Use real database transactions, not dummy data
- **Error handling** - Comprehensive error handling with proper status codes
- **Input validation** - All inputs validated and sanitized at API boundary
- **Logging** - Structured logging with correlation IDs and PII redaction

---

## 🎯 **RULE 5: Banking-Grade Security & Mojaloop Compliance**

**CRITICAL**: All code must follow banking-grade security standards and Mojaloop compliance.

### **Security Requirements**:
- **Input validation and sanitization** at the API boundary
- **Principle of least privilege** - Secret management guidance
- **JWT rotation/expiry** - HS512 algorithm, short expiry in production
- **Rate limiting** - Multi-tier rate limiting (general, auth, financial)
- **Structured logging** - Correlation IDs and PII redaction
- **Consistent error taxonomy** - Safe user messaging (no sensitive data exposure)
- **Audit trails** - Complete audit logging for all security events

### **Mojaloop Compliance**:
- **TLS 1.3** - Enforced for all connections
- **FSPIOP standards** - Follow Mojaloop FSPIOP standards
- **ISO 27001 ready** - Information security management compliance
- **Banking-grade headers** - Comprehensive security headers

### **Database Security**:
- **Parameterized queries** - Never use string concatenation for SQL
- **Connection pooling** - Proper connection management
- **Encryption** - AES-256-GCM for data at rest and in transit
- **Access control** - Role-based access control (RBAC)

---

## 🎯 **RULE 6: Documentation Requirements**

**CRITICAL**: All documentation must be kept current and comprehensive.

### **Documentation Update Requirements**:
- **Update ALL relevant docs** in `/mymoolah/docs/` after each change
- **Required documentation files**:
  - `agent_handover.md` - Session handover (updated every session)
  - `changelog.md` - Version history and changes
  - `readme.md` - System status and overview
  - `development_guide.md` - Development best practices
  - `security.md` - Security features and compliance
  - `performance.md` - Performance optimization
  - `banking_grade_architecture.md` - Architecture documentation

### **Documentation Quality Standards**:
- **Complete file contents** when sharing code in docs or reviews
- **Code examples** with proper formatting and context
- **API documentation** with request/response examples
- **Migration documentation** with rollback procedures
- **Testing documentation** with clear run instructions

### **Documentation Before Code Changes**:
- **Always check project documentation** before creating or modifying anything
- **Review relevant architecture docs** before making architectural changes
- **Check changelog** to understand recent changes and avoid conflicts

---

## 🎯 **RULE 7: Testing & Quality Assurance**

**CRITICAL**: All code must be tested and validated before completion.

### **Testing Requirements**:
- **Author new tests** alongside features (unit/integration/E2E as needed)
- **Provide sample `.env`** and seed data for testing
- **Clear run commands** for local and cloud environments
- **Test coverage** - Aim for >90% code coverage
- **Custom tests** - Author custom tests, don't rely on outdated scripts

### **Testing Best Practices**:
- **Test isolation** - Each test should be independent
- **Mock external dependencies** - Mock external services and APIs
- **Data cleanup** - Clean up test data after each test
- **Performance testing** - Test performance under load
- **Security testing** - Test security scenarios and edge cases

### **Ledger-Specific Testing**:
- **Invariants** - Debits == credits, no orphaned journal entries
- **Reconciliations** - All reconciliations must pass
- **Transaction integrity** - Verify transaction consistency

---

## 🎯 **RULE 8: Error Handling & Input Validation**

**CRITICAL**: Comprehensive error handling and input validation at all levels.

### **Error Handling Patterns**:
- **Structured error responses** - Consistent error format with status codes
- **Error taxonomy** - Standard error codes and messages
- **Safe user messaging** - No sensitive data in error messages
- **Transaction rollback** - All operations rolled back on error
- **ACID compliance** - Maintain database transaction integrity

### **Input Validation Requirements**:
- **API boundary validation** - Validate all inputs at API entry points
- **Sanitization** - Sanitize all user inputs
- **Type checking** - Validate data types and formats
- **Range validation** - Validate numeric ranges and limits
- **Required fields** - Validate required fields are present

### **Validation Middleware**:
- **Use validation middleware** for all API endpoints
- **Standard validation schemas** - Email, phone, amount, etc.
- **Custom validators** - Create custom validators for business logic
- **Error responses** - Return 400 Bad Request with detailed validation errors

---

## 🎯 **RULE 9: Performance & Database Optimization**

**CRITICAL**: Follow banking-grade performance standards and database optimization practices.

### **Performance Targets**:
- **API response times**: <200ms average
- **Database queries**: <50ms average
- **Throughput**: >1,000 req/s capacity
- **Availability**: 99.9% uptime target

### **Database Optimization Rules**:
- **NEVER calculate sums in JavaScript** - Use database aggregation functions (COUNT, SUM, etc.)
- **Use database views** for complex aggregations
- **Proper indexing** - All foreign keys and frequently queried columns indexed
- **Connection pooling** - Use connection pooling for database efficiency
- **Single optimized queries** - Use JOINs instead of multiple queries
- **Materialized views** - Use for complex aggregations that don't change frequently

### **Caching Strategy**:
- **Redis caching** - Cache frequently accessed data
- **Intelligent cache invalidation** - Invalidate cache on data changes
- **Multi-layer caching** - Memory cache (L1) + Redis (L2) + Database (L3)

---

## 🎯 **RULE 10: Communication Style & User Preferences**

**CRITICAL**: Follow user communication preferences and maintain professional, patient communication.

### **Communication Style**:
- **Address user as "André"** - Use first name only, not full name
- **Patient, step-by-step** - Non-technical explanations where possible
- **Small, rollback-safe increments** - Break work into manageable pieces
- **Explicit next steps** - Always provide clear next steps

### **User Preferences**:
- **Real transactions only** - No hardcoded dummy data in development
- **Simple balance lookups** - Use caching or direct database queries, not costly AI calls
- **AI usage** - Use OpenAI once to build reference base, only for deeper research
- **Notify before changes** - Notify user before making backend code changes for review
- **Don't change working functionality** - When fixing one issue, don't break another

### **Approval Requirements**:
- **Explicit approval** - Obtain explicit approval before performing operations or destructive actions
- **Code review** - User prefers to review and run changes themselves
- **No server control** - Do not start/stop user servers; only indicate when restarts are required

---

## 📋 **QUICK REFERENCE CHECKLIST**

Before starting any work:
- [ ] Read `agent_handover.md` and `changelog.md`
- [ ] Pull latest changes: `git pull origin main`
- [ ] Check for pending migrations or incomplete work
- [ ] Review relevant documentation

During work:
- [ ] Work only in `/mymoolah/` directory
- [ ] Follow banking-grade security standards
- [ ] Validate all inputs at API boundary
- [ ] Use database aggregation, not JavaScript calculations
- [ ] Write tests alongside features

After completing work:
- [ ] Update all relevant documentation
- [ ] Run tests and verify zero linter errors
- [ ] Commit with descriptive message
- [ ] Push to GitHub: `git push origin main`
- [ ] Update `agent_handover.md` with session summary

---

## 🚨 **CRITICAL REMINDERS**

1. **GitHub is source of truth** - Always pull before work, push after work
2. **Documentation is mandatory** - Update docs after every change
3. **Security is non-negotiable** - Banking-grade standards always
4. **Tests are required** - No code without tests
5. **User approval required** - Get explicit approval for destructive actions
6. **No dummy data** - Use real database transactions
7. **Database-first** - Use SQL aggregation, not JavaScript calculations
8. **Figma pages read-only** - Adapt backend, not frontend
9. **Small increments** - Rollback-safe, manageable changes
10. **Communication matters** - Patient, clear, step-by-step explanations

---

**🎯 These rules ensure maximum accuracy, first-time fixes, and consistent high-quality development practices.**

