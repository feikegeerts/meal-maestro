-- Create deletion audit table for GDPR compliance
-- Tracks account deletion requests and completion status for audit trail

CREATE TABLE IF NOT EXISTS deletion_requests (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL, -- Will reference deleted user's ID for audit purposes
  user_email TEXT NOT NULL, -- Keep email for audit trail (minimal data)
  request_timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  completion_timestamp TIMESTAMP WITH TIME ZONE,
  data_deleted JSONB, -- Track what tables/records were removed
  error_details TEXT,
  requested_by_user BOOLEAN DEFAULT true, -- vs admin deletion
  confirmation_phrase TEXT NOT NULL -- What user typed to confirm deletion
);

-- Create indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_deletion_requests_user_id ON deletion_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_deletion_requests_status ON deletion_requests(status);
CREATE INDEX IF NOT EXISTS idx_deletion_requests_timestamp ON deletion_requests(request_timestamp);

-- Enable Row Level Security
ALTER TABLE deletion_requests ENABLE ROW LEVEL SECURITY;

-- Policy: Admins can view all deletion requests
CREATE POLICY "Admins can view all deletion requests"
  ON deletion_requests
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE id = auth.uid() 
      AND role = 'admin'
    )
  );

-- Policy: Service role can manage all deletion requests (for API operations)
CREATE POLICY "Service role can manage deletion requests"
  ON deletion_requests
  FOR ALL
  TO service_role
  USING (true);

-- Add trigger to update completion timestamp when status changes to completed
CREATE OR REPLACE FUNCTION update_deletion_completion_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'completed' AND OLD.status != 'completed' THEN
    NEW.completion_timestamp = NOW();
  END IF;
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_deletion_completion_timestamp
  BEFORE UPDATE ON deletion_requests
  FOR EACH ROW EXECUTE FUNCTION update_deletion_completion_timestamp();

-- Add comments for documentation
COMMENT ON TABLE deletion_requests IS 'Audit trail for GDPR account deletion requests and their processing status';
COMMENT ON COLUMN deletion_requests.user_id IS 'Original user ID - becomes orphaned reference after user deletion';
COMMENT ON COLUMN deletion_requests.user_email IS 'User email kept for audit purposes only';
COMMENT ON COLUMN deletion_requests.data_deleted IS 'JSON object tracking which tables and record counts were deleted';
COMMENT ON COLUMN deletion_requests.confirmation_phrase IS 'Exact phrase user typed to confirm deletion (e.g., "delete my account")';