-- Create action_logs table for tracking all database operations
CREATE TABLE action_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  action_type TEXT NOT NULL, -- 'create', 'update', 'delete', 'search'
  recipe_id UUID REFERENCES recipes(id) ON DELETE SET NULL,
  description TEXT NOT NULL,
  details JSONB,
  timestamp TIMESTAMP DEFAULT NOW()
);

-- Create index for performance
CREATE INDEX idx_action_logs_timestamp ON action_logs(timestamp);
CREATE INDEX idx_action_logs_action_type ON action_logs(action_type);
CREATE INDEX idx_action_logs_recipe_id ON action_logs(recipe_id);

-- Add RLS policies (if needed for future user-specific logging)
ALTER TABLE action_logs ENABLE ROW LEVEL SECURITY;

-- For MVP, allow all operations (no user authentication yet)
CREATE POLICY "Allow all operations on action_logs" ON action_logs
  FOR ALL USING (true);