-- Extend api_usage table for comprehensive cost tracking
-- This migration adds columns for detailed OpenAI usage tracking per user

-- Add new columns to api_usage table
ALTER TABLE api_usage 
ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
ADD COLUMN IF NOT EXISTS model TEXT,
ADD COLUMN IF NOT EXISTS prompt_tokens INTEGER,
ADD COLUMN IF NOT EXISTS completion_tokens INTEGER,
ADD COLUMN IF NOT EXISTS calculated_cost DECIMAL(10,6);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_api_usage_user_id ON api_usage(user_id);
CREATE INDEX IF NOT EXISTS idx_api_usage_model ON api_usage(model);
CREATE INDEX IF NOT EXISTS idx_api_usage_timestamp_user ON api_usage(timestamp, user_id);
CREATE INDEX IF NOT EXISTS idx_api_usage_cost ON api_usage(calculated_cost);

-- Update RLS policies to include user-specific access
-- First, drop existing policies if they exist
DROP POLICY IF EXISTS "Public can read api_usage" ON api_usage;
DROP POLICY IF EXISTS "Public can insert api_usage" ON api_usage;

-- Create new policies for user-specific access
-- Allow users to read their own usage data
CREATE POLICY "Users can view own usage" ON api_usage
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Allow service role to read all usage data (for admin purposes)
CREATE POLICY "Service role can view all usage" ON api_usage
  FOR SELECT
  TO service_role
  USING (true);

-- Allow system to insert usage data (app needs to log usage)
CREATE POLICY "System can insert usage" ON api_usage
  FOR INSERT
  TO authenticated, anon
  WITH CHECK (true);

-- Allow service role to manage all usage data (for admin operations)
CREATE POLICY "Service role can manage usage" ON api_usage
  FOR ALL
  TO service_role
  USING (true);

-- Add comments to document the schema changes
COMMENT ON COLUMN api_usage.user_id IS 'References the user who made the API call';
COMMENT ON COLUMN api_usage.model IS 'OpenAI model used for the API call (e.g., gpt-4o-mini)';
COMMENT ON COLUMN api_usage.prompt_tokens IS 'Number of input tokens used in the request';
COMMENT ON COLUMN api_usage.completion_tokens IS 'Number of output tokens generated in the response';
COMMENT ON COLUMN api_usage.calculated_cost IS 'Calculated cost in USD based on token usage and model pricing';

-- Update table comment
COMMENT ON TABLE api_usage IS 'Tracks OpenAI API usage per user with detailed token counts and cost calculations for monitoring and outlier detection';