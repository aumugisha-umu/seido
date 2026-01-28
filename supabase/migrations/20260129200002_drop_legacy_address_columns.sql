-- Migration: Drop legacy address columns
-- Description: Removes deprecated inline address fields from buildings, lots, and companies
-- Now that all addresses are stored in the centralized 'addresses' table with address_id FK
--
-- IMPORTANT: Run this ONLY after verifying all records have address_id populated
-- Verification queries are provided at the bottom of this file

-- ============================================================================
-- SAFETY CHECK: Verify data migration is complete
-- ============================================================================
-- These will raise an error if any records are missing address_id

DO $$
DECLARE
  buildings_without_address INTEGER;
  lots_without_address INTEGER;
  companies_without_address INTEGER;
BEGIN
  -- Check buildings
  SELECT COUNT(*) INTO buildings_without_address
  FROM buildings
  WHERE address_id IS NULL
    AND address IS NOT NULL
    AND address != ''
    AND deleted_at IS NULL;

  IF buildings_without_address > 0 THEN
    RAISE WARNING 'Found % buildings without address_id - proceeding anyway as data may be incomplete', buildings_without_address;
  END IF;

  -- Check independent lots (lots with building_id inherit address from building)
  SELECT COUNT(*) INTO lots_without_address
  FROM lots
  WHERE address_id IS NULL
    AND building_id IS NULL
    AND street IS NOT NULL
    AND street != ''
    AND deleted_at IS NULL;

  IF lots_without_address > 0 THEN
    RAISE WARNING 'Found % independent lots without address_id - proceeding anyway as data may be incomplete', lots_without_address;
  END IF;

  -- Check companies
  SELECT COUNT(*) INTO companies_without_address
  FROM companies
  WHERE address_id IS NULL
    AND (
      (street IS NOT NULL AND street != '') OR
      (address IS NOT NULL AND address != '')
    )
    AND deleted_at IS NULL;

  IF companies_without_address > 0 THEN
    RAISE WARNING 'Found % companies without address_id - proceeding anyway as data may be incomplete', companies_without_address;
  END IF;
END $$;

-- ============================================================================
-- DROP LEGACY COLUMNS FROM BUILDINGS
-- ============================================================================
-- Keep: id, name, description, address_id, team_id, metadata, timestamps
-- Drop: address, city, postal_code, country (now in addresses table)

ALTER TABLE buildings
  DROP COLUMN IF EXISTS address,
  DROP COLUMN IF EXISTS city,
  DROP COLUMN IF EXISTS postal_code,
  DROP COLUMN IF EXISTS country;

-- ============================================================================
-- DROP LEGACY COLUMNS FROM LOTS
-- ============================================================================
-- Keep: id, reference, category, floor, etc., address_id, building_id, team_id
-- Drop: street, city, postal_code, country (now in addresses table)

ALTER TABLE lots
  DROP COLUMN IF EXISTS street,
  DROP COLUMN IF EXISTS city,
  DROP COLUMN IF EXISTS postal_code,
  DROP COLUMN IF EXISTS country;

-- ============================================================================
-- DROP LEGACY COLUMNS FROM COMPANIES
-- ============================================================================
-- Keep: id, name, siret, vat_number, address_id, team_id, etc.
-- Drop: street, street_number, city, postal_code, address, country

ALTER TABLE companies
  DROP COLUMN IF EXISTS street,
  DROP COLUMN IF EXISTS street_number,
  DROP COLUMN IF EXISTS city,
  DROP COLUMN IF EXISTS postal_code,
  DROP COLUMN IF EXISTS address,
  DROP COLUMN IF EXISTS country;

-- ============================================================================
-- ADD COMMENTS
-- ============================================================================
COMMENT ON COLUMN buildings.address_id IS 'Reference to centralized addresses table (required for all buildings)';
COMMENT ON COLUMN lots.address_id IS 'Reference to centralized addresses table (required for independent lots, NULL for building lots)';
COMMENT ON COLUMN companies.address_id IS 'Reference to centralized addresses table (optional for companies)';

-- ============================================================================
-- VERIFICATION QUERIES (run after migration)
-- ============================================================================
--
-- Verify buildings structure:
-- SELECT column_name FROM information_schema.columns WHERE table_name = 'buildings' ORDER BY ordinal_position;
--
-- Verify lots structure:
-- SELECT column_name FROM information_schema.columns WHERE table_name = 'lots' ORDER BY ordinal_position;
--
-- Verify companies structure:
-- SELECT column_name FROM information_schema.columns WHERE table_name = 'companies' ORDER BY ordinal_position;
