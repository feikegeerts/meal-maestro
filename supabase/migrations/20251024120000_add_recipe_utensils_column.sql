-- Add kitchen utensils column to recipes
ALTER TABLE public.recipes
ADD COLUMN IF NOT EXISTS utensils text[] NOT NULL DEFAULT '{}';

COMMENT ON COLUMN public.recipes.utensils IS 'List of kitchen utensils required for the recipe.';
