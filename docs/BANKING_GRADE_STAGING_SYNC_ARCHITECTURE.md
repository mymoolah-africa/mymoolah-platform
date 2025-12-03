# 🏦 Banking-Grade Staging Sync Architecture

**Last Updated**: December 3, 2025  
**Version**: 1.0.0 - Banking-Grade Implementation  
**Status**: ✅ **DESIGN COMPLETE** - Ready for Implementation

---

## 🎯 Executive Summary

This document defines the **100% banking-grade, Mojaloop-aligned, secure, high-performance database synchronization system** between UAT and Staging databases. The system ensures:

- ✅ **100% Schema Identity**: UAT, Staging, and Production schemas are identical
- ✅ **ACID Compliance**: All sync operations are transactional with rollback capability
- ✅ **Complete Audit Trails**: Every operation logged with Mojaloop-compliant structured logging
- ✅ **High Performance**: Batch operations, optimized queries, connection pooling
- ✅ **Banking-Grade Security**: Encryption, access control, integrity verification
- ✅ **Mojaloop FSPIOP Compliance**: Structured logging, traceability, correlation IDs

---

## 🏗️ Architecture Overview

### **Three-Layer Sync System**

```
┌─────────────────────────────────────────────────────────────┐
│  Layer 1: Schema Synchronization (Structure)                │
│  - Migrations execution with ACID transactions              │
│  - Schema verification and validation                       │
│  - Constraint and index synchronization                     │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│  Layer 2: Data Integrity Verification (Content)             │
│  - Critical table verification                              │
│  - Data integrity checks (debits == credits)                │
│  - Referential integrity validation                         │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│  Layer 3: Audit & Compliance (Governance)                   │
│  - Complete audit trail (Mojaloop-compliant)                │
│  - Rollback capability                                      │
│  - Performance metrics and monitoring                       │
└─────────────────────────────────────────────────────────────┘
```

---

## 🔐 Banking-Grade Security Requirements

### **1. ACID Transaction Compliance**

**Requirement**: All sync operations must be transactional with rollback capability

**Implementation**:
- ✅ Single database transaction per sync operation
- ✅ Automatic rollback on any error
- ✅ Savepoint support for complex operations
- ✅ Deadlock detection and retry logic
- ✅ Connection-level transaction isolation

**PostgreSQL Configuration**:
```javascript
{
  isolationLevel: 'READ COMMITTED',  // Banking-grade isolation
  readOnly: false,
  autoCommit: false,  // Manual transaction control
  statement_timeout: 300000,  // 5-minute timeout
  query_timeout: 60000,  // 1-minute query timeout
}
```

### **2. Complete Audit Trail (Mojaloop FSPIOP)**

**Requirement**: Every sync operation must be logged with structured, Mojaloop-compliant audit trail

**Audit Log Schema**:
```sql
CREATE TABLE sync_audit_logs (
  id SERIAL PRIMARY KEY,
  sync_id UUID NOT NULL,  -- Correlation ID for entire sync operation
  operation_id UUID NOT NULL,  -- Unique ID for each operation
  operation_type VARCHAR(50) NOT NULL,  -- MIGRATION, SCHEMA_CHECK, DATA_VERIFY
  source_env VARCHAR(20) NOT NULL,  -- UAT
  target_env VARCHAR(20) NOT NULL,  -- STAGING
  status VARCHAR(20) NOT NULL,  -- SUCCESS, FAILED, ROLLED_BACK
  started_at TIMESTAMP WITH TIME ZONE NOT NULL,
  completed_at TIMESTAMP WITH TIME ZONE,
  duration_ms INTEGER,
  migration_name VARCHAR(255),
  schema_changes JSONB,  -- Structured schema differences
  error_details JSONB,  -- Structured error information
  rollback_available BOOLEAN DEFAULT false,
  rollback_executed_at TIMESTAMP WITH TIME ZONE,
  performed_by VARCHAR(255),  -- User/service account
  ip_address INET,
  user_agent TEXT,
  metadata JSONB  -- Additional context
);

-- Indexes for performance
CREATE INDEX idx_sync_audit_sync_id ON sync_audit_logs(sync_id);
CREATE INDEX idx_sync_audit_status ON sync_audit_logs(status);
CREATE INDEX idx_sync_audit_operation_type ON sync_audit_logs(operation_type);
CREATE INDEX idx_sync_audit_started_at ON sync_audit_logs(started_at);
```

