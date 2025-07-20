-- Create recipes table for Meal Maestro feature
CREATE TABLE recipes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  ingredients TEXT[] NOT NULL,
  description TEXT NOT NULL,
  category TEXT NOT NULL,
  tags TEXT[] DEFAULT '{}',
  season TEXT,
  last_eaten TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes for better query performance
CREATE INDEX idx_recipes_category ON recipes(category);
CREATE INDEX idx_recipes_season ON recipes(season);
CREATE INDEX idx_recipes_last_eaten ON recipes(last_eaten);
CREATE INDEX idx_recipes_tags ON recipes USING GIN(tags);

-- Enable Row Level Security (RLS) for future use
ALTER TABLE recipes ENABLE ROW LEVEL SECURITY;

-- Create a policy that allows all operations for now (can be restricted later)
CREATE POLICY "Allow all operations on recipes" ON recipes
  FOR ALL
  TO public
  USING (true);

-- Create a trigger to automatically update the updated_at timestamp
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