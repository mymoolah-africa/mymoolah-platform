-- ========================================
-- DATA ARCHIVING STRATEGY FOR MYMOOLAH
-- Implements hot/warm/cold storage tiers
-- ========================================

-- ========================================
-- ARCHIVE TABLES CREATION
-- ========================================

-- Hot storage (3 months) - Keep in main tables
-- Warm storage (1 year) - Move to archive tables
-- Cold storage (7 years) - Move to cold storage tables
-- Delete after 10 years

-- Create warm storage tables
CREATE TABLE IF NOT EXISTS transactions_archive_warm (
    id INTEGER NOT NULL,
    "walletId" VARCHAR(255) NOT NULL,
    type VARCHAR(255) NOT NULL,
    amount NUMERIC(10,2) NOT NULL,
    description VARCHAR(255),
    status VARCHAR(255) DEFAULT 'pending',
    "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL,
    "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL,
    "userId" INTEGER,
    "transactionId" TEXT,
    fee NUMERIC(10,2) DEFAULT 0,
    currency TEXT DEFAULT 'ZAR',
    "senderWalletId" TEXT,
    "receiverWalletId" TEXT,
    "paymentId" INTEGER,
    "exchangeRate" NUMERIC(10,6),
    "failureReason" TEXT,
    archived_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create cold storage tables
CREATE TABLE IF NOT EXISTS transactions_archive_cold (
    id INTEGER NOT NULL,
    "walletId" VARCHAR(255) NOT NULL,
    type VARCHAR(255) NOT NULL,
    amount NUMERIC(10,2) NOT NULL,
    description VARCHAR(255),
    status VARCHAR(255) DEFAULT 'pending',
    "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL,
    "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL,
    "userId" INTEGER,
    "transactionId" TEXT,
    fee NUMERIC(10,2) DEFAULT 0,
    currency TEXT DEFAULT 'ZAR',
    "senderWalletId" TEXT,
    "receiverWalletId" TEXT,
    "paymentId" INTEGER,
    "exchangeRate" NUMERIC(10,6),
    "failureReason" TEXT,
    archived_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create VAS archive tables
CREATE TABLE IF NOT EXISTS vas_transactions_archive_warm (
    id INTEGER NOT NULL,
    "transactionId" VARCHAR(255) NOT NULL,
    "userId" INTEGER NOT NULL,
    "walletId" INTEGER NOT NULL,
    "vasProductId" INTEGER NOT NULL,
    "supplierId" VARCHAR(50) NOT NULL,
    "vasType" VARCHAR(50) NOT NULL,
    "transactionType" VARCHAR(50) NOT NULL,
    amount INTEGER NOT NULL,
    fee INTEGER DEFAULT 0,
    "totalAmount" INTEGER NOT NULL,
    "recipientNumber" VARCHAR(20),
    "accountNumber" VARCHAR(50),
    "meterNumber" VARCHAR(50),
    "voucherPin" VARCHAR(255),
    "voucherSerial" VARCHAR(255),
    status VARCHAR(50) DEFAULT 'pending',
    "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL,
    "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL,
    archived_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS vas_transactions_archive_cold (
    id INTEGER NOT NULL,
    "transactionId" VARCHAR(255) NOT NULL,
    "userId" INTEGER NOT NULL,
    "walletId" INTEGER NOT NULL,
    "vasProductId" INTEGER NOT NULL,
    "supplierId" VARCHAR(50) NOT NULL,
    "vasType" VARCHAR(50) NOT NULL,
    "transactionType" VARCHAR(50) NOT NULL,
    amount INTEGER NOT NULL,
    fee INTEGER DEFAULT 0,
    "totalAmount" INTEGER NOT NULL,
    "recipientNumber" VARCHAR(20),
    "accountNumber" VARCHAR(50),
    "meterNumber" VARCHAR(50),
    "voucherPin" VARCHAR(255),
    "voucherSerial" VARCHAR(255),
    status VARCHAR(50) DEFAULT 'pending',
    "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL,
    "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL,
    archived_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ========================================
-- ARCHIVING FUNCTIONS
-- ========================================

-- Function to archive old transactions to warm storage
CREATE OR REPLACE FUNCTION archive_transactions_to_warm()
RETURNS INTEGER AS $$
DECLARE
    archived_count INTEGER;
BEGIN
    -- Move transactions older than 3 months to warm storage
    INSERT INTO transactions_archive_warm
    SELECT *, CURRENT_TIMESTAMP as archived_at
    FROM transactions
    WHERE "createdAt" < CURRENT_DATE - INTERVAL '3 months'
    AND "createdAt" >= CURRENT_DATE - INTERVAL '1 year';
    
    GET DIAGNOSTICS archived_count = ROW_COUNT;
    
    -- Delete archived transactions from main table
    DELETE FROM transactions
    WHERE "createdAt" < CURRENT_DATE - INTERVAL '3 months'
    AND "createdAt" >= CURRENT_DATE - INTERVAL '1 year';
    
    RAISE NOTICE 'Archived % transactions to warm storage', archived_count;
    RETURN archived_count;
END;
$$ LANGUAGE plpgsql;

-- Function to archive warm transactions to cold storage
CREATE OR REPLACE FUNCTION archive_transactions_to_cold()
RETURNS INTEGER AS $$
DECLARE
    archived_count INTEGER;
BEGIN
    -- Move transactions older than 1 year to cold storage
    INSERT INTO transactions_archive_cold
    SELECT *, CURRENT_TIMESTAMP as archived_at
    FROM transactions_archive_warm
    WHERE "createdAt" < CURRENT_DATE - INTERVAL '1 year'
    AND "createdAt" >= CURRENT_DATE - INTERVAL '7 years';
    
    GET DIAGNOSTICS archived_count = ROW_COUNT;
    
    -- Delete archived transactions from warm storage
    DELETE FROM transactions_archive_warm
    WHERE "createdAt" < CURRENT_DATE - INTERVAL '1 year'
    AND "createdAt" >= CURRENT_DATE - INTERVAL '7 years';
    
    RAISE NOTICE 'Archived % transactions to cold storage', archived_count;
    RETURN archived_count;
END;
$$ LANGUAGE plpgsql;

-- Function to delete very old transactions
CREATE OR REPLACE FUNCTION delete_old_transactions()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    -- Delete transactions older than 10 years from cold storage
    DELETE FROM transactions_archive_cold
    WHERE "createdAt" < CURRENT_DATE - INTERVAL '10 years';
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    
    RAISE NOTICE 'Deleted % very old transactions', deleted_count;
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Function to archive VAS transactions
CREATE OR REPLACE FUNCTION archive_vas_transactions()
RETURNS INTEGER AS $$
DECLARE
    archived_count INTEGER;
BEGIN
    -- Move VAS transactions older than 3 months to warm storage
    INSERT INTO vas_transactions_archive_warm
    SELECT *, CURRENT_TIMESTAMP as archived_at
    FROM vas_transactions
    WHERE "createdAt" < CURRENT_DATE - INTERVAL '3 months'
    AND "createdAt" >= CURRENT_DATE - INTERVAL '1 year';
    
    GET DIAGNOSTICS archived_count = ROW_COUNT;
    
    -- Delete archived VAS transactions from main table
    DELETE FROM vas_transactions
    WHERE "createdAt" < CURRENT_DATE - INTERVAL '3 months'
    AND "createdAt" >= CURRENT_DATE - INTERVAL '1 year';
    
    RAISE NOTICE 'Archived % VAS transactions to warm storage', archived_count;
    RETURN archived_count;
END;
$$ LANGUAGE plpgsql;

-- ========================================
-- AUTOMATED ARCHIVING SCHEDULE
-- ========================================

-- Create a function to run all archiving operations
CREATE OR REPLACE FUNCTION run_archiving_operations()
RETURNS TEXT AS $$
DECLARE
    warm_count INTEGER;
    cold_count INTEGER;
    deleted_count INTEGER;
    vas_count INTEGER;
    result TEXT;
BEGIN
    -- Archive to warm storage
    SELECT archive_transactions_to_warm() INTO warm_count;
    
    -- Archive to cold storage
    SELECT archive_transactions_to_cold() INTO cold_count;
    
    -- Delete very old transactions
    SELECT delete_old_transactions() INTO deleted_count;
    
    -- Archive VAS transactions
    SELECT archive_vas_transactions() INTO vas_count;
    
    result := format('Archiving completed: %s to warm, %s to cold, %s deleted, %s VAS archived', 
                     warm_count, cold_count, deleted_count, vas_count);
    
    RAISE NOTICE '%', result;
    RETURN result;
END;
$$ LANGUAGE plpgsql;

-- ========================================
-- ARCHIVE QUERY FUNCTIONS
-- ========================================

-- Function to query transactions across all storage tiers
CREATE OR REPLACE FUNCTION get_transaction_history(
    p_user_id INTEGER,
    p_start_date DATE DEFAULT NULL,
    p_end_date DATE DEFAULT NULL
)
RETURNS TABLE (
    id INTEGER,
    "walletId" VARCHAR(255),
    type VARCHAR(255),
    amount NUMERIC(10,2),
    description VARCHAR(255),
    status VARCHAR(255),
    "createdAt" TIMESTAMP WITH TIME ZONE,
    storage_tier TEXT
) AS $$
BEGIN
    -- Query hot storage (main table)
    RETURN QUERY
    SELECT t.id, t."walletId", t.type, t.amount, t.description, t.status, t."createdAt", 'hot'::TEXT
    FROM transactions t
    WHERE t."userId" = p_user_id
    AND (p_start_date IS NULL OR t."createdAt" >= p_start_date)
    AND (p_end_date IS NULL OR t."createdAt" <= p_end_date);
    
    -- Query warm storage
    RETURN QUERY
    SELECT t.id, t."walletId", t.type, t.amount, t.description, t.status, t."createdAt", 'warm'::TEXT
    FROM transactions_archive_warm t
    WHERE t."userId" = p_user_id
    AND (p_start_date IS NULL OR t."createdAt" >= p_start_date)
    AND (p_end_date IS NULL OR t."createdAt" <= p_end_date);
    
    -- Query cold storage
    RETURN QUERY
    SELECT t.id, t."walletId", t.type, t.amount, t.description, t.status, t."createdAt", 'cold'::TEXT
    FROM transactions_archive_cold t
    WHERE t."userId" = p_user_id
    AND (p_start_date IS NULL OR t."createdAt" >= p_start_date)
    AND (p_end_date IS NULL OR t."createdAt" <= p_end_date);
END;
$$ LANGUAGE plpgsql;

-- ========================================
-- STORAGE USAGE MONITORING
-- ========================================

-- View for storage usage statistics
CREATE OR REPLACE VIEW storage_usage_stats AS
SELECT 
    'hot' as storage_tier,
    'transactions' as table_name,
    COUNT(*) as record_count,
    pg_size_pretty(pg_total_relation_size('transactions')) as table_size
FROM transactions
UNION ALL
SELECT 
    'warm' as storage_tier,
    'transactions_archive_warm' as table_name,
    COUNT(*) as record_count,
    pg_size_pretty(pg_total_relation_size('transactions_archive_warm')) as table_size
FROM transactions_archive_warm
UNION ALL
SELECT 
    'cold' as storage_tier,
    'transactions_archive_cold' as table_name,
    COUNT(*) as record_count,
    pg_size_pretty(pg_total_relation_size('transactions_archive_cold')) as table_size
FROM transactions_archive_cold;

-- ========================================
-- COMPLETION MESSAGE
-- ========================================

SELECT 
    'DATA ARCHIVING STRATEGY SETUP COMPLETE' as status,
    'Hot/warm/cold storage tiers implemented' as message,
    'Automated archiving functions created' as details,
    CURRENT_TIMESTAMP as completed_at;
