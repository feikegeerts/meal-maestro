-- Remove personal data columns from deletion_requests table for GDPR compliance
-- These columns contain personal data that should not be stored in audit records

-- Drop user_email column (contains personal data - GDPR violation)
ALTER TABLE deletion_requests DROP COLUMN IF EXISTS user_email;

-- Drop confirmation_phrase column (could contain personal data like email address)
ALTER TABLE deletion_requests DROP COLUMN IF EXISTS confirmation_phrase;

-- Update table comment to reflect GDPR compliance
COMMENT ON TABLE deletion_requests IS 'GDPR-compliant audit trail for account deletion requests - contains no personal data, only non-identifiable UUIDs and metadata';

-- Add comment explaining the change
COMMENT ON COLUMN deletion_requests.user_id IS 'User UUID - becomes orphaned reference after deletion (non-personal identifier, GDPR compliant)';