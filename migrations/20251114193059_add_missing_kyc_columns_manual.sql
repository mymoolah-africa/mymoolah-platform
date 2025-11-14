-- Manual SQL script to add missing KYC table columns
-- Run this script with database administrator privileges
-- 
-- Usage: psql -h <host> -U <admin_user> -d <database> -f 20251114193059_add_missing_kyc_columns_manual.sql

-- Add documentImageUrl column
ALTER TABLE kyc ADD COLUMN IF NOT EXISTS "documentImageUrl" VARCHAR(255);

-- Add ocrData column (for storing OCR extracted data)
ALTER TABLE kyc ADD COLUMN IF NOT EXISTS "ocrData" JSONB;

-- Add reviewedBy column
ALTER TABLE kyc ADD COLUMN IF NOT EXISTS "reviewedBy" VARCHAR(255);

-- Add rejectionReason column
ALTER TABLE kyc ADD COLUMN IF NOT EXISTS "rejectionReason" TEXT;

-- Add verificationScore column
ALTER TABLE kyc ADD COLUMN IF NOT EXISTS "verificationScore" DECIMAL(3, 2);

-- Add isAutomated column
ALTER TABLE kyc ADD COLUMN IF NOT EXISTS "isAutomated" BOOLEAN DEFAULT FALSE;

-- Create ENUM types if they don't exist
DO $$ 
BEGIN
  -- Create status ENUM type
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'enum_kyc_status') THEN
    CREATE TYPE enum_kyc_status AS ENUM ('pending', 'approved', 'rejected', 'under_review');
  END IF;
  
  -- Create documentType ENUM type
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'enum_kyc_document_type') THEN
    CREATE TYPE enum_kyc_document_type AS ENUM ('id_card', 'passport', 'drivers_license', 'utility_bill', 'bank_statement');
  END IF;
END $$;

-- Update status column to use ENUM (if it's currently VARCHAR)
-- Note: This will only work if the column is currently VARCHAR/TEXT
-- If it's already an ENUM, this will fail gracefully
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_name = 'kyc' 
      AND column_name = 'status' 
      AND data_type = 'character varying'
  ) THEN
    -- Convert VARCHAR to ENUM
    ALTER TABLE kyc 
    ALTER COLUMN status TYPE enum_kyc_status 
    USING status::text::enum_kyc_status;
  END IF;
END $$;

-- Update documentType column to use ENUM (if it's currently VARCHAR)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_name = 'kyc' 
      AND column_name = 'documentType' 
      AND data_type = 'character varying'
  ) THEN
    -- Convert VARCHAR to ENUM
    ALTER TABLE kyc 
    ALTER COLUMN "documentType" TYPE enum_kyc_document_type 
    USING "documentType"::text::enum_kyc_document_type;
  END IF;
END $$;

-- Verify columns were added
SELECT 
  column_name, 
  data_type, 
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_name = 'kyc' 
  AND column_name IN ('documentImageUrl', 'ocrData', 'reviewedBy', 'rejectionReason', 'verificationScore', 'isAutomated')
ORDER BY column_name;

