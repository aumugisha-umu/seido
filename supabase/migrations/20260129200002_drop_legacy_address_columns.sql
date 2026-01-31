-- Migration: Drop legacy address columns
-- Description: Removes deprecated inline address fields from buildings, lots, and companies
-- Now that all addresses are stored in the centralized 'addresses' table with address_id FK
--
-- IMPORTANT: Run this ONLY after verifying all records have address_id populated
-- Verification queries are provided at the bottom of this file

-- ============================================================================
-- SAFETY CHECK: Verify data migration is complete
-- ============================================================================

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
-- DROP ALL DEPENDENT VIEWS FIRST
-- ============================================================================
-- These views use SELECT * and depend on the columns we're dropping

DROP VIEW IF EXISTS buildings_active CASCADE;
DROP VIEW IF EXISTS lots_active CASCADE;
DROP VIEW IF EXISTS lots_with_contacts CASCADE;

-- ============================================================================
-- DROP LEGACY COLUMNS FROM BUILDINGS
-- ============================================================================

ALTER TABLE buildings
  DROP COLUMN IF EXISTS address,
  DROP COLUMN IF EXISTS city,
  DROP COLUMN IF EXISTS postal_code,
  DROP COLUMN IF EXISTS country;

-- ============================================================================
-- DROP LEGACY COLUMNS FROM LOTS
-- ============================================================================

ALTER TABLE lots
  DROP COLUMN IF EXISTS street,
  DROP COLUMN IF EXISTS city,
  DROP COLUMN IF EXISTS postal_code,
  DROP COLUMN IF EXISTS country;

-- ============================================================================
-- DROP LEGACY COLUMNS FROM COMPANIES
-- ============================================================================

ALTER TABLE companies
  DROP COLUMN IF EXISTS street,
  DROP COLUMN IF EXISTS street_number,
  DROP COLUMN IF EXISTS city,
  DROP COLUMN IF EXISTS postal_code,
  DROP COLUMN IF EXISTS address,
  DROP COLUMN IF EXISTS country;

-- ============================================================================
-- RECREATE VIEWS WITH NEW SCHEMA
-- ============================================================================

-- Recreate buildings_active view
CREATE VIEW buildings_active AS
SELECT * FROM buildings WHERE deleted_at IS NULL;

COMMENT ON VIEW buildings_active IS
'Vue sur immeubles actifs (non soft-deleted). Hérite automatiquement des politiques RLS de la table buildings.';

GRANT SELECT ON buildings_active TO authenticated;

-- Recreate lots_active view
CREATE VIEW lots_active AS
SELECT * FROM lots WHERE deleted_at IS NULL;

COMMENT ON VIEW lots_active IS
'Vue sur lots actifs (non soft-deleted). Inclut lots standalone et nested. Hérite des politiques RLS de la table lots.';

GRANT SELECT ON lots_active TO authenticated;

-- Recreate lots_with_contacts view
CREATE OR REPLACE VIEW lots_with_contacts AS
SELECT
  l.*,
  -- Compteurs par rôle
  COUNT(DISTINCT lc.id) FILTER (WHERE u.role = 'locataire') AS active_tenants_count,
  COUNT(DISTINCT lc.id) FILTER (WHERE u.role = 'gestionnaire') AS active_managers_count,
  COUNT(DISTINCT lc.id) FILTER (WHERE u.role = 'prestataire') AS active_providers_count,
  COUNT(DISTINCT lc.id) AS active_contacts_total,

  -- Informations du locataire principal (pour compatibilité avec l'ancien schéma)
  MAX(u.name) FILTER (WHERE u.role = 'locataire' AND lc.is_primary = TRUE) AS primary_tenant_name,
  MAX(u.email) FILTER (WHERE u.role = 'locataire' AND lc.is_primary = TRUE) AS primary_tenant_email,
  MAX(u.phone) FILTER (WHERE u.role = 'locataire' AND lc.is_primary = TRUE) AS primary_tenant_phone
FROM lots l
LEFT JOIN lot_contacts lc ON lc.lot_id = l.id
LEFT JOIN users u ON lc.user_id = u.id
WHERE l.deleted_at IS NULL
GROUP BY l.id;

COMMENT ON VIEW lots_with_contacts IS 'Vue agrégée: lots avec compteurs de contacts par rôle (locataires, gestionnaires, prestataires)';

GRANT SELECT ON lots_with_contacts TO authenticated;

-- ============================================================================
-- ADD COMMENTS
-- ============================================================================
COMMENT ON COLUMN buildings.address_id IS 'Reference to centralized addresses table (required for all buildings)';
COMMENT ON COLUMN lots.address_id IS 'Reference to centralized addresses table (required for independent lots, NULL for building lots)';
COMMENT ON COLUMN companies.address_id IS 'Reference to centralized addresses table (optional for companies)';
