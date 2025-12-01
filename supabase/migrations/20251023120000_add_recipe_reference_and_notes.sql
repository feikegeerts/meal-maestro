-- Add optional reference, timing, wine pairing, and notes fields to recipes
-- All columns are nullable to avoid backfill requirements

ALTER TABLE recipes
ADD COLUMN IF NOT EXISTS reference TEXT;

ALTER TABLE recipes
ADD COLUMN IF NOT EXISTS prep_time INTEGER CHECK (prep_time >= 0);

ALTER TABLE recipes
ADD COLUMN IF NOT EXISTS cook_time INTEGER CHECK (cook_time >= 0);

ALTER TABLE recipes
ADD COLUMN IF NOT EXISTS total_time INTEGER CHECK (total_time >= 0);

ALTER TABLE recipes
ADD COLUMN IF NOT EXISTS pairing_wine VARCHAR(255);

ALTER TABLE recipes
ADD COLUMN IF NOT EXISTS notes TEXT;

COMMENT ON COLUMN recipes.reference IS
  'Optional source reference for the recipe. May be a URL or free-form text (e.g., cookbook page).';

COMMENT ON COLUMN recipes.prep_time IS
  'Preparation time in minutes.';

COMMENT ON COLUMN recipes.cook_time IS
  'Active cook time in minutes.';

COMMENT ON COLUMN recipes.total_time IS
  'Total time in minutes (explicitly stored, not derived).';

COMMENT ON COLUMN recipes.pairing_wine IS
  'Optional wine pairing suggestion.';

COMMENT ON COLUMN recipes.notes IS
  'Free-form notes for the recipe (utensils, history, guests, etc.).';
