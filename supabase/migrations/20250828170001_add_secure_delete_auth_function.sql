-- Create secure database function for auth user deletion
-- Uses SECURITY DEFINER to safely delete auth.users records without exposing service role in application code

-- Function: Securely delete a user's auth record
CREATE OR REPLACE FUNCTION delete_user_auth_record(target_user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
    deletion_successful BOOLEAN := FALSE;
BEGIN
    -- Validate that the user exists before attempting deletion
    IF NOT EXISTS (SELECT 1 FROM auth.users WHERE id = target_user_id) THEN
        RAISE LOG 'delete_user_auth_record: User % not found', target_user_id;
        RETURN FALSE;
    END IF;
    
    -- Delete the user from auth.users table
    -- This will cascade to related auth tables (sessions, refresh_tokens, etc.)
    DELETE FROM auth.users WHERE id = target_user_id;
    
    -- Check if deletion was successful
    GET DIAGNOSTICS deletion_successful = ROW_COUNT;
    
    IF deletion_successful THEN
        RAISE LOG 'delete_user_auth_record: Successfully deleted user %', target_user_id;
        RETURN TRUE;
    ELSE
        RAISE LOG 'delete_user_auth_record: Failed to delete user %', target_user_id;
        RETURN FALSE;
    END IF;

EXCEPTION
    WHEN OTHERS THEN
        RAISE LOG 'delete_user_auth_record: Error deleting user %: %', target_user_id, SQLERRM;
        RETURN FALSE;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION delete_user_auth_record(UUID) TO authenticated;

-- Add function documentation
COMMENT ON FUNCTION delete_user_auth_record(UUID) IS 
'Securely deletes a user from auth.users table using elevated privileges. 
Used for GDPR-compliant account deletion. Only callable by authenticated users.
Returns TRUE on success, FALSE on failure.';

-- Create wrapper function that includes user validation (extra security layer)
CREATE OR REPLACE FUNCTION delete_current_user_auth_record()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
    current_user_id UUID;
    deletion_result BOOLEAN;
BEGIN
    -- Get the current authenticated user ID
    current_user_id := auth.uid();
    
    -- Validate that user is authenticated
    IF current_user_id IS NULL THEN
        RAISE LOG 'delete_current_user_auth_record: No authenticated user found';
        RETURN FALSE;
    END IF;
    
    -- Call the main deletion function
    SELECT delete_user_auth_record(current_user_id) INTO deletion_result;
    
    RETURN deletion_result;
END;
$$;

-- Grant execute permission to authenticated users for the wrapper function
GRANT EXECUTE ON FUNCTION delete_current_user_auth_record() TO authenticated;

-- Add wrapper function documentation
COMMENT ON FUNCTION delete_current_user_auth_record() IS 
'Wrapper function that deletes the currently authenticated user''s auth record.
Provides additional security by automatically using the current user''s ID.
Used for GDPR-compliant self-service account deletion.
Returns TRUE on success, FALSE on failure.';