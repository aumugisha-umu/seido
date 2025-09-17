-- Add country column to buildings table
-- Migration: 20250127140000_add_country_to_buildings

-- Add country column with default value
ALTER TABLE buildings 
ADD COLUMN country TEXT DEFAULT 'Belgique';

-- Update existing records to have Belgique as default country
UPDATE buildings 
SET country = 'Belgique' 
WHERE country IS NULL;

-- Make country required (NOT NULL) after setting default values
ALTER TABLE buildings 
ALTER COLUMN country SET NOT NULL;

-- Add comment for documentation
COMMENT ON COLUMN buildings.country IS 'Country where the building is located';

-- Update the updated_at timestamp for all buildings (to maintain audit trail)
UPDATE buildings SET updated_at = NOW();