**Mojaloop-Compliant Logging Format**:
```javascript
{
  "traceId": "uuid",  // Mojaloop trace ID
  "spanId": "uuid",   // Mojaloop span ID
  "timestamp": "ISO8601",
  "level": "INFO|WARN|ERROR",
  "service": "database-sync",
  "operation": "schema-sync",
  "source": {
    "environment": "UAT",
    "database": "mymoolah",
    "instance": "mmtp-pg"
  },
  "target": {
    "environment": "STAGING",
    "database": "mymoolah_staging",
    "instance": "mmtp-pg-staging"
  },
  "result": {
    "status": "SUCCESS|FAILED",
    "migrationsExecuted": 5,
    "schemaChanges": {...},
    "durationMs": 1234
  },
  "security": {
    "userId": "service-account",
    "ipAddress": "127.0.0.1",
    "authenticationMethod": "gcloud-iam"
  }
}
```

### **3. Encryption & Access Control**

**At Rest**:
- ✅ Database connections use TLS 1.3 (via Cloud SQL Auth Proxy)
- ✅ Passwords encrypted in Google Secret Manager (AES-256)
- ✅ Audit logs encrypted at rest

**In Transit**:
- ✅ Cloud SQL Auth Proxy provides TLS 1.3 encryption
- ✅ All communication over encrypted channels
- ✅ No plaintext passwords in logs or commands

**Access Control**:
- ✅ Service account-based authentication (no human credentials)
- ✅ Least privilege IAM roles
- ✅ Audit logging for all secret access
- ✅ IP allowlisting for database access

### **4. Data Integrity Verification**

**Ledger Integrity** (Banking-Grade):
```sql
-- Verify debits == credits (double-entry bookkeeping)
SELECT 
  SUM(CASE WHEN type = 'debit' THEN amount ELSE 0 END) as total_debits,
  SUM(CASE WHEN type = 'credit' THEN amount ELSE 0 END) as total_credits,
  ABS(SUM(CASE WHEN type = 'debit' THEN amount ELSE -amount END)) as imbalance
FROM transactions
WHERE created_at >= (SELECT MAX(synced_at) FROM sync_checkpoints);

-- Must be: imbalance = 0 (perfect balance)
```

**Referential Integrity**:
- ✅ Foreign key constraints verified before/after sync
- ✅ Orphaned records detection
- ✅ Circular dependency detection
- ✅ Constraint violation prevention

---

## ⚡ High-Performance Requirements

### **1. Batch Operations**

**Migration Batching**:
- Execute migrations in batches of 5-10 (configurable)
- Parallel execution where possible (non-dependent migrations)
- Sequential execution for dependent migrations
- Connection pool reuse for all operations

**Query Optimization**:
- Single query for schema comparison (not multiple queries)
- Database-level aggregation (not JavaScript calculations)
- Bulk operations for data verification
- Prepared statements for all queries

### **2. Connection Pooling**

**Configuration**:
```javascript
{
  max: 20,           // Maximum connections
  min: 5,            // Minimum connections
  idle: 10000,       // Idle timeout (10 seconds)
  acquire: 30000,    // Acquire timeout (30 seconds)
  evict: 1000,       // Eviction interval (1 second)
  handleDisconnects: true
}
```

**Performance Targets**:
- ✅ API Response Time: <200ms
- ✅ Database Query Time: <50ms
- ✅ Throughput: >1,000 operations/second
- ✅ Sync Duration: <5 minutes for full schema sync
- ✅ Availability: 99.9% uptime

### **3. Intelligent Caching**

