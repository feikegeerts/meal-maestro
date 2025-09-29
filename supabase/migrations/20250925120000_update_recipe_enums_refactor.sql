-- Update recipe-related ENUM types to match refactored TypeScript enums
-- Changes:
--   recipe_category: remove 'dinner', 'beverage'; add 'brunch', 'main-course', 'side-dish', 'pastry'
--   diet_type: remove 'without-meat', 'without-meat-fish'
-- Assumptions: App not yet live; destructive enum changes acceptable.
-- Strategy: Recreate affected enum types (PostgreSQL cannot drop enum values directly pre-PG16)
--           Normalize existing data, drop/replace types, recreate view.

BEGIN;

-- Drop dependent view first (will be recreated later)
DROP VIEW IF EXISTS recipe_enum_values;

/* =============================================
   Update recipe_category enum (safe rebuild)
   ============================================= */

-- 1. Detach the column from the existing enum so we can drop/rebuild the type
ALTER TABLE recipes ALTER COLUMN category DROP DEFAULT;
ALTER TABLE recipes ALTER COLUMN category TYPE text USING category::text;

-- 2. Drop the old enum type
DROP TYPE IF EXISTS recipe_category;

-- 3. Recreate enum with new desired values
CREATE TYPE recipe_category AS ENUM (
  'breakfast',
  'brunch',
  'lunch',
  'appetizer',
  'main-course',
  'side-dish',
  'dessert',
  'pastry',
  'snack'
);

-- 4. Normalize existing textual data (now column is text)
UPDATE recipes SET category = 'main-course' WHERE category = 'dinner';
UPDATE recipes SET category = 'snack' WHERE category = 'beverage';

-- 5. Recast the column back to the new enum type and set default
ALTER TABLE recipes
  ALTER COLUMN category TYPE recipe_category USING category::recipe_category,
  ALTER COLUMN category SET DEFAULT 'main-course';

/* =============================================
   Update diet_type enum (diet_types[] column)
   ============================================= */

-- 1. Remove deprecated values from existing arrays (operate while old enum still exists)
UPDATE recipes SET diet_types = array_remove(diet_types, 'without-meat')
WHERE diet_types IS NOT NULL AND diet_types @> ARRAY['without-meat']::diet_type[];

UPDATE recipes SET diet_types = array_remove(diet_types, 'without-meat-fish')
WHERE diet_types IS NOT NULL AND diet_types @> ARRAY['without-meat-fish']::diet_type[];

-- 2. Detach column from enum type
ALTER TABLE recipes
  ALTER COLUMN diet_types TYPE text[] USING diet_types::text[];

-- 3. Drop old enum and recreate with reduced set
DROP TYPE IF EXISTS diet_type;
CREATE TYPE diet_type AS ENUM (
  'vegetarian',
  'vegan',
  'gluten-free',
  'lactose-free',
  'high-protein',
  'keto'
);

-- 4. Recast column back to enum[]
ALTER TABLE recipes
  ADD COLUMN diet_types_new diet_type[];

UPDATE recipes
SET diet_types_new = CASE
  WHEN diet_types IS NULL THEN NULL
  ELSE (
    SELECT array_agg(value::diet_type)
    FROM unnest(diet_types) AS value
  )
END;

ALTER TABLE recipes
  DROP COLUMN diet_types;

ALTER TABLE recipes
  RENAME COLUMN diet_types_new TO diet_types;

CREATE INDEX IF NOT EXISTS idx_recipes_diet_types ON recipes USING GIN(diet_types);

COMMENT ON COLUMN recipes.diet_types IS 'Dietary requirements/types for the recipe (multiple values)';

/* =============================================
   Recreate recipe_enum_values view
   ============================================= */

CREATE VIEW recipe_enum_values 
WITH (security_invoker = on) AS
(
  SELECT 'category' AS enum_type, unnest(enum_range(NULL::recipe_category))::text AS value
  UNION ALL
  SELECT 'season' AS enum_type, unnest(enum_range(NULL::recipe_season))::text AS value
  UNION ALL
  SELECT 'cuisine' AS enum_type, unnest(enum_range(NULL::cuisine_type))::text AS value
  UNION ALL
  SELECT 'diet_type' AS enum_type, unnest(enum_range(NULL::diet_type))::text AS value
  UNION ALL
  SELECT 'cooking_method' AS enum_type, unnest(enum_range(NULL::cooking_method_type))::text AS value
  UNION ALL
  SELECT 'dish_type' AS enum_type, unnest(enum_range(NULL::dish_type))::text AS value
  UNION ALL
  SELECT 'protein_type' AS enum_type, unnest(enum_range(NULL::protein_type))::text AS value
  UNION ALL
  SELECT 'occasion_type' AS enum_type, unnest(enum_range(NULL::occasion_type))::text AS value
  UNION ALL
  SELECT 'characteristic_type' AS enum_type, unnest(enum_range(NULL::characteristic_type))::text AS value
)
ORDER BY enum_type, value;

-- (Optional) refresh comments for modified types
COMMENT ON TYPE recipe_category IS 'Recipe categories (refactored)';
COMMENT ON TYPE diet_type IS 'Dietary requirement types (refactored, deprecated values removed)';
COMMENT ON VIEW recipe_enum_values IS 'View showing all available enum values for recipe categories and tags';

COMMIT;
