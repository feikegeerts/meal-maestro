-- Remove servings_unit column - serving size is always for "people"
-- Drop the constraint first
ALTER TABLE recipes DROP CONSTRAINT IF EXISTS valid_servings_unit;

-- Drop the servings_unit column
ALTER TABLE recipes DROP COLUMN IF EXISTS servings_unit;