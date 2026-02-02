# Zero Shortcuts Policy - MyMoolah Banking-Grade Standards

**Effective Date**: February 2, 2026  
**Policy Level**: CRITICAL - NON-NEGOTIABLE  
**Classification**: Engineering Standards

---

## POLICY STATEMENT

**ZERO TOLERANCE for shortcuts, workarounds, or "quick fixes" in MyMoolah codebase.**

MyMoolah Treasury Platform is a **global award-winning banking platform** operating under the highest security, compliance, and performance standards. Shortcuts and workarounds are **ABSOLUTELY FORBIDDEN** regardless of time pressure or perceived complexity.

---

## CORE PRINCIPLES

### 1. Banking-Grade Quality is NON-NEGOTIABLE

**Standard**: Every line of code must meet banking-grade standards
- Mojaloop ISO 20022 compliance
- SARB/FICA regulatory requirements
- PCI DSS-aligned security
- ACID transaction guarantees
- Proper data modeling

**No Exceptions**: Time constraints do NOT justify lowering quality

---

### 2. Proper Solutions Over Quick Fixes

**When encountering errors or limitations:**

**FORBIDDEN Responses:**
- "Let me use this other enum value as a workaround"
- "This works for now, we can fix it later"
- "Creating a migration is too complex"
- "The user won't notice this shortcut"
- "It's only a small compromise"

**REQUIRED Responses:**
- "I need to create a proper migration to fix the schema"
- "Let me implement this according to banking standards"
- "I'll add the missing enum value properly"
- "I'll update the data model to support this correctly"
- "I'll do this right even if it takes longer"

---

### 3. Examples of FORBIDDEN Shortcuts

**Example 1: Database Enum Values**
```javascript
// ❌ FORBIDDEN: Using wrong enum as workaround
vasType: 'voucher' // When it's actually a cash-out service

// ✅ REQUIRED: Create migration, add proper enum value
// 1. Create migration: 20260202_add_cash_out_to_vas_type_enum.js
// 2. Run migration in UAT and Staging
// 3. Use proper value: vasType: 'cash_out'
```

**Example 2: Missing Database Columns**
```javascript
// ❌ FORBIDDEN: Storing data in metadata as workaround
metadata: { shouldBeRealColumn: 'value' }

// ✅ REQUIRED: Create migration to add column
// 1. Create migration: ADD COLUMN properly
// 2. Update model definition
// 3. Use real column: realColumn: 'value'
```

**Example 3: Validation Errors**
```javascript
// ❌ FORBIDDEN: Disabling validation to make it work
validate: false // Quick fix to bypass error

// ✅ REQUIRED: Fix the underlying issue
// 1. Understand why validation fails
// 2. Fix data format or update validation rule properly
// 3. Ensure validation protects data integrity
```

**Example 4: Missing Features**
```javascript
// ❌ FORBIDDEN: Simulation/placeholder code in production path
if (PRODUCTION) {
  return { fake: 'data' }; // TODO: implement later
}

// ✅ REQUIRED: Full implementation or feature flag
if (FEATURE_ENABLED) {
  return await properImplementation();
} else {
  return error('Feature not available');
}
```

---

## WHY THIS MATTERS

### Regulatory Compliance
- SARB requires accurate transaction categorization
- FICA mandates proper audit trails
- Mojaloop standards demand semantic correctness
- ISO 20022 specifies proper data models

**Shortcuts can cause:**
- Regulatory violations
- Failed audits
- Compliance fines
- License revocation

---

### Data Integrity
- Banking systems depend on accurate data categorization
- Reports and reconciliation require proper categorization
- Analytics depend on semantic correctness
- Audit trails must be accurate

**Shortcuts create:**
- Inaccurate reports
- Reconciliation failures
- Analytics errors
- Audit trail confusion

---

### Security & Performance
- Proper data models enable optimized queries
- Correct indexes depend on proper categorization
- Security rules depend on accurate types
- Performance monitoring needs correct metrics

**Shortcuts cause:**
- Slow queries (can't optimize properly)
- Security gaps (wrong assumptions)
- Performance degradation
- Monitoring blind spots

---

### Future Extensibility
- Proper architecture enables easy feature additions
- Correct categorization allows targeted logic
- Clean models support future integrations
- Standards compliance enables global expansion

**Shortcuts create:**
- Technical debt
- Refactoring nightmares
- Integration difficulties
- Scaling problems

---

## REQUIRED PROCEDURE WHEN ENCOUNTERING ERRORS

### Step 1: STOP and Analyze
**DO NOT immediately implement a workaround**

Questions to ask:
- What is the ROOT CAUSE of this error?
- What is the PROPER solution?
- What banking standard applies here?
- What would a world-class banking platform do?

---

### Step 2: Implement Proper Solution
**Even if it takes longer**

Proper solutions include:
- Creating migrations for schema changes
- Adding enum values correctly
- Implementing missing features fully
- Updating data models properly
- Following established patterns

---

### Step 3: Document the Proper Approach
**Explain why the proper approach was chosen**

In commit messages and session logs:
- "Created migration to add cash_out enum (Mojaloop compliance)"
- "Implemented proper data model (regulatory requirement)"
- "Added missing column (data integrity)"

---

### Step 4: Verify Banking-Grade Quality
**Checklist before committing:**
- [ ] Semantically correct categorization
- [ ] Mojaloop/ISO 20022 compliant
- [ ] Regulatory requirements met
- [ ] No shortcuts or workarounds
- [ ] Proper migrations if schema changed
- [ ] Data integrity maintained
- [ ] Future-proof architecture

---

## ACCOUNTABILITY

**All AI Agents Must:**
- Read this policy at session start
- Confirm understanding explicitly
- Follow ZERO SHORTCUTS principle
- Be challenged by user if shortcuts detected
- Document proper solutions in session logs

**User Authority:**
- User can reject ANY solution using shortcuts
- User can require proper implementation
- User expects banking-grade quality ALWAYS
- User's standards are final

---

## REAL-WORLD EXAMPLE (February 2, 2026)

### What Happened (Mistake):
Agent encountered: `invalid input value for enum "cash_out"`

**Wrong Approach (What Agent Did):**
- Used `vasType: 'voucher'` as workaround
- Worked functionally but violated data integrity
- Quick fix without proper architecture

**Correct Approach (What Should Have Been Done):**
- Created migration: `20260202_add_cash_out_to_vas_type_enum.js`
- Added 'cash_out' to enum properly
- Used correct value: `vasType: 'cash_out'`
- Takes 15 minutes longer but architecturally correct

### Lesson Learned:
**Proper banking-grade solutions are ALWAYS worth the extra time.**

The 15 minutes saved with a shortcut created:
- Technical debt
- Data integrity issues
- Potential compliance violations
- Need for user correction

The 15 minutes spent on proper solution created:
- Compliant data model
- Accurate categorization
- Future-proof architecture
- Professional quality

---

## COMMITMENT

**MyMoolah Development Standards:**

"We build banking-grade software with the highest security, compliance, and performance standards. Shortcuts are forbidden. Proper solutions are required. Excellence is mandatory."

**Every agent must affirm:**
- "I will use proper banking-grade solutions"
- "I will create migrations when needed"
- "I will follow Mojaloop and ISO 20022 standards"
- "I will never compromise data integrity for convenience"
- "I will hold myself to award-winning platform standards"

---

**END OF POLICY**

This policy is permanent and applies to all current and future development work on MyMoolah Treasury Platform.
