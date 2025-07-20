-- Fix search_path security issue for update_updated_at_column function
-- This migration addresses the security warning about mutable search_path

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql'
SET search_path = public;

-- Add comment to document the security fix
COMMENT ON FUNCTION update_updated_at_column() IS 'Automatically updates the updated_at timestamp. Fixed search_path for security.';
