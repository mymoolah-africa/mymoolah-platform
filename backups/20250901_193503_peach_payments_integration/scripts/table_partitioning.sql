-- ========================================
-- TABLE PARTITIONING STRATEGY FOR MYMOOLAH
-- Optimizes performance for millions of transactions
-- ========================================

-- ========================================
-- TRANSACTIONS TABLE PARTITIONING
-- ========================================

-- Create partitioned table for transactions
CREATE TABLE IF NOT EXISTS transactions_partitioned (
    id INTEGER NOT NULL,
    "walletId" VARCHAR(255) NOT NULL,
    type VARCHAR(255) NOT NULL,
    amount NUMERIC(10,2) NOT NULL,
    description VARCHAR(255),
    status VARCHAR(255) DEFAULT 'pending',
    "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "userId" INTEGER,
    "transactionId" TEXT,
    fee NUMERIC(10,2) DEFAULT 0,
    currency TEXT DEFAULT 'ZAR',
    "senderWalletId" TEXT,
    "receiverWalletId" TEXT,
    "paymentId" INTEGER,
    "exchangeRate" NUMERIC(10,6),
    "failureReason" TEXT
) PARTITION BY RANGE ("createdAt");

-- Create partitions for 2025 (monthly)
CREATE TABLE IF NOT EXISTS transactions_2025_01 PARTITION OF transactions_partitioned
FOR VALUES FROM ('2025-01-01') TO ('2025-02-01');

CREATE TABLE IF NOT EXISTS transactions_2025_02 PARTITION OF transactions_partitioned
FOR VALUES FROM ('2025-02-01') TO ('2025-03-01');

CREATE TABLE IF NOT EXISTS transactions_2025_03 PARTITION OF transactions_partitioned
FOR VALUES FROM ('2025-03-01') TO ('2025-04-01');

CREATE TABLE IF NOT EXISTS transactions_2025_04 PARTITION OF transactions_partitioned
FOR VALUES FROM ('2025-04-01') TO ('2025-05-01');

CREATE TABLE IF NOT EXISTS transactions_2025_05 PARTITION OF transactions_partitioned
FOR VALUES FROM ('2025-05-01') TO ('2025-06-01');

CREATE TABLE IF NOT EXISTS transactions_2025_06 PARTITION OF transactions_partitioned
FOR VALUES FROM ('2025-06-01') TO ('2025-07-01');

CREATE TABLE IF NOT EXISTS transactions_2025_07 PARTITION OF transactions_partitioned
FOR VALUES FROM ('2025-07-01') TO ('2025-08-01');

CREATE TABLE IF NOT EXISTS transactions_2025_08 PARTITION OF transactions_partitioned
FOR VALUES FROM ('2025-08-01') TO ('2025-09-01');

CREATE TABLE IF NOT EXISTS transactions_2025_09 PARTITION OF transactions_partitioned
FOR VALUES FROM ('2025-09-01') TO ('2025-10-01');

CREATE TABLE IF NOT EXISTS transactions_2025_10 PARTITION OF transactions_partitioned
FOR VALUES FROM ('2025-10-01') TO ('2025-11-01');

CREATE TABLE IF NOT EXISTS transactions_2025_11 PARTITION OF transactions_partitioned
FOR VALUES FROM ('2025-11-01') TO ('2025-12-01');

CREATE TABLE IF NOT EXISTS transactions_2025_12 PARTITION OF transactions_partitioned
FOR VALUES FROM ('2025-12-01') TO ('2026-01-01');

-- Create indexes on partitioned table
CREATE INDEX idx_transactions_partitioned_user_created ON transactions_partitioned ("userId", "createdAt" DESC);
CREATE INDEX idx_transactions_partitioned_wallet_created ON transactions_partitioned ("walletId", "createdAt" DESC);
CREATE INDEX idx_transactions_partitioned_status_created ON transactions_partitioned (status, "createdAt" DESC);
CREATE INDEX idx_transactions_partitioned_type_created ON transactions_partitioned (type, "createdAt" DESC);

-- ========================================
-- VAS TRANSACTIONS TABLE PARTITIONING
-- ========================================

-- Create partitioned table for VAS transactions
CREATE TABLE IF NOT EXISTS vas_transactions_partitioned (
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
    "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
) PARTITION BY RANGE ("createdAt");

-- Create partitions for 2025 (monthly)
CREATE TABLE IF NOT EXISTS vas_transactions_2025_01 PARTITION OF vas_transactions_partitioned
FOR VALUES FROM ('2025-01-01') TO ('2025-02-01');

CREATE TABLE IF NOT EXISTS vas_transactions_2025_02 PARTITION OF vas_transactions_partitioned
FOR VALUES FROM ('2025-02-01') TO ('2025-03-01');

CREATE TABLE IF NOT EXISTS vas_transactions_2025_03 PARTITION OF vas_transactions_partitioned
FOR VALUES FROM ('2025-03-01') TO ('2025-04-01');

