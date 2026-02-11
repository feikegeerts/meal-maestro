-- Remove recipe sharing functionality
-- This migration removes the shared_recipe_links table and related metadata

-- Drop the shared_recipe_links JSONB column from user_profiles
ALTER TABLE user_profiles
DROP COLUMN IF EXISTS shared_recipe_links;

-- Drop the shared_recipe_links table (cascade will remove triggers, indexes, and policies)
DROP TABLE IF EXISTS shared_recipe_links CASCADE;

-- Note: The following were automatically dropped with CASCADE:
-- - Index: idx_shared_recipe_links_owner
-- - Index: idx_shared_recipe_links_recipe
-- - RLS Policy: "Owners can manage share links"
-- - Trigger: update_shared_recipe_links_updated_at
