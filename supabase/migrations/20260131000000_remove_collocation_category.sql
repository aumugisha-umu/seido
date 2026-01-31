-- Migration: Remove 'collocation' from lot_category enum
-- Reason: Collocation is a mode of occupation (managed at lease level), not a property type
-- Date: 2026-01-31

-- Step 1: Convert existing 'collocation' lots to 'appartement'
UPDATE lots
SET category = 'appartement'
WHERE category = 'collocation';

-- Step 2: Drop ALL dependent views temporarily
DROP VIEW IF EXISTS lots_with_contacts CASCADE;
DROP VIEW IF EXISTS lots_active CASCADE;

-- Step 3: Remove default value temporarily
ALTER TABLE lots
  ALTER COLUMN category DROP DEFAULT;

-- Step 4: Create new enum type without 'collocation'
CREATE TYPE lot_category_new AS ENUM (
  'appartement',
  'maison',
  'garage',
  'local_commercial',
  'autre'
);

-- Step 5: Alter the column to use the new type
ALTER TABLE lots
  ALTER COLUMN category TYPE lot_category_new
  USING category::text::lot_category_new;

-- Step 6: Drop old type and rename new one
DROP TYPE lot_category;
ALTER TYPE lot_category_new RENAME TO lot_category;

-- Step 7: Restore default value
ALTER TABLE lots
  ALTER COLUMN category SET DEFAULT 'appartement'::lot_category;

-- Step 8: Recreate lots_active view
CREATE VIEW lots_active AS
SELECT * FROM lots WHERE deleted_at IS NULL;

COMMENT ON VIEW lots_active IS
'Vue sur lots actifs (non soft-deleted). Inclut lots standalone et nested. Hérite des politiques RLS de la table lots.';

GRANT SELECT ON lots_active TO authenticated;

-- Step 9: Recreate the view lots_with_contacts
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

-- Update type comment
COMMENT ON TYPE lot_category IS 'Lot category types. Note: collocation removed in 2026-01 - managed at lease level instead.';
