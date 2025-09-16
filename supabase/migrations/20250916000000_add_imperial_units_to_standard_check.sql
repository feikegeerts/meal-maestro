-- Add US Imperial units to the is_standard_unit function
-- This prevents users from creating custom units that conflict with the new standard units

CREATE OR REPLACE FUNCTION is_standard_unit(unit_name TEXT)
RETURNS BOOLEAN AS $$
BEGIN
  -- List of standard cooking units that cannot be overridden
  -- Updated to include US Imperial units: cup, fl oz, oz, lb
  RETURN LOWER(unit_name) IN ('g', 'kg', 'ml', 'l', 'tbsp', 'tsp', 'clove', 'cup', 'fl oz', 'oz', 'lb');
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Add comment to document the change
COMMENT ON FUNCTION is_standard_unit(TEXT) IS 'Checks if a unit name conflicts with standard cooking units. Updated to include US Imperial units: cup, fl oz, oz, lb';