-- Enable Row Level Security (RLS) for api_usage table
-- This migration addresses the security warning about RLS not being enabled

-- Enable RLS on the api_usage table
ALTER TABLE api_usage ENABLE ROW LEVEL SECURITY;

-- Create a policy that allows public read access to api_usage
-- This allows your application to read usage data without authentication
CREATE POLICY "Public can read api_usage" ON api_usage
  FOR SELECT
  TO public
  USING (true);

-- Create a policy that allows public insert access to api_usage
-- This allows your application to log API usage without authentication
CREATE POLICY "Public can insert api_usage" ON api_usage
  FOR INSERT
  TO public
  WITH CHECK (true);

-- Optional: Create a policy for service accounts to manage all data (for admin purposes)
-- Uncomment the following if you need admin access to update/delete usage data
-- CREATE POLICY "Service can manage api_usage" ON api_usage
--   FOR ALL
--   TO service_role
--   USING (true);

-- Add comment to document the security fix
COMMENT ON TABLE api_usage IS 'API usage tracking table with RLS enabled. Public access allowed for logging purposes.';
