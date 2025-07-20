-- Add user support to recipes system
-- Step 1: Create user profiles table that extends auth.users

CREATE TABLE user_profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email TEXT,
  display_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Enable RLS on user profiles
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- Create policy for user profiles - users can only access their own profile
CREATE POLICY "Users can view own profile" ON user_profiles
  FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON user_profiles
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile" ON user_profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

-- Step 2: Add user_id column to recipes table
ALTER TABLE recipes ADD COLUMN user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- Create index for better query performance on user_id
CREATE INDEX idx_recipes_user_id ON recipes(user_id);

-- Step 3: Update existing RLS policies on recipes table
-- Drop the old permissive policy
DROP POLICY "Allow all operations on recipes" ON recipes;

-- Create new user-specific policies
CREATE POLICY "Users can view own recipes" ON recipes
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own recipes" ON recipes
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own recipes" ON recipes
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own recipes" ON recipes
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Step 4: Create trigger to auto-update user_profiles updated_at
CREATE TRIGGER update_user_profiles_updated_at
  BEFORE UPDATE ON user_profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Step 5: Create function to handle new user signup
-- This function will be triggered when a new user signs up via Supabase Auth
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.user_profiles (id, email, display_name, avatar_url)
  VALUES (
    new.id,
    new.email,
    COALESCE(new.raw_user_meta_data->>'display_name', new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    new.raw_user_meta_data->>'avatar_url'
  );
  RETURN new;
END;
$$;

-- Create trigger for new user signup
CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();