-- Manual SQL Script for Adding Tier Columns to Users Table
-- Run this as a database administrator if migration fails due to permissions
-- 
-- Usage: psql -h <host> -U <admin_user> -d mymoolah -f 20251114_add_tier_to_users_manual.sql

BEGIN;

-- Add tier_level column
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS tier_level VARCHAR(20) NOT NULL DEFAULT 'bronze';

COMMENT ON COLUMN users.tier_level IS 'User tier: bronze, silver, gold, platinum';

-- Add tier_effective_from timestamp
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS tier_effective_from TIMESTAMP DEFAULT NOW();

COMMENT ON COLUMN users.tier_effective_from IS 'When current tier became effective';

-- Add tier_last_reviewed_at timestamp
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS tier_last_reviewed_at TIMESTAMP;

COMMENT ON COLUMN users.tier_last_reviewed_at IS 'Last time tier was reviewed (monthly process)';

-- Create index on tier_level for performance
CREATE INDEX IF NOT EXISTS idx_users_tier_level ON users(tier_level);

-- Add constraint to ensure valid tier values
ALTER TABLE users 
DROP CONSTRAINT IF EXISTS check_users_tier_level;

ALTER TABLE users 
ADD CONSTRAINT check_users_tier_level 
CHECK (tier_level IN ('bronze', 'silver', 'gold', 'platinum'));

-- Set all existing users to bronze tier
UPDATE users 
SET tier_level = 'bronze', 
    tier_effective_from = NOW(),
    tier_last_reviewed_at = NOW()
WHERE tier_level IS NULL OR tier_level = '';

-- Create initial history records for existing users
INSERT INTO user_tier_history (user_id, old_tier, new_tier, change_reason, effective_from, created_at)
SELECT 
  id,
  NULL,
  'bronze',
  'initial_migration',
  NOW(),
  NOW()
FROM users
WHERE NOT EXISTS (
  SELECT 1 FROM user_tier_history WHERE user_tier_history.user_id = users.id
);

COMMIT;

-- Verify the changes
SELECT 
  column_name, 
  data_type, 
  column_default,
  is_nullable
FROM information_schema.columns 
WHERE table_name = 'users' 
  AND column_name IN ('tier_level', 'tier_effective_from', 'tier_last_reviewed_at')
ORDER BY column_name;

