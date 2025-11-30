-- Add optional structured sections to recipes
-- Each section can hold its own ingredients and instructions

ALTER TABLE recipes
ADD COLUMN IF NOT EXISTS sections JSONB NOT NULL DEFAULT '[]'::jsonb;

COMMENT ON COLUMN recipes.sections IS
  'Optional structured recipe sections, each with its own ingredients and instructions.';

-- Ensure sections column stays an array when present
ALTER TABLE recipes
  ADD CONSTRAINT valid_sections_structure
  CHECK (jsonb_typeof(sections) = 'array');