CREATE TABLE IF NOT EXISTS vas_transactions_2025_04 PARTITION OF vas_transactions_partitioned
FOR VALUES FROM ('2025-04-01') TO ('2025-05-01');

CREATE TABLE IF NOT EXISTS vas_transactions_2025_05 PARTITION OF vas_transactions_partitioned
FOR VALUES FROM ('2025-05-01') TO ('2025-06-01');

CREATE TABLE IF NOT EXISTS vas_transactions_2025_06 PARTITION OF vas_transactions_partitioned
FOR VALUES FROM ('2025-06-01') TO ('2025-07-01');

CREATE TABLE IF NOT EXISTS vas_transactions_2025_07 PARTITION OF vas_transactions_partitioned
FOR VALUES FROM ('2025-07-01') TO ('2025-08-01');

CREATE TABLE IF NOT EXISTS vas_transactions_2025_08 PARTITION OF vas_transactions_partitioned
FOR VALUES FROM ('2025-08-01') TO ('2025-09-01');

CREATE TABLE IF NOT EXISTS vas_transactions_2025_09 PARTITION OF vas_transactions_partitioned
FOR VALUES FROM ('2025-09-01') TO ('2025-10-01');

CREATE TABLE IF NOT EXISTS vas_transactions_2025_10 PARTITION OF vas_transactions_partitioned
FOR VALUES FROM ('2025-10-01') TO ('2025-11-01');

CREATE TABLE IF NOT EXISTS vas_transactions_2025_11 PARTITION OF vas_transactions_partitioned
FOR VALUES FROM ('2025-11-01') TO ('2025-12-01');

CREATE TABLE IF NOT EXISTS vas_transactions_2025_12 PARTITION OF vas_transactions_partitioned
FOR VALUES FROM ('2025-12-01') TO ('2026-01-01');

-- Create indexes on partitioned VAS table
CREATE INDEX idx_vas_transactions_partitioned_user_created ON vas_transactions_partitioned ("userId", "createdAt" DESC);
CREATE INDEX idx_vas_transactions_partitioned_status_created ON vas_transactions_partitioned (status, "createdAt" DESC);
CREATE INDEX idx_vas_transactions_partitioned_type_created ON vas_transactions_partitioned ("vasType", "createdAt" DESC);

-- ========================================
-- DATA MIGRATION STRATEGY
-- ========================================

-- Function to migrate data from old tables to partitioned tables
CREATE OR REPLACE FUNCTION migrate_to_partitioned_tables()
RETURNS void AS $$
BEGIN
    -- Migrate transactions data
    INSERT INTO transactions_partitioned 
    SELECT * FROM transactions 
    WHERE "createdAt" >= '2025-01-01';
    
    -- Migrate VAS transactions data
    INSERT INTO vas_transactions_partitioned 
    SELECT * FROM vas_transactions 
    WHERE "createdAt" >= '2025-01-01';
    
    RAISE NOTICE 'Data migration completed successfully';
END;
$$ LANGUAGE plpgsql;

-- ========================================
-- PARTITION MAINTENANCE
-- ========================================

-- Function to create new partitions automatically
CREATE OR REPLACE FUNCTION create_monthly_partition(table_name TEXT, year INTEGER, month INTEGER)
RETURNS void AS $$
DECLARE
    partition_name TEXT;
    start_date DATE;
    end_date DATE;
BEGIN
    partition_name := table_name || '_' || year || '_' || LPAD(month::TEXT, 2, '0');
    start_date := DATE(year || '-' || LPAD(month::TEXT, 2, '0') || '-01');
    end_date := start_date + INTERVAL '1 month';
    
    EXECUTE format('CREATE TABLE IF NOT EXISTS %I PARTITION OF %I FOR VALUES FROM (%L) TO (%L)',
                   partition_name, table_name, start_date, end_date);
    
    RAISE NOTICE 'Created partition % for %', partition_name, table_name;
END;
$$ LANGUAGE plpgsql;

-- ========================================
-- PERFORMANCE MONITORING VIEWS
-- ========================================

-- View for partition usage statistics
CREATE OR REPLACE VIEW partition_usage_stats AS
SELECT 
    schemaname,
    tablename,
    attname,
    n_distinct,
    correlation
FROM pg_stats 
WHERE tablename LIKE '%_2025_%'
ORDER BY tablename, attname;

-- View for partition sizes
CREATE OR REPLACE VIEW partition_sizes AS
SELECT 
    schemaname,
    tablename,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size
FROM pg_tables 
WHERE tablename LIKE '%_2025_%'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;

-- ========================================
-- COMPLETION MESSAGE
-- ========================================

SELECT 
    'TABLE PARTITIONING SETUP COMPLETE' as status,
    'Monthly partitions created for transactions and VAS transactions' as message,
    'Performance optimized for millions of transactions' as details,
    CURRENT_TIMESTAMP as completed_at;
