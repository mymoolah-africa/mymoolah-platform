-- Manual SQL script to fix vas_transactions.supplierId ENUM issue
-- Run this script directly in the database
-- 
-- Usage: psql -h 127.0.0.1 -p 6543 -U mymoolah_app -d mymoolah -f 20250116_fix_vas_transactions_supplier_id_enum_manual.sql

-- Check current column type
SELECT 
    column_name, 
    data_type, 
    udt_name
FROM information_schema.columns 
WHERE table_name = 'vas_transactions' 
  AND column_name = 'supplierId';

-- Convert ENUM to TEXT first (to break enum constraint)
ALTER TABLE vas_transactions 
ALTER COLUMN "supplierId" TYPE TEXT USING "supplierId"::TEXT;

-- Then convert to VARCHAR(50)
ALTER TABLE vas_transactions 
ALTER COLUMN "supplierId" TYPE VARCHAR(50);

-- Verify the change
SELECT 
    column_name, 
    data_type, 
    udt_name
FROM information_schema.columns 
WHERE table_name = 'vas_transactions' 
  AND column_name = 'supplierId';

