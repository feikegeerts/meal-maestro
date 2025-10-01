-- Create shared recipe link infrastructure for token-based recipe sharing
CREATE TABLE shared_recipe_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recipe_id UUID NOT NULL REFERENCES recipes(id) ON DELETE CASCADE,
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  slug TEXT NOT NULL UNIQUE,
  token_hash TEXT NOT NULL,
  allow_save BOOLEAN NOT NULL DEFAULT TRUE,
  expires_at TIMESTAMPTZ,
  view_count INTEGER NOT NULL DEFAULT 0,
  last_viewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_shared_recipe_links_owner ON shared_recipe_links(owner_id);
CREATE INDEX idx_shared_recipe_links_recipe ON shared_recipe_links(recipe_id);

ALTER TABLE shared_recipe_links ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners can manage share links" ON shared_recipe_links
  FOR ALL
  USING (auth.uid() = owner_id)
  WITH CHECK (auth.uid() = owner_id);

CREATE TRIGGER update_shared_recipe_links_updated_at
  BEFORE UPDATE ON shared_recipe_links
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

COMMENT ON TABLE shared_recipe_links IS 'Stores token-secured share links for recipes that owners create.';
COMMENT ON COLUMN shared_recipe_links.slug IS 'Human-friendly identifier used in share URLs.';
COMMENT ON COLUMN shared_recipe_links.token_hash IS 'Hashed secret token required to view the shared recipe.';
COMMENT ON COLUMN shared_recipe_links.allow_save IS 'Controls whether recipients may import the shared recipe into their own account.';
