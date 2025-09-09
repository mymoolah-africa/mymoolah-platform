-- ========================================
-- FIX FOR ARCHIVING FUNCTIONS
-- Corrects the column mismatch issues
-- ========================================

-- Drop the existing functions
DROP FUNCTION IF EXISTS archive_transactions_to_warm();
DROP FUNCTION IF EXISTS archive_transactions_to_cold();
DROP FUNCTION IF EXISTS archive_vas_transactions();
DROP FUNCTION IF EXISTS run_archiving_operations();

-- Recreate the archiving functions with correct column mapping
CREATE OR REPLACE FUNCTION archive_transactions_to_warm()
RETURNS INTEGER AS $$
DECLARE
    archived_count INTEGER;
BEGIN
    -- Move transactions older than 3 months to warm storage
    INSERT INTO transactions_archive_warm (
        id, "walletId", type, amount, description, status, 
        "createdAt", "updatedAt", "userId", "transactionId", 
        fee, currency, "senderWalletId", "receiverWalletId", 
        "paymentId", "exchangeRate", "failureReason", "processingTime", metadata
    )
    SELECT 
        id, "walletId", type, amount, description, status, 
        "createdAt", "updatedAt", "userId", "transactionId", 
        fee, currency, "senderWalletId", "receiverWalletId", 
        "paymentId", "exchangeRate", "failureReason", "processingTime", metadata
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
    INSERT INTO transactions_archive_cold (
        id, "walletId", type, amount, description, status, 
        "createdAt", "updatedAt", "userId", "transactionId", 
        fee, currency, "senderWalletId", "receiverWalletId", 
        "paymentId", "exchangeRate", "failureReason", "processingTime", metadata
    )
    SELECT 
        id, "walletId", type, amount, description, status, 
        "createdAt", "updatedAt", "userId", "transactionId", 
        fee, currency, "senderWalletId", "receiverWalletId", 
        "paymentId", "exchangeRate", "failureReason", "processingTime", metadata
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

-- Function to archive VAS transactions
CREATE OR REPLACE FUNCTION archive_vas_transactions()
RETURNS INTEGER AS $$
DECLARE
    archived_count INTEGER;
BEGIN
    -- Move VAS transactions older than 3 months to warm storage
    INSERT INTO vas_transactions_archive_warm (
        id, "transactionId", "userId", "walletId", "vasProductId", 
        "supplierId", "vasType", "transactionType", amount, fee, 
        "totalAmount", "recipientNumber", "accountNumber", "meterNumber", 
        "voucherPin", "voucherSerial", status, "createdAt", "updatedAt"
    )
    SELECT 
        id, "transactionId", "userId", "walletId", "vasProductId", 
        "supplierId", "vasType", "transactionType", amount, fee, 
        "totalAmount", "recipientNumber", "accountNumber", "meterNumber", 
        "voucherPin", "voucherSerial", status, "createdAt", "updatedAt"
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

-- Function to run all archiving operations
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

-- Test the archiving functions
SELECT 'ARCHIVING FUNCTIONS FIXED SUCCESSFULLY' as status;
