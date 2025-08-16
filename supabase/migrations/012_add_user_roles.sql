-- Add user roles to support admin functionality
-- This migration adds role-based access control to the user_profiles table

-- Step 1: Create user role enum
CREATE TYPE user_role AS ENUM ('user', 'admin');

-- Step 2: Add role column to user_profiles table
ALTER TABLE user_profiles 
ADD COLUMN role user_role DEFAULT 'user' NOT NULL;

-- Step 3: Create index on role column for better query performance
CREATE INDEX idx_user_profiles_role ON user_profiles(role);

-- Step 4: Create admin-specific RLS policies for api_usage table
-- Allow admins to view all usage data (bypasses the existing user-specific policy)
CREATE POLICY "Admins can view all usage data" ON api_usage
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE user_profiles.id = auth.uid() 
      AND user_profiles.role = 'admin'
    )
  );

-- Step 5: Admin access to user_profiles is handled by existing policies
-- The existing "Users can view own profile" policy allows users to see their own profile
-- Admin access to other profiles will be handled through the service role key in admin API calls

-- Step 6: Create function to check if current user is admin
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM user_profiles 
    WHERE id = auth.uid() 
    AND role = 'admin'
  );
END;
$$;

-- Step 7: Grant execute permission on is_admin function to authenticated users
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;