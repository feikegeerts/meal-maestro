-- Update recipe categories to match AH.nl structure with English enum values
-- This migration updates the recipe_category enum and migrates existing data

-- Step 1: Create new enum type with AH.nl aligned categories in logical meal order
CREATE TYPE recipe_category_new AS ENUM (
  'breakfast',      -- ontbijt
  'brunch',         -- brunch (moved from tags)
  'lunch',          -- lunch  
  'appetizer',      -- voorgerecht
  'main-course',    -- hoofdgerecht (replaces dinner)
  'side-dish',      -- bijgerecht (new)
  'dessert',        -- nagerecht
  'pastry',         -- gebak (new)
  'snack'           -- borrelhapje
);

-- Step 2: Add temporary column with new enum type
ALTER TABLE recipes ADD COLUMN category_new recipe_category_new;

-- Step 3: Migrate existing data to new categories
UPDATE recipes SET category_new = 
  CASE 
    WHEN category::text = 'breakfast' THEN 'breakfast'::recipe_category_new
    WHEN category::text = 'lunch' THEN 'lunch'::recipe_category_new
    WHEN category::text = 'dinner' THEN 'main-course'::recipe_category_new
    WHEN category::text = 'dessert' THEN 'dessert'::recipe_category_new
    WHEN category::text = 'snack' THEN 'snack'::recipe_category_new
    WHEN category::text = 'appetizer' THEN 'appetizer'::recipe_category_new
    WHEN category::text = 'beverage' THEN 'main-course'::recipe_category_new -- fallback
    ELSE 'main-course'::recipe_category_new -- default fallback
  END;

-- Step 4: Set default value for new column (all recipes should have been migrated)
ALTER TABLE recipes ALTER COLUMN category_new SET NOT NULL;
ALTER TABLE recipes ALTER COLUMN category_new SET DEFAULT 'main-course';

-- Step 5: Drop old column and constraints
DROP INDEX IF EXISTS idx_recipes_category;
ALTER TABLE recipes DROP COLUMN category;

-- Step 6: Rename new column to original name
ALTER TABLE recipes RENAME COLUMN category_new TO category;

-- Step 7: Drop the view that depends on the enum type, then drop old enum type and rename new one
DROP VIEW IF EXISTS recipe_enum_values;
DROP TYPE recipe_category;
ALTER TYPE recipe_category_new RENAME TO recipe_category;

-- Step 8: Recreate index on category column
CREATE INDEX idx_recipes_category ON recipes(category);

-- Step 9: Update comments
COMMENT ON TYPE recipe_category IS 'Recipe categories aligned with AH.nl structure: breakfast, lunch, main-course, dessert, snack, appetizer, side-dish, pastry, brunch';

-- Step 10: Update the enum values view
DROP VIEW IF EXISTS recipe_enum_values;
CREATE VIEW recipe_enum_values 
WITH (security_invoker = on) AS
(
  SELECT 
    'category' as enum_type,
    unnest(enum_range(NULL::recipe_category))::text as value
  UNION ALL
  SELECT 
    'season' as enum_type,
    unnest(enum_range(NULL::recipe_season))::text as value
  UNION ALL  
  SELECT 
    'tag' as enum_type,
    unnest(enum_range(NULL::recipe_tag))::text as value
)
ORDER BY enum_type, value;

-- Optional: Remove 'brunch' from recipe_tag enum if it exists
-- Note: This is handled in the TypeScript layer, but we could also update the DB enum
-- For now, leaving it as it won't hurt to have it in both places during transition