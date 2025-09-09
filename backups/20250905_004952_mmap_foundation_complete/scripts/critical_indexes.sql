-- ========================================
-- CRITICAL PERFORMANCE INDEXES FOR MYMOOLAH
-- Banking-Grade Database Optimization
-- ========================================
--
-- These indexes are CRITICAL for handling millions of transactions
-- Run with DBA privileges: psql $DATABASE_URL -f critical_indexes.sql
--

-- ========================================
-- TRANSACTIONS TABLE INDEXES (MOST CRITICAL)
-- ========================================

-- User-based transaction queries (most common)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_transactions_user_created 
ON transactions("userId", "createdAt" DESC);

-- Wallet-based transaction queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_transactions_wallet_created 
ON transactions("walletId", "createdAt" DESC);

-- Status-based filtering (for pending, completed, failed transactions)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_transactions_status_created 
ON transactions(status, "createdAt" DESC);

-- Transaction type filtering (airtime, voucher, transfer, etc.)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_transactions_type_created 
ON transactions(type, "createdAt" DESC);

-- Transaction ID for quick lookups
CREATE UNIQUE INDEX CONCURRENTLY IF NOT EXISTS idx_transactions_transaction_id 
ON transactions("transactionId");

-- ========================================
-- WALLETS TABLE INDEXES
-- ========================================

-- User wallet queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_wallets_user_status 
ON wallets("userId", status);

-- Active wallet balance queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_wallets_balance_active 
ON wallets(balance) WHERE status = 'active';

-- ========================================
-- USERS TABLE INDEXES
-- ========================================

-- Phone number lookups
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_phone_number 
ON users("phoneNumber") WHERE "phoneNumber" IS NOT NULL;

-- Account number lookups
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_account_number 
ON users("accountNumber") WHERE "accountNumber" IS NOT NULL;

-- KYC status queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_kyc_status 
ON users("kycStatus", "kycVerifiedAt" DESC);

-- ========================================
-- KYC TABLE INDEXES
-- ========================================

-- User KYC status queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_kyc_user_status 
ON kyc("userId", status);

-- KYC validation status queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_kyc_validation_status 
ON kyc("validationStatus", "createdAt" DESC);

-- ========================================
-- VOUCHERS TABLE INDEXES
-- ========================================

-- User voucher queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_vouchers_user_status_created 
ON vouchers("userId", status, "createdAt" DESC);

-- Expiring vouchers queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_vouchers_status_expires 
ON vouchers(status, "expiresAt");

-- ========================================
-- VAS TRANSACTIONS TABLE INDEXES
-- ========================================

-- User VAS transaction queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_vas_transactions_user_created 
ON vas_transactions("userId", "createdAt" DESC);

-- VAS transaction status queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_vas_transactions_status_created 
ON vas_transactions(status, "createdAt" DESC);

-- VAS transaction type queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_vas_transactions_type_created 
ON vas_transactions("vasType", "createdAt" DESC);

-- ========================================
-- FLASH TRANSACTIONS TABLE INDEXES
-- ========================================

-- Flash transaction status queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_flash_transactions_status_created 
ON flash_transactions(status, "createdAt" DESC);

-- Flash transaction reference queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_flash_transactions_reference 
ON flash_transactions("flashreference");

-- ========================================
-- NOTIFICATIONS TABLE INDEXES
-- ========================================

-- User notification queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_notifications_user_created 
ON notifications("userId", "createdAt" DESC);

-- Notification status queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_notifications_status_created 
ON notifications(status, "createdAt" DESC);

-- ========================================
-- SUPPORT INTERACTIONS TABLE INDEXES
-- ========================================

-- User support interaction queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_support_interactions_user_created 
ON support_interactions("userId", "createdAt" DESC);

-- Support ticket status queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_support_interactions_status_created 
ON support_interactions(status, "createdAt" DESC);

-- ========================================
-- FEEDBACK SUBMISSIONS TABLE INDEXES
-- ========================================

-- User feedback queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_feedback_submissions_user_created 
ON feedback_submissions("userId", "createdAt" DESC);

-- Feedback category queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_feedback_submissions_category_created 
ON feedback_submissions("categoryId", "createdAt" DESC);

-- ========================================
-- LEDGER ACCOUNTS TABLE INDEXES
-- ========================================

-- Account type queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_ledger_accounts_type_active 
ON ledger_accounts("accountType", "isActive");

-- Account code queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_ledger_accounts_code 
ON ledger_accounts("accountCode");

-- ========================================
-- JOURNAL ENTRIES TABLE INDEXES
-- ========================================

-- Journal entry date queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_journal_entries_date_created 
ON journal_entries("entryDate", "createdAt" DESC);

-- Journal entry status queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_journal_entries_status_created 
ON journal_entries(status, "createdAt" DESC);

-- ========================================
-- SETTLEMENTS TABLE INDEXES
-- ========================================

-- Settlement date queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_settlements_date_created 
ON settlements("settlementDate", "createdAt" DESC);

-- Settlement status queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_settlements_status_created 
ON settlements(status, "createdAt" DESC);

-- ========================================
-- COMPLIANCE RECORDS TABLE INDEXES
-- ========================================

-- Compliance record date queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_compliance_records_date_created 
ON compliance_records("recordDate", "createdAt" DESC);

-- Compliance record type queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_compliance_records_type_created 
ON compliance_records("recordType", "createdAt" DESC);

-- ========================================
-- PERFORMANCE OPTIMIZATION QUERIES
-- ========================================

-- Analyze table statistics for query optimization
ANALYZE transactions;
ANALYZE wallets;
ANALYZE users;
ANALYZE kyc;
ANALYZE vouchers;
ANALYZE vas_transactions;
ANALYZE flash_transactions;
ANALYZE notifications;
ANALYZE support_interactions;
ANALYZE feedback_submissions;
ANALYZE ledger_accounts;
ANALYZE journal_entries;
ANALYZE settlements;
ANALYZE compliance_records;

-- ========================================
-- INDEX VERIFICATION QUERIES
-- ========================================

-- Verify indexes were created successfully
SELECT 
    schemaname,
    tablename,
    indexname,
    indexdef
FROM pg_indexes 
WHERE tablename IN (
    'transactions', 'wallets', 'users', 'kyc', 'vouchers',
    'vas_transactions', 'flash_transactions', 'notifications',
    'support_interactions', 'feedback_submissions', 'ledger_accounts',
    'journal_entries', 'settlements', 'compliance_records'
) 
AND schemaname = 'public'
AND indexname LIKE 'idx_%'
ORDER BY tablename, indexname;

-- ========================================
-- PERFORMANCE MONITORING VIEWS
-- ========================================

-- Create view for slow query monitoring
CREATE OR REPLACE VIEW slow_queries AS
SELECT 
    query,
    calls,
    total_time,
    mean_time,
    rows
FROM pg_stat_statements 
WHERE mean_time > 100  -- Queries taking more than 100ms
ORDER BY mean_time DESC;

-- Create view for index usage statistics
CREATE OR REPLACE VIEW index_usage_stats AS
SELECT 
    schemaname,
    tablename,
    indexname,
    idx_scan,
    idx_tup_read,
    idx_tup_fetch
FROM pg_stat_user_indexes
ORDER BY idx_scan DESC;

-- ========================================
-- COMPLETION MESSAGE
-- ========================================

-- Display completion message
SELECT 'CRITICAL INDEXES CREATED SUCCESSFULLY' as status,
       'MyMoolah database is now optimized for millions of transactions' as message,
       CURRENT_TIMESTAMP as completed_at;
