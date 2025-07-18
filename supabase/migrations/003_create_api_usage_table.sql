 -- Create API usage tracking table
  CREATE TABLE api_usage (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    endpoint TEXT NOT NULL,
    tokens_used INTEGER,
    cost_usd DECIMAL(10,4),
    timestamp TIMESTAMP DEFAULT NOW()
  );

  -- Create index for performance
  CREATE INDEX idx_api_usage_timestamp ON api_usage(timestamp);
  CREATE INDEX idx_api_usage_endpoint ON api_usage(endpoint);
