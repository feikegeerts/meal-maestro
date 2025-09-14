-- Create custom units table to allow users to define their own units
-- alongside the standard cooking units

CREATE TABLE custom_units (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  unit_name TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),

  -- Ensure unit names are unique per user
  CONSTRAINT unique_user_unit UNIQUE(user_id, unit_name),

  -- Validate unit name format
  CONSTRAINT valid_unit_name CHECK (
    unit_name ~ '^[a-zA-Z0-9\s\-\.]{1,50}$' AND
    length(trim(unit_name)) >= 1 AND
    length(trim(unit_name)) <= 50
  )
);

-- Create indexes for performance
CREATE INDEX idx_custom_units_user_id ON custom_units(user_id);
CREATE INDEX idx_custom_units_unit_name ON custom_units(unit_name);

-- Enable Row Level Security
ALTER TABLE custom_units ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Users can only see and manage their own custom units
CREATE POLICY "Users can view own custom units" ON custom_units
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own custom units" ON custom_units
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own custom units" ON custom_units
  FOR UPDATE TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own custom units" ON custom_units
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Create function to check if a unit name conflicts with standard units
CREATE OR REPLACE FUNCTION is_standard_unit(unit_name TEXT)
RETURNS BOOLEAN AS $$
BEGIN
  -- List of standard cooking units that cannot be overridden
  RETURN LOWER(unit_name) IN ('g', 'kg', 'ml', 'l', 'tbsp', 'tsp', 'clove');
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Add constraint to prevent custom units that conflict with standard units
ALTER TABLE custom_units ADD CONSTRAINT no_standard_unit_override
  CHECK (NOT is_standard_unit(unit_name));

-- Add trigger to automatically trim and normalize unit names
CREATE OR REPLACE FUNCTION normalize_unit_name()
RETURNS TRIGGER AS $$
BEGIN
  -- Trim whitespace and normalize case for consistency
  NEW.unit_name = trim(NEW.unit_name);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER normalize_custom_unit_name
  BEFORE INSERT OR UPDATE ON custom_units
  FOR EACH ROW
  EXECUTE FUNCTION normalize_unit_name();