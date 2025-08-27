-- Optimize RLS policies for better performance
-- This migration addresses Supabase performance warnings by:
-- 1. Wrapping auth function calls in subqueries to prevent re-evaluation per row
-- 2. Consolidating multiple permissive policies to reduce overhead

-- =============================================================================
-- PHASE 1: Fix auth_rls_initplan warnings by optimizing auth function calls
-- =============================================================================

-- Fix rate_limit_ip policies
DROP POLICY IF EXISTS "Service role access" ON rate_limit_ip;
CREATE POLICY "Service role access" ON rate_limit_ip
    FOR ALL USING ((select auth.role()) = 'service_role');

-- Fix rate_limit_violations policies  
DROP POLICY IF EXISTS "Service role access" ON rate_limit_violations;
CREATE POLICY "Service role access" ON rate_limit_violations
    FOR ALL USING ((select auth.role()) = 'service_role');

-- Fix user_profiles policies
DROP POLICY IF EXISTS "Users can view own profile" ON user_profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON user_profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON user_profiles;

CREATE POLICY "Users can view own profile" ON user_profiles
  FOR SELECT
  TO authenticated
  USING ((select auth.uid()) = id);

CREATE POLICY "Users can update own profile" ON user_profiles
  FOR UPDATE
  TO authenticated
  USING ((select auth.uid()) = id);

CREATE POLICY "Users can insert own profile" ON user_profiles
  FOR INSERT
  TO authenticated
  WITH CHECK ((select auth.uid()) = id);

-- Fix recipes policies
DROP POLICY IF EXISTS "Users can view own recipes" ON recipes;
DROP POLICY IF EXISTS "Users can insert own recipes" ON recipes;
DROP POLICY IF EXISTS "Users can update own recipes" ON recipes;
DROP POLICY IF EXISTS "Users can delete own recipes" ON recipes;

CREATE POLICY "Users can view own recipes" ON recipes
  FOR SELECT
  TO authenticated
  USING ((select auth.uid()) = user_id);

CREATE POLICY "Users can insert own recipes" ON recipes
  FOR INSERT
  TO authenticated
  WITH CHECK ((select auth.uid()) = user_id);

CREATE POLICY "Users can update own recipes" ON recipes
  FOR UPDATE
  TO authenticated
  USING ((select auth.uid()) = user_id);

CREATE POLICY "Users can delete own recipes" ON recipes
  FOR DELETE
  TO authenticated
  USING ((select auth.uid()) = user_id);

-- Fix rate_limit_user policies (will be further optimized in Phase 2)
DROP POLICY IF EXISTS "Users can manage their own rate limits" ON rate_limit_user;
DROP POLICY IF EXISTS "Service role access" ON rate_limit_user;

CREATE POLICY "Users can manage their own rate limits" ON rate_limit_user
    FOR ALL USING ((select auth.uid()) = user_id);

CREATE POLICY "Service role access" ON rate_limit_user
    FOR ALL USING ((select auth.role()) = 'service_role');

-- =============================================================================
-- PHASE 2: Fix multiple_permissive_policies warnings by consolidating policies
-- =============================================================================

-- Fix api_usage multiple permissive policies
-- Drop existing policies that cause conflicts
DROP POLICY IF EXISTS "Users can view own usage" ON api_usage;
DROP POLICY IF EXISTS "Admins can view all usage data" ON api_usage;
DROP POLICY IF EXISTS "Service role can view all usage" ON api_usage;
DROP POLICY IF EXISTS "System can insert usage" ON api_usage;
DROP POLICY IF EXISTS "Service role can manage usage" ON api_usage;

-- Create consolidated SELECT policy that handles both users and admins efficiently
CREATE POLICY "Users and admins can view usage data" ON api_usage
  FOR SELECT
  TO authenticated
  USING (
    (select auth.uid()) = user_id 
    OR EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE user_profiles.id = (select auth.uid()) 
      AND user_profiles.role = 'admin'
    )
  );

-- Separate policies for other operations to maintain security boundaries
CREATE POLICY "System can insert usage" ON api_usage
  FOR INSERT
  TO authenticated, anon
  WITH CHECK (true);

CREATE POLICY "Service role can manage all usage" ON api_usage
  FOR ALL
  TO service_role
  USING (true);

-- Fix rate_limit_user multiple permissive policies
-- The existing optimized policies from Phase 1 already address this
-- by having distinct conditions: one for user ownership, one for service role

-- =============================================================================
-- Documentation and Comments
-- =============================================================================

COMMENT ON TABLE rate_limit_ip IS 'Rate limiting by IP address with optimized RLS policies for performance';
COMMENT ON TABLE rate_limit_violations IS 'Rate limit violations tracking with optimized RLS policies for performance';
COMMENT ON TABLE user_profiles IS 'User profile data with optimized RLS policies for performance';
COMMENT ON TABLE recipes IS 'Recipe management with optimized RLS policies for performance';
COMMENT ON TABLE api_usage IS 'API usage tracking with consolidated RLS policies for performance';
COMMENT ON TABLE rate_limit_user IS 'User-based rate limiting with optimized RLS policies for performance';