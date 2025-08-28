-- Remove CASCADE DELETE constraint from api_usage table
-- This allows user deletion while preserving cost tracking data for business purposes
-- The user_id becomes an orphaned reference which is GDPR compliant as UUIDs are not personal data

-- First, find and drop the existing foreign key constraint
DO $$
DECLARE
    constraint_name TEXT;
BEGIN
    -- Find the constraint name for the user_id foreign key
    SELECT conname INTO constraint_name
    FROM pg_constraint c
    JOIN pg_class t ON c.conrelid = t.oid
    JOIN pg_attribute a ON a.attrelid = t.oid AND a.attnum = ANY(c.conkey)
    WHERE t.relname = 'api_usage' 
    AND a.attname = 'user_id'
    AND c.contype = 'f'; -- foreign key constraint
    
    -- Drop the constraint if it exists
    IF constraint_name IS NOT NULL THEN
        EXECUTE 'ALTER TABLE api_usage DROP CONSTRAINT ' || constraint_name;
        RAISE NOTICE 'Dropped foreign key constraint: %', constraint_name;
    ELSE
        RAISE NOTICE 'No foreign key constraint found on api_usage.user_id';
    END IF;
END $$;

-- Keep the user_id column and index for cost analytics
-- The column remains as UUID type for grouping and analytics purposes
-- After user deletion, these become orphaned references (not personally identifiable)

-- Add comment to document the change
COMMENT ON COLUMN api_usage.user_id IS 'User identifier for cost analytics - orphaned reference after account deletion (GDPR compliant)';

-- Verify the index still exists for performance
CREATE INDEX IF NOT EXISTS idx_api_usage_user_id ON api_usage(user_id);