-- Rate limiting tables for enhanced security

-- User-based rate limiting
CREATE TABLE IF NOT EXISTS rate_limit_user (
    id BIGSERIAL PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    endpoint TEXT NOT NULL,
    timestamp BIGINT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- IP-based rate limiting (backup protection)
CREATE TABLE IF NOT EXISTS rate_limit_ip (
    id BIGSERIAL PRIMARY KEY,
    ip_address INET NOT NULL,
    endpoint TEXT NOT NULL,
    timestamp BIGINT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Rate limit violations for progressive backoff
CREATE TABLE IF NOT EXISTS rate_limit_violations (
    id BIGSERIAL PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    endpoint TEXT NOT NULL,
    timestamp BIGINT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance (safe creation)
CREATE INDEX IF NOT EXISTS idx_rate_limit_user_lookup ON rate_limit_user(user_id, endpoint, timestamp);
CREATE INDEX IF NOT EXISTS idx_rate_limit_user_cleanup ON rate_limit_user(timestamp);

CREATE INDEX IF NOT EXISTS idx_rate_limit_ip_lookup ON rate_limit_ip(ip_address, endpoint, timestamp);
CREATE INDEX IF NOT EXISTS idx_rate_limit_ip_cleanup ON rate_limit_ip(timestamp);

CREATE INDEX IF NOT EXISTS idx_rate_limit_violations_lookup ON rate_limit_violations(user_id, endpoint, timestamp);
CREATE INDEX IF NOT EXISTS idx_rate_limit_violations_cleanup ON rate_limit_violations(timestamp);

-- RLS policies - Allow authenticated users to access their own data
ALTER TABLE rate_limit_user ENABLE ROW LEVEL SECURITY;
ALTER TABLE rate_limit_ip ENABLE ROW LEVEL SECURITY;
ALTER TABLE rate_limit_violations ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist to avoid conflicts
DROP POLICY IF EXISTS "Users can manage their own rate limits" ON rate_limit_user;
DROP POLICY IF EXISTS "Service role access" ON rate_limit_user;
DROP POLICY IF EXISTS "Service role access" ON rate_limit_ip;
DROP POLICY IF EXISTS "Service role access" ON rate_limit_violations;

-- Users can only access their own rate limiting data
CREATE POLICY "Users can manage their own rate limits" ON rate_limit_user
    FOR ALL USING (auth.uid() = user_id);

-- Service role can still access all data for maintenance
CREATE POLICY "Service role access" ON rate_limit_user
    FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role access" ON rate_limit_ip
    FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role access" ON rate_limit_violations
    FOR ALL USING (auth.role() = 'service_role');

-- Automatic cleanup function for old rate limiting entries
CREATE OR REPLACE FUNCTION cleanup_rate_limit_entries()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Keep only last 24 hours of data
    DELETE FROM rate_limit_user WHERE timestamp < EXTRACT(EPOCH FROM NOW() - INTERVAL '24 hours') * 1000;
    DELETE FROM rate_limit_ip WHERE timestamp < EXTRACT(EPOCH FROM NOW() - INTERVAL '24 hours') * 1000;
    -- Keep violations for 7 days for progressive backoff
    DELETE FROM rate_limit_violations WHERE timestamp < EXTRACT(EPOCH FROM NOW() - INTERVAL '7 days') * 1000;
END;
$$;

-- Schedule cleanup to run every hour (if pg_cron is available)
-- SELECT cron.schedule('cleanup-rate-limits', '0 * * * *', 'SELECT cleanup_rate_limit_entries();');