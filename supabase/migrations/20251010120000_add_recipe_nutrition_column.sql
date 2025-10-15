-- Add optional nutrition column to recipes for AI-fetched nutrient summaries

ALTER TABLE recipes
ADD COLUMN IF NOT EXISTS nutrition JSONB;

COMMENT ON COLUMN recipes.nutrition IS
  'Optional nutrition summary for the recipe, storing totals/per-portion metrics and metadata.';
