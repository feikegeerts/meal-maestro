-- Add JSONB column to store per-user recipe share metadata
ALTER TABLE user_profiles
ADD COLUMN shared_recipe_links JSONB NOT NULL DEFAULT '[]'::jsonb;

COMMENT ON COLUMN user_profiles.shared_recipe_links IS 'Per-user cache of active recipe share links (contains slug/token metadata for rebuilding URLs).';