**Schema Metadata Caching**:
- Cache schema information for 5 minutes
- Invalidate on schema changes
- Reduce redundant INFORMATION_SCHEMA queries

**Migration Status Caching**:
- Cache migration execution status
- Real-time updates during sync
- Persist cache across sync runs

---

## 🔄 Sync Workflow (Banking-Grade)

### **Phase 1: Pre-Sync Validation**

1. **Environment Verification**
   - ✅ Verify both databases are accessible
   - ✅ Verify credentials are valid
   - ✅ Verify proxies are running
   - ✅ Verify network connectivity

2. **Pre-Sync Checks**
   - ✅ Check for active transactions (prevent conflicts)
   - ✅ Verify database versions match
   - ✅ Check for locks on critical tables
   - ✅ Verify backup exists (before destructive operations)

3. **Audit Log Initialization**
   - ✅ Create sync session ID (UUID)
   - ✅ Log sync start with Mojaloop headers
   - ✅ Create audit log entry

### **Phase 2: Schema Synchronization**

1. **Migration Analysis**
   - ✅ Identify missing migrations (UAT → Staging)
   - ✅ Detect migration dependencies
   - ✅ Order migrations by dependency
   - ✅ Validate migration files integrity

2. **Transaction-Based Execution**
   ```javascript
   BEGIN TRANSACTION;
     SAVEPOINT before_migration;
     -- Execute migration
     -- If success: RELEASE SAVEPOINT
     -- If error: ROLLBACK TO SAVEPOINT
   COMMIT;  // Only if all migrations succeed
   ```

3. **Rollback Capability**
   - ✅ Each migration creates a savepoint
   - ✅ Automatic rollback on failure
   - ✅ Manual rollback via audit log
   - ✅ Rollback scripts generated automatically

### **Phase 3: Schema Verification**

1. **Comprehensive Schema Comparison**
   - ✅ Table existence and structure
   - ✅ Column types and constraints
   - ✅ Indexes and foreign keys
   - ✅ Functions, triggers, views
   - ✅ Enum types and custom types

2. **Critical Table Validation**
   - ✅ `users`, `wallets`, `transactions`
   - ✅ `beneficiaries`, `payment_requests`
   - ✅ Ledger integrity (debits == credits)
   - ✅ Referential integrity

### **Phase 4: Post-Sync Verification**

1. **Data Integrity Checks**
   - ✅ Ledger balance verification
   - ✅ Foreign key integrity
   - ✅ Constraint compliance
   - ✅ Orphaned record detection

2. **Performance Verification**
   - ✅ Query performance benchmarks
   - ✅ Index effectiveness
   - ✅ Connection pool health
   - ✅ Resource usage monitoring

3. **Audit Trail Completion**
   - ✅ Log sync completion
   - ✅ Generate sync report
   - ✅ Archive audit logs
   - ✅ Notify stakeholders

---

## 📊 Mojaloop FSPIOP Compliance

### **Structured Logging Requirements**

**FSPIOP Headers** (for audit logs):
```javascript
{
  "FSPIOP-Source": "mymoolah-sync-service",
  "FSPIOP-Destination": "staging-database",
  "FSPIOP-Signature": "signature",
  "Date": "RFC7231-date",
  "Content-Type": "application/json",
  "X-Request-ID": "uuid",
  "X-Correlation-ID": "uuid",
  "X-Forwarded-For": "ip-address"
}
```

**Traceability**:
- ✅ Correlation IDs for entire sync operation
- ✅ Span IDs for each sub-operation
- ✅ Parent-child relationship tracking
- ✅ End-to-end traceability

**Log Retention**:
- ✅ 90 days online (hot storage)
- ✅ 1 year archived (cold storage)
- ✅ 7 years compliance archive
- ✅ GDPR/POPIA compliant (PII redaction)

---

## 🚀 Performance Optimization

### **1. Parallel Operations**

**Independent Migrations**:
- Execute non-dependent migrations in parallel
- Maximum 5 concurrent migrations
- Dependency graph analysis for optimal ordering

