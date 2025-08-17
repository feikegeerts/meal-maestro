-- Add language preference support to user profiles
-- This allows users to store their preferred language (Dutch or English)

ALTER TABLE user_profiles 
ADD COLUMN language_preference TEXT DEFAULT 'nl' CHECK (language_preference IN ('nl', 'en'));

-- Add index for better query performance
CREATE INDEX idx_user_profiles_language_preference ON user_profiles(language_preference);

-- Add comment to document the column
COMMENT ON COLUMN user_profiles.language_preference IS 'User language preference: nl (Dutch) or en (English), defaults to Dutch';