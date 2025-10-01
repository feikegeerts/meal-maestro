-- Remove duplicate share links, keeping the most recent entry per recipe
DELETE FROM shared_recipe_links s
USING (
  SELECT id
  FROM (
    SELECT id,
           ROW_NUMBER() OVER (
             PARTITION BY recipe_id
             ORDER BY created_at DESC NULLS LAST, id DESC
           ) AS rn
    FROM shared_recipe_links
  ) ranked
  WHERE ranked.rn > 1
) duplicates
WHERE s.id = duplicates.id;

-- Ensure each recipe has at most one active share link
CREATE UNIQUE INDEX IF NOT EXISTS idx_shared_recipe_links_recipe_unique
  ON shared_recipe_links(recipe_id);