**Schema Comparison**:
- Parallel queries for UAT and Staging
- Concurrent table structure analysis
- Batch comparison of multiple tables

### **2. Query Optimization**

**Schema Comparison Query**:
```sql
-- Single query gets all schema information
SELECT 
  t.table_name,
  c.column_name,
  c.data_type,
  c.is_nullable,
  c.column_default,
  c.character_maximum_length,
  k.constraint_name,
  k.constraint_type
FROM information_schema.tables t
LEFT JOIN information_schema.columns c ON t.table_name = c.table_name
LEFT JOIN information_schema.table_constraints k ON t.table_name = k.table_name
WHERE t.table_schema = 'public'
  AND t.table_type = 'BASE TABLE'
ORDER BY t.table_name, c.ordinal_position;
```

**Batch Migration Execution**:
- Single transaction for multiple migrations
- Reduced connection overhead
- Faster overall execution

### **3. Caching Strategy**

**L1 Cache (Memory)**:
- Schema metadata (5-minute TTL)
- Migration status (real-time updates)
- Connection pool metadata

**L2 Cache (Redis)** - Optional:
- Schema comparison results (1-hour TTL)
- Migration dependency graphs
- Performance metrics

---

## 🔄 Rollback & Recovery

### **Rollback Mechanisms**

1. **Transaction Rollback**
   - Automatic rollback on error
   - Savepoint-based granular rollback
   - Full transaction rollback for critical failures

2. **Migration Rollback**
   - Reverse migration scripts (where available)
   - Manual rollback via audit log
   - Database state restoration from backup

3. **Schema Rollback**
   - Revert schema changes via reverse migrations
   - Restore from schema snapshot
   - Point-in-time recovery (if enabled)

### **Recovery Procedures**

1. **Automatic Recovery**
   - Retry failed operations (3 attempts)
   - Exponential backoff (1s, 2s, 4s)
   - Deadlock detection and retry

2. **Manual Recovery**
   - Rollback via audit log UUID
   - Restore from backup
   - Manual schema correction

---

## 📋 Implementation Checklist

### **Phase 1: Core Infrastructure** ✅
- [x] ACID transaction support
- [x] Audit log table creation
- [x] Structured logging framework
- [x] Connection pooling configuration

### **Phase 2: Sync Engine** 🔄
- [ ] Enhanced sync script with banking-grade features
- [ ] Migration dependency analysis
- [ ] Batch operation support
- [ ] Rollback capability

### **Phase 3: Verification** 📅
- [ ] Comprehensive schema comparison
- [ ] Data integrity verification
- [ ] Ledger balance checks
- [ ] Performance benchmarking

### **Phase 4: Monitoring** 📅
- [ ] Real-time sync status dashboard
- [ ] Performance metrics collection
- [ ] Alert system for failures
- [ ] Compliance reporting

---

## 🎯 Success Criteria

**Banking-Grade Sync is Successful When**:

1. ✅ **Schema Identity**: 100% schema match (tables, columns, constraints, indexes)
2. ✅ **ACID Compliance**: All operations transactional with rollback capability
3. ✅ **Complete Audit Trail**: Every operation logged with Mojaloop-compliant format
4. ✅ **High Performance**: Sync completes in <5 minutes for full schema sync
5. ✅ **Data Integrity**: All ledger balances verified (debits == credits)
6. ✅ **Zero Downtime**: Sync doesn't disrupt production operations
7. ✅ **Mojaloop Compliance**: Structured logging, traceability, correlation IDs
8. ✅ **Security**: Encryption at rest/transit, access control, audit logging

---

## 📚 Related Documentation

- `docs/STAGING_SYNC_GUIDE.md` - Current sync guide
- `docs/BANKING_GRADE_ARCHITECTURE.md` - Banking-grade architecture principles
- `docs/SECURITY.md` - Security standards and compliance
- `docs/DEVELOPMENT_DEPLOYMENT_WORKFLOW.md` - Database schema identity policy

---

**Next Steps**: Implement enhanced sync script with all banking-grade features
