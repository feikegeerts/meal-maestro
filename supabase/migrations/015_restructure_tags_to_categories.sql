-- Restructure tags from single array to categorized columns
-- This migration replaces the single tags array with categorized tag columns

-- Step 1: Drop the old tags system
DROP VIEW IF EXISTS recipe_enum_values;
ALTER TABLE recipes DROP COLUMN IF EXISTS tags;
DROP FUNCTION IF EXISTS validate_recipe_tags(TEXT[]);
DROP TYPE IF EXISTS recipe_tag CASCADE;

-- Step 2: Create new category-specific enums

-- Cuisine types (single value per recipe)
CREATE TYPE cuisine_type AS ENUM (
  'dutch',
  'italian', 
  'asian',
  'chinese',
  'thai',
  'japanese',
  'vietnamese',
  'indonesian',
  'indian',
  'mexican',
  'american',
  'french',
  'greek',
  'spanish',
  'turkish',
  'moroccan',
  'argentinian',
  'south-american',
  'central-american',
  'middle-eastern',
  'english',
  'surinamese',
  'mediterranean',
  'scandinavian'
);

-- Diet types (multiple values per recipe)
CREATE TYPE diet_type AS ENUM (
  'vegetarian',
  'vegan',
  'gluten-free',
  'lactose-free',
  'high-protein',
  'keto',
  'without-meat',
  'without-meat-fish'
);

-- Cooking methods (multiple values per recipe)
CREATE TYPE cooking_method_type AS ENUM (
  'baking',
  'cooking',
  'grilling',
  'barbecue',
  'oven',
  'air-fryer',
  'deep-frying',
  'stir-fry',
  'stewing',
  'steaming',
  'poaching'
);

-- Dish types (multiple values per recipe)
CREATE TYPE dish_type AS ENUM (
  'soup',
  'salad',
  'pasta',
  'rice',
  'bread-sandwiches',
  'stamppot',
  'quiche',
  'wrap',
  'sauce-dressing'
);

-- Protein types (multiple values per recipe)
CREATE TYPE protein_type AS ENUM (
  'meat',
  'fish',
  'poultry',
  'shellfish',
  'meat-substitute'
);

-- Occasion types (multiple values per recipe)
CREATE TYPE occasion_type AS ENUM (
  'christmas',
  'easter',
  'new-year',
  'birthday',
  'mothers-day',
  'picnic',
  'drinks',
  'party-snack'
);

-- Characteristic types (multiple values per recipe)
CREATE TYPE characteristic_type AS ENUM (
  'easy',
  'quick',
  'budget',
  'healthy',
  'light'
);

-- Step 3: Add new categorized tag columns to recipes table
ALTER TABLE recipes 
  ADD COLUMN cuisine cuisine_type,
  ADD COLUMN diet_types diet_type[],
  ADD COLUMN cooking_methods cooking_method_type[],
  ADD COLUMN dish_types dish_type[],
  ADD COLUMN proteins protein_type[],
  ADD COLUMN occasions occasion_type[],
  ADD COLUMN characteristics characteristic_type[];

-- Step 4: Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_recipes_cuisine ON recipes(cuisine);
CREATE INDEX IF NOT EXISTS idx_recipes_diet_types ON recipes USING GIN(diet_types);
CREATE INDEX IF NOT EXISTS idx_recipes_cooking_methods ON recipes USING GIN(cooking_methods);
CREATE INDEX IF NOT EXISTS idx_recipes_dish_types ON recipes USING GIN(dish_types);
CREATE INDEX IF NOT EXISTS idx_recipes_proteins ON recipes USING GIN(proteins);
CREATE INDEX IF NOT EXISTS idx_recipes_occasions ON recipes USING GIN(occasions);
CREATE INDEX IF NOT EXISTS idx_recipes_characteristics ON recipes USING GIN(characteristics);

-- Step 5: Recreate the enum values view for the new tag structure
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
    'cuisine' as enum_type,
    unnest(enum_range(NULL::cuisine_type))::text as value
  UNION ALL
  SELECT 
    'diet_type' as enum_type,
    unnest(enum_range(NULL::diet_type))::text as value
  UNION ALL
  SELECT 
    'cooking_method' as enum_type,
    unnest(enum_range(NULL::cooking_method_type))::text as value
  UNION ALL
  SELECT 
    'dish_type' as enum_type,
    unnest(enum_range(NULL::dish_type))::text as value
  UNION ALL
  SELECT 
    'protein_type' as enum_type,
    unnest(enum_range(NULL::protein_type))::text as value
  UNION ALL
  SELECT 
    'occasion_type' as enum_type,
    unnest(enum_range(NULL::occasion_type))::text as value
  UNION ALL
  SELECT 
    'characteristic_type' as enum_type,
    unnest(enum_range(NULL::characteristic_type))::text as value
)
ORDER BY enum_type, value;

-- Step 6: Add comments for documentation
COMMENT ON TYPE cuisine_type IS 'Recipe cuisine types - single value per recipe';
COMMENT ON TYPE diet_type IS 'Recipe dietary types - multiple values per recipe';
COMMENT ON TYPE cooking_method_type IS 'Recipe cooking methods - multiple values per recipe';
COMMENT ON TYPE dish_type IS 'Recipe dish types - multiple values per recipe';
COMMENT ON TYPE protein_type IS 'Recipe protein types - multiple values per recipe';
COMMENT ON TYPE occasion_type IS 'Recipe occasion types - multiple values per recipe';
COMMENT ON TYPE characteristic_type IS 'Recipe characteristic types - multiple values per recipe';

COMMENT ON COLUMN recipes.cuisine IS 'Primary cuisine type for the recipe (single value)';
COMMENT ON COLUMN recipes.diet_types IS 'Dietary requirements/types for the recipe (multiple values)';
COMMENT ON COLUMN recipes.cooking_methods IS 'Cooking methods used in the recipe (multiple values)';
COMMENT ON COLUMN recipes.dish_types IS 'Type of dish/meal (multiple values)';
COMMENT ON COLUMN recipes.proteins IS 'Main protein sources in the recipe (multiple values)';
COMMENT ON COLUMN recipes.occasions IS 'Occasions suitable for this recipe (multiple values)';
COMMENT ON COLUMN recipes.characteristics IS 'Recipe characteristics like easy, quick, etc. (multiple values)';

COMMENT ON VIEW recipe_enum_values IS 'View showing all available enum values for recipe categories and tags';