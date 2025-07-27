-- Restructure recipes table for structured ingredients and serving size
-- Drop existing table and recreate with new structure

-- Drop existing recipes table (data will be lost - acceptable for fresh start)
DROP TABLE IF EXISTS recipes CASCADE;

-- Create new recipes table with structured ingredients
CREATE TABLE recipes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  ingredients JSONB NOT NULL DEFAULT '[]'::jsonb,
  servings INTEGER NOT NULL DEFAULT 4,
  servings_unit TEXT NOT NULL DEFAULT 'people',
  description TEXT NOT NULL,
  category TEXT NOT NULL,
  tags TEXT[] DEFAULT '{}',
  season TEXT,
  last_eaten TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE
);

-- Create indexes for better query performance
CREATE INDEX idx_recipes_category ON recipes(category);
CREATE INDEX idx_recipes_season ON recipes(season);
CREATE INDEX idx_recipes_last_eaten ON recipes(last_eaten);
CREATE INDEX idx_recipes_tags ON recipes USING GIN(tags);
CREATE INDEX idx_recipes_user_id ON recipes(user_id);
CREATE INDEX idx_recipes_servings ON recipes(servings);

-- Enable Row Level Security (RLS)
ALTER TABLE recipes ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for user isolation
CREATE POLICY "Users can view own recipes" ON recipes
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own recipes" ON recipes
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own recipes" ON recipes
  FOR UPDATE TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own recipes" ON recipes
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Create trigger to automatically update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_recipes_updated_at
  BEFORE UPDATE ON recipes
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Add constraint to validate ingredients JSONB structure (basic validation only)
ALTER TABLE recipes ADD CONSTRAINT valid_ingredients_structure
  CHECK (jsonb_typeof(ingredients) = 'array');

-- Add constraint for valid servings
ALTER TABLE recipes ADD CONSTRAINT valid_servings
  CHECK (servings > 0 AND servings <= 100);

-- Add constraint for valid servings_unit
ALTER TABLE recipes ADD CONSTRAINT valid_servings_unit
  CHECK (servings_unit IN ('people', 'portions', 'servings', 'cups', 'liters'));