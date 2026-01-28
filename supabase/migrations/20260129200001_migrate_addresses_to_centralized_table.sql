-- Migration: Migrate existing address data to centralized addresses table
-- This migration moves address data from buildings, lots, and companies to the addresses table
-- and sets up the address_id foreign key references.
--
-- IMPORTANT: This migration DOES NOT drop the original columns yet.
-- Column cleanup will be done in a separate migration after validation.

-- ============================================================================
-- STEP 1: Migrate addresses from buildings table
-- ============================================================================

-- Insert addresses from buildings that have address data but no address_id
INSERT INTO addresses (id, street, postal_code, city, country, team_id, created_at)
SELECT
  gen_random_uuid(),
  b.address,
  b.postal_code,
  b.city,
  b.country,
  b.team_id,
  COALESCE(b.created_at, NOW())
FROM buildings b
WHERE b.address_id IS NULL
  AND b.address IS NOT NULL
  AND b.address != ''
  AND b.deleted_at IS NULL;

-- Update buildings with their new address_id
UPDATE buildings b
SET address_id = (
  SELECT a.id
  FROM addresses a
  WHERE a.street = b.address
    AND a.postal_code = b.postal_code
    AND a.city = b.city
    AND a.team_id = b.team_id
    AND a.deleted_at IS NULL
  ORDER BY a.created_at DESC
  LIMIT 1
)
WHERE b.address_id IS NULL
  AND b.address IS NOT NULL
  AND b.address != '';

-- ============================================================================
-- STEP 2: Migrate addresses from lots table (independent lots only)
-- ============================================================================

-- Insert addresses from lots that have address data but no address_id and no building
INSERT INTO addresses (id, street, postal_code, city, country, team_id, created_at)
SELECT
  gen_random_uuid(),
  l.street,
  l.postal_code,
  l.city,
  COALESCE(l.country, 'belgique'),
  l.team_id,
  COALESCE(l.created_at, NOW())
FROM lots l
WHERE l.address_id IS NULL
  AND l.building_id IS NULL  -- Only independent lots (not attached to buildings)
  AND l.street IS NOT NULL
  AND l.street != ''
  AND l.deleted_at IS NULL;

-- Update lots with their new address_id
UPDATE lots l
SET address_id = (
  SELECT a.id
  FROM addresses a
  WHERE a.street = l.street
    AND a.postal_code = l.postal_code
    AND a.city = l.city
    AND a.team_id = l.team_id
    AND a.deleted_at IS NULL
  ORDER BY a.created_at DESC
  LIMIT 1
)
WHERE l.address_id IS NULL
  AND l.building_id IS NULL
  AND l.street IS NOT NULL
  AND l.street != '';

-- ============================================================================
-- STEP 3: Migrate addresses from companies table
-- ============================================================================

-- Insert addresses from companies that have address data but no address_id
-- Note: companies have both 'address' and 'street' columns, we prioritize 'street' if available
INSERT INTO addresses (id, street, postal_code, city, country, team_id, created_at)
SELECT
  gen_random_uuid(),
  COALESCE(
    NULLIF(TRIM(CONCAT(c.street_number, ' ', c.street)), ''),
    c.address
  ),
  c.postal_code,
  c.city,
  -- Map company country string to enum (companies use string, addresses use enum)
  CASE LOWER(TRIM(COALESCE(c.country, 'belgique')))
    WHEN 'belgium' THEN 'belgique'::country
    WHEN 'belgique' THEN 'belgique'::country
    WHEN 'be' THEN 'belgique'::country
    WHEN 'france' THEN 'france'::country
    WHEN 'fr' THEN 'france'::country
    WHEN 'luxembourg' THEN 'luxembourg'::country
    WHEN 'lu' THEN 'luxembourg'::country
    WHEN 'netherlands' THEN 'pays_bas'::country
    WHEN 'pays-bas' THEN 'pays_bas'::country
    WHEN 'pays bas' THEN 'pays_bas'::country
    WHEN 'nl' THEN 'pays_bas'::country
    WHEN 'germany' THEN 'allemagne'::country
    WHEN 'allemagne' THEN 'allemagne'::country
    WHEN 'de' THEN 'allemagne'::country
    WHEN 'switzerland' THEN 'suisse'::country
    WHEN 'suisse' THEN 'suisse'::country
    WHEN 'ch' THEN 'suisse'::country
    ELSE 'autre'::country
  END,
  c.team_id,
  COALESCE(c.created_at, NOW())
FROM companies c
WHERE c.address_id IS NULL
  AND (
    (c.street IS NOT NULL AND c.street != '') OR
    (c.address IS NOT NULL AND c.address != '')
  )
  AND c.deleted_at IS NULL;

-- Update companies with their new address_id
UPDATE companies c
SET address_id = (
  SELECT a.id
  FROM addresses a
  WHERE a.postal_code = c.postal_code
    AND a.city = c.city
    AND a.team_id = c.team_id
    AND a.deleted_at IS NULL
    AND (
      a.street = COALESCE(NULLIF(TRIM(CONCAT(c.street_number, ' ', c.street)), ''), c.address)
      OR a.street = c.address
    )
  ORDER BY a.created_at DESC
  LIMIT 1
)
WHERE c.address_id IS NULL
  AND (
    (c.street IS NOT NULL AND c.street != '') OR
    (c.address IS NOT NULL AND c.address != '')
  );

-- ============================================================================
-- STEP 4: Create indexes for better query performance
-- ============================================================================

-- Index for address lookups by team (if not exists)
CREATE INDEX IF NOT EXISTS idx_addresses_team_id_not_deleted
ON addresses(team_id)
WHERE deleted_at IS NULL;

-- Index for duplicate detection
CREATE INDEX IF NOT EXISTS idx_addresses_street_postal_city_team
ON addresses(street, postal_code, city, team_id)
WHERE deleted_at IS NULL;

-- ============================================================================
-- VALIDATION QUERIES (run these after migration to verify)
-- ============================================================================
--
-- Check buildings without address_id:
-- SELECT COUNT(*) FROM buildings WHERE address_id IS NULL AND address IS NOT NULL AND deleted_at IS NULL;
--
-- Check lots without address_id (independent only):
-- SELECT COUNT(*) FROM lots WHERE address_id IS NULL AND building_id IS NULL AND street IS NOT NULL AND deleted_at IS NULL;
--
-- Check companies without address_id:
-- SELECT COUNT(*) FROM companies WHERE address_id IS NULL AND (street IS NOT NULL OR address IS NOT NULL) AND deleted_at IS NULL;
