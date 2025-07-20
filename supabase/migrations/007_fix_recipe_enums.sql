-- Fix recipe ENUM implementation to work with existing columns

-- Remove the broken constraint
ALTER TABLE recipes DROP CONSTRAINT IF EXISTS check_valid_tags;

-- Remove duplicate columns if they were created
ALTER TABLE recipes DROP COLUMN IF EXISTS category CASCADE;
ALTER TABLE recipes DROP COLUMN IF EXISTS season CASCADE;

-- Add category and season columns with proper ENUM types if they don't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'recipes' AND column_name = 'category') THEN
        ALTER TABLE recipes ADD COLUMN category recipe_category NOT NULL DEFAULT 'dinner';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'recipes' AND column_name = 'season') THEN
        ALTER TABLE recipes ADD COLUMN season recipe_season DEFAULT NULL;
    END IF;
END $$;

-- Create a simpler validation function that works with TEXT[] 
CREATE OR REPLACE FUNCTION validate_recipe_tags(tags TEXT[])
RETURNS BOOLEAN AS $$
DECLARE
  tag TEXT;
  valid_tags TEXT[] := ARRAY[
    'vegetarian', 'vegan', 'gluten-free', 'dairy-free', 'nut-free', 'keto', 'paleo', 'low-carb', 'low-fat', 
    'sugar-free', 'low-sodium', 'high-protein', 'italian', 'mexican', 'chinese', 'indian', 'thai', 'french', 
    'mediterranean', 'american', 'japanese', 'korean', 'greek', 'spanish', 'middle-eastern', 'cajun', 
    'southern', 'baking', 'grilling', 'frying', 'roasting', 'steaming', 'slow-cooking', 'air-fryer', 
    'instant-pot', 'no-cook', 'one-pot', 'stir-fry', 'braising', 'smoking', 'pressure-cooker', 'quick', 
    'easy', 'healthy', 'comfort-food', 'spicy', 'mild', 'sweet', 'savory', 'crispy', 'creamy', 'fresh', 
    'hearty', 'light', 'rich', 'party', 'holiday', 'weeknight', 'meal-prep', 'kid-friendly', 'date-night', 
    'potluck', 'picnic', 'brunch', 'entertaining', 'budget-friendly', 'leftover-friendly', 'chicken', 
    'beef', 'pork', 'fish', 'seafood', 'tofu', 'beans', 'eggs', 'turkey', 'lamb', 'duck', 'plant-based', 
    'soup', 'salad', 'sandwich', 'pasta', 'pizza', 'bread', 'cookies', 'cake', 'pie', 'smoothie', 
    'cocktail', 'sauce', 'dip', 'marinade', 'dressing'
  ];
BEGIN
  -- Allow empty arrays
  IF tags IS NULL OR array_length(tags, 1) IS NULL THEN
    RETURN TRUE;
  END IF;
  
  -- Check each tag against the valid tags array
  FOREACH tag IN ARRAY tags
  LOOP
    IF NOT (tag = ANY(valid_tags)) THEN
      RETURN FALSE;
    END IF;
  END LOOP;
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = '';

-- Add the fixed constraint
ALTER TABLE recipes 
  ADD CONSTRAINT check_valid_tags 
  CHECK (validate_recipe_tags(tags));

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_recipes_category ON recipes(category);
CREATE INDEX IF NOT EXISTS idx_recipes_season ON recipes(season);