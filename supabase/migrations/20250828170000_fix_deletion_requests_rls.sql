-- Fix deletion_requests RLS policies to allow authenticated users to manage their own requests
-- This enables secure frontend API operations without service role exposure

-- Policy: Users can insert their own deletion requests
CREATE POLICY "Users can insert their own deletion requests"
  ON deletion_requests
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Policy: Users can view their own deletion requests  
CREATE POLICY "Users can view their own deletion requests"
  ON deletion_requests
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Policy: Users can update their own deletion requests (for status changes)
CREATE POLICY "Users can update their own deletion requests"
  ON deletion_requests
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Note: Existing admin and service role policies remain for management purposes