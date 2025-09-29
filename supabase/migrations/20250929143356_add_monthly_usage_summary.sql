-- Monthly usage aggregation and alert logging

CREATE TABLE IF NOT EXISTS monthly_usage_summary (
    user_id UUID NOT NULL,
    month_start DATE NOT NULL,
    total_cost NUMERIC(12,4) NOT NULL DEFAULT 0,
    total_tokens BIGINT NOT NULL DEFAULT 0,
    total_calls INTEGER NOT NULL DEFAULT 0,
    warning_email_sent_at TIMESTAMP WITH TIME ZONE,
    limit_email_sent_at TIMESTAMP WITH TIME ZONE,
    rate_limit_email_sent_at TIMESTAMP WITH TIME ZONE,
    limit_enforced_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    PRIMARY KEY (user_id, month_start)
);

ALTER TABLE monthly_usage_summary ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS usage_alert_events (
    id BIGSERIAL PRIMARY KEY,
    user_id UUID NOT NULL,
    month_start DATE NOT NULL,
    alert_type TEXT NOT NULL,
    alert_level TEXT NOT NULL,
    details JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_monthly_usage_summary_month ON monthly_usage_summary(month_start);
CREATE INDEX IF NOT EXISTS idx_monthly_usage_summary_alerts ON monthly_usage_summary(limit_enforced_at, warning_email_sent_at, limit_email_sent_at);
CREATE INDEX IF NOT EXISTS idx_usage_alert_events_user ON usage_alert_events(user_id, month_start);
CREATE INDEX IF NOT EXISTS idx_usage_alert_events_type ON usage_alert_events(alert_type, alert_level, created_at);

COMMENT ON TABLE monthly_usage_summary IS 'Per-user monthly aggregation of AI usage cost/tokens including alert state.';
COMMENT ON TABLE usage_alert_events IS 'Audit trail of spend/rate-limit alerts dispatched to admins.';

-- Maintain updated_at automatically
DROP TRIGGER IF EXISTS set_timestamp_monthly_usage ON monthly_usage_summary;
CREATE TRIGGER set_timestamp_monthly_usage
BEFORE UPDATE ON monthly_usage_summary
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Upsert helper for logging usage
CREATE OR REPLACE FUNCTION increment_monthly_usage_summary(
  p_user_id UUID,
  p_cost NUMERIC,
  p_tokens BIGINT,
  p_call_time TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  p_calls INTEGER DEFAULT 1
) RETURNS monthly_usage_summary
LANGUAGE plpgsql
AS $$
DECLARE
  v_month_start DATE;
  v_result monthly_usage_summary%ROWTYPE;
BEGIN
  IF p_user_id IS NULL THEN
    RAISE EXCEPTION 'user_id is required';
  END IF;

  v_month_start := DATE_TRUNC('month', COALESCE(p_call_time, NOW()))::DATE;

  INSERT INTO monthly_usage_summary (user_id, month_start, total_cost, total_tokens, total_calls)
  VALUES (p_user_id, v_month_start, GREATEST(p_cost, 0), GREATEST(p_tokens, 0), GREATEST(p_calls, 0))
  ON CONFLICT (user_id, month_start)
  DO UPDATE SET
    total_cost = monthly_usage_summary.total_cost + GREATEST(EXCLUDED.total_cost, 0),
    total_tokens = monthly_usage_summary.total_tokens + GREATEST(EXCLUDED.total_tokens, 0),
    total_calls = monthly_usage_summary.total_calls + GREATEST(EXCLUDED.total_calls, 0),
    updated_at = NOW()
  RETURNING *
  INTO STRICT v_result;

  RETURN v_result;
END;
$$;

COMMENT ON FUNCTION increment_monthly_usage_summary(UUID, NUMERIC, BIGINT, TIMESTAMP WITH TIME ZONE, INTEGER) IS 'Accumulate usage into monthly aggregates and return the updated row.';

-- RLS policies
DROP POLICY IF EXISTS "Users can view own monthly summary" ON monthly_usage_summary;
CREATE POLICY "Users can view own monthly summary"
  ON monthly_usage_summary
  FOR SELECT
  USING (auth.role() = 'service_role' OR auth.uid() = user_id);

DROP POLICY IF EXISTS "Service role can manage monthly summary" ON monthly_usage_summary;
CREATE POLICY "Service role can manage monthly summary"
  ON monthly_usage_summary
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

ALTER TABLE usage_alert_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own usage alert events" ON usage_alert_events;
CREATE POLICY "Users can view own usage alert events"
  ON usage_alert_events
  FOR SELECT
  USING (auth.role() = 'service_role' OR auth.uid() = user_id);

DROP POLICY IF EXISTS "Service role manages usage alert events" ON usage_alert_events;
CREATE POLICY "Service role manages usage alert events"
  ON usage_alert_events
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');
