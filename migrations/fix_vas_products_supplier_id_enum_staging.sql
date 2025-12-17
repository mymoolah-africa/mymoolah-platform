-- Manual SQL script to fix vas_products.supplierId ENUM constraint in staging
-- This converts the ENUM to VARCHAR(50) to allow any supplier code (FLASH, MOBILEMART, etc.)
-- 
-- USAGE:
-- Option 1: Run via migration script (recommended)
--   ./scripts/run-migrations-master.sh staging 20250116_fix_vas_products_supplier_id_enum
--
-- Option 2: Run SQL directly on staging database
--   1. Connect to staging: psql -h 127.0.0.1 -p 6544 -U mymoolah_app -d mymoolah_staging
--   2. Copy and paste the ALTER TABLE commands below
--
-- CRITICAL: This fixes the error: "invalid input value for enum enum_vas_products_supplierId: MOBILEMART"

-- Step 1: Check current column type (diagnostic - can skip)
SELECT 
    column_name, 
    data_type, 
    udt_name
FROM information_schema.columns 
WHERE table_name = 'vas_products' 
AND column_name = 'supplierId';

-- Step 2: Convert ENUM to TEXT first (to break enum constraint)
ALTER TABLE vas_products 
ALTER COLUMN "supplierId" TYPE TEXT USING "supplierId"::TEXT;

-- Step 3: Convert TEXT to VARCHAR(50) to match model definition
ALTER TABLE vas_products 
ALTER COLUMN "supplierId" TYPE VARCHAR(50);

-- Step 4: Verify the change (diagnostic - can skip)
SELECT 
    column_name, 
    data_type, 
    character_maximum_length
FROM information_schema.columns 
WHERE table_name = 'vas_products' 
AND column_name = 'supplierId';

-- Expected result: data_type should be 'character varying' and character_maximum_length should be 50

