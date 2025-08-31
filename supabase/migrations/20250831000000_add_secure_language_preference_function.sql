-- Create secure function to get user language preference for email system
-- This replaces the need for service role key access in the email system

CREATE OR REPLACE FUNCTION get_user_language_preference(user_email TEXT)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  lang_pref TEXT;
BEGIN
  -- Input validation
  IF user_email IS NULL OR user_email = '' OR length(user_email) > 320 THEN
    RETURN NULL;
  END IF;
  
  -- Basic email format validation
  IF user_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' THEN
    RETURN NULL;
  END IF;
  
  -- Get language preference from user_profiles table
  SELECT language_preference 
  INTO lang_pref
  FROM user_profiles 
  WHERE email = user_email 
  LIMIT 1;
  
  -- Return the preference (may be NULL if user not found)
  RETURN lang_pref;
END;
$$;

-- Grant execute permission to anon role (for server-side email operations)
GRANT EXECUTE ON FUNCTION get_user_language_preference(TEXT) TO anon;

-- Grant execute permission to authenticated role (for completeness)
GRANT EXECUTE ON FUNCTION get_user_language_preference(TEXT) TO authenticated;

-- Add comment to document the function
COMMENT ON FUNCTION get_user_language_preference(TEXT) IS 
'Securely retrieves user language preference for email localization. Used by email service with anon key.';