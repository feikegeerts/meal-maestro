-- Add unit system preference support to user profiles
-- This allows users to store their preferred unit system for recipes

-- Create enum type for unit system preferences
CREATE TYPE unit_system_preference AS ENUM (
  'precise-metric',      -- Only g, kg, ml, l (maximum precision)
  'traditional-metric',  -- g, kg, ml, l, tsp, tbsp (balanced metric)
  'us-traditional',      -- cups, oz, lb, tbsp, tsp, fl oz (US measurements)
  'mixed'                -- Keep original units, no conversions
);

-- Add unit_system_preference column to user_profiles table
ALTER TABLE user_profiles
ADD COLUMN unit_system_preference unit_system_preference DEFAULT 'traditional-metric';

-- Add index for better query performance
CREATE INDEX idx_user_profiles_unit_system_preference ON user_profiles(unit_system_preference);

-- Add comment to document the column
COMMENT ON COLUMN user_profiles.unit_system_preference IS 'User unit system preference for recipe display and AI conversion';

-- Add comment to document the enum values
COMMENT ON TYPE unit_system_preference IS 'Unit system preferences: precise-metric (g,kg,ml,l only), traditional-metric (metric + spoons), us-traditional (cups,oz,lb), mixed (no conversion)';