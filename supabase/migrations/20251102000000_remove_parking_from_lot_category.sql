-- Migration: Remove 'parking' from lot_category enum
-- Date: 2025-11-02
-- Description: Removes the 'parking' value from lot_category enum and migrates existing data to 'garage'

-- Step 1: Migrate any existing lots with category='parking' to 'garage'
UPDATE lots
SET category = 'garage'
WHERE category = 'parking';

-- Step 2: Drop dependent view temporarily
DROP VIEW IF EXISTS lots_with_contacts;

-- Step 3: Remove default value temporarily
ALTER TABLE lots
  ALTER COLUMN category DROP DEFAULT;

-- Step 4: Create new enum without 'parking'
CREATE TYPE lot_category_new AS ENUM (
  'appartement',
  'collocation',
  'maison',
  'garage',
  'local_commercial',
  'autre'
);

-- Step 5: Alter the lots table to use the new enum
ALTER TABLE lots
  ALTER COLUMN category TYPE lot_category_new
  USING category::text::lot_category_new;

-- Step 6: Drop the old enum and rename the new one
DROP TYPE lot_category;
ALTER TYPE lot_category_new RENAME TO lot_category;

-- Step 7: Restore default value
ALTER TABLE lots
  ALTER COLUMN category SET DEFAULT 'appartement'::lot_category;

-- Step 8: Recreate the view lots_with_contacts
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

-- Update comments
COMMENT ON TYPE lot_category IS 'Types de lots (appartements, maisons, locaux commerciaux, garages, etc.)';
COMMENT ON VIEW lots_with_contacts IS 'Vue agrégée: lots avec compteurs de contacts par rôle (locataires, gestionnaires, prestataires)';
