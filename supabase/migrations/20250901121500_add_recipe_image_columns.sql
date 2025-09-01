-- Add image support to recipes table
-- This enables recipe photo uploads with metadata tracking

-- Add image columns to recipes table
ALTER TABLE recipes 
ADD COLUMN image_url TEXT,
ADD COLUMN image_metadata JSONB;

-- Create index for image_url lookups (for cleanup operations)
CREATE INDEX idx_recipes_image_url ON recipes(image_url) WHERE image_url IS NOT NULL;

-- Comment the columns for documentation
COMMENT ON COLUMN recipes.image_url IS 'Storage path for recipe image (timestamp-based filename for cache invalidation)';
COMMENT ON COLUMN recipes.image_metadata IS 'Image processing metadata including dimensions, compression ratio, and original size';