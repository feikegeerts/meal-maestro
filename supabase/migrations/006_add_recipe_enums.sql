-- Add comprehensive ENUMs for recipe categories, seasons, and tags

-- Drop existing constraints and functions first (to handle re-runs)
ALTER TABLE IF EXISTS recipes DROP CONSTRAINT IF EXISTS check_valid_tags;
DROP FUNCTION IF EXISTS validate_recipe_tags(TEXT[]) CASCADE;

-- Drop existing types if they exist (to handle re-runs)
DROP TYPE IF EXISTS recipe_category CASCADE;
DROP TYPE IF EXISTS recipe_season CASCADE; 
DROP TYPE IF EXISTS recipe_tag CASCADE;

-- Create ENUM for recipe categories
CREATE TYPE recipe_category AS ENUM (
  'breakfast',
  'lunch', 
  'dinner',
  'dessert',
  'snack',
  'appetizer',
  'beverage'
);

-- Create ENUM for recipe seasons  
CREATE TYPE recipe_season AS ENUM (
  'spring',
  'summer',
  'fall',
  'winter',
  'year-round'
);

-- Create comprehensive ENUM for recipe tags
CREATE TYPE recipe_tag AS ENUM (
  -- Dietary Restrictions
  'vegetarian',
  'vegan', 
  'gluten-free',
  'dairy-free',
  'nut-free',
  'keto',
  'paleo',
  'low-carb',
  'low-fat',
  'sugar-free',
  'low-sodium',
  'high-protein',
  
  -- Cuisine Types
  'italian',
  'mexican',
  'chinese',
  'indian',
  'thai',
  'french',
  'mediterranean',
  'american',
  'japanese',
  'korean',
  'greek',
  'spanish',
  'middle-eastern',
  'cajun',
  'southern',
  
  -- Cooking Methods
  'baking',
  'grilling',
  'frying',
  'roasting',
  'steaming',
  'slow-cooking',
  'air-fryer',
  'instant-pot',
  'no-cook',
  'one-pot',
  'stir-fry',
  'braising',
  'smoking',
  'pressure-cooker',
  
  -- Meal Characteristics  
  'quick',
  'easy',
  'healthy',
  'comfort-food',
  'spicy',
  'mild',
  'sweet',
  'savory',
  'crispy',
  'creamy',
  'fresh',
  'hearty',
  'light',
  'rich',
  
  -- Occasions
  'party',
  'holiday',
  'weeknight',
  'meal-prep',
  'kid-friendly',
  'date-night',
  'potluck',
  'picnic',
  'brunch',
  'entertaining',
  'budget-friendly',
  'leftover-friendly',
  
  -- Protein Types
  'chicken',
  'beef',
  'pork',
  'fish',
  'seafood',
  'tofu',
  'beans',
  'eggs',
  'turkey',
  'lamb',
  'duck',
  'plant-based',
  
  -- Additional Categories
  'soup',
  'salad',
  'sandwich',
  'pasta',
  'pizza',
  'bread',
  'cookies',
  'cake',
  'pie',
  'smoothie',
  'cocktail',
  'sauce',
  'dip',
  'marinade',
  'dressing'
);

-- Drop existing function if it exists (to ensure clean recreation)
DROP FUNCTION IF EXISTS validate_recipe_tags(TEXT[]);

-- Create a function to validate recipe tags array with proper security settings
CREATE FUNCTION validate_recipe_tags(tags TEXT[])
RETURNS BOOLEAN AS $$
DECLARE
  tag TEXT;
BEGIN
  -- Allow empty arrays
  IF tags IS NULL OR array_length(tags, 1) IS NULL THEN
    RETURN TRUE;
  END IF;
  
  -- Check each tag against the enum
  FOREACH tag IN ARRAY tags
  LOOP
    -- Try to cast to recipe_tag enum, will raise exception if invalid
    PERFORM tag::recipe_tag;
  END LOOP;
  
  RETURN TRUE;
EXCEPTION
  WHEN invalid_text_representation THEN
    RETURN FALSE;
END;
$$ LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = '';

-- Add enum columns back to the table (CASCADE drop removed them)
-- Note: Since CASCADE removed the columns, we need to add them back with proper enum types
ALTER TABLE recipes 
  ADD COLUMN category recipe_category NOT NULL DEFAULT 'dinner';

ALTER TABLE recipes 
  ADD COLUMN season recipe_season DEFAULT NULL;

-- Add constraint for tags validation
ALTER TABLE recipes 
  ADD CONSTRAINT check_valid_tags 
  CHECK (validate_recipe_tags(tags));

-- Create indexes on the new enum columns for better performance
DROP INDEX IF EXISTS idx_recipes_category;
DROP INDEX IF EXISTS idx_recipes_season;

CREATE INDEX idx_recipes_category ON recipes(category);
CREATE INDEX idx_recipes_season ON recipes(season);

-- Add comments to document the ENUMs
COMMENT ON TYPE recipe_category IS 'Allowed recipe categories: breakfast, lunch, dinner, dessert, snack, appetizer, beverage';
COMMENT ON TYPE recipe_season IS 'Allowed recipe seasons: spring, summer, fall, winter, year-round';
COMMENT ON TYPE recipe_tag IS 'Comprehensive list of allowed recipe tags covering dietary restrictions, cuisines, cooking methods, characteristics, occasions, and protein types';

-- Drop existing view if it exists
DROP VIEW IF EXISTS recipe_enum_values;

-- Add helpful view to see all available enum values
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

COMMENT ON VIEW recipe_enum_values IS 'View showing all available enum values for recipe categories, seasons, and tags';