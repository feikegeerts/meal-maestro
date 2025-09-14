-- Drop the find_recipes_using_unit function since we simplified the custom unit deletion
-- to not check for recipe usage

DROP FUNCTION IF EXISTS find_recipes_using_unit(UUID, TEXT, INTEGER);