-- ============================================================================
-- MIGRATION: Phase 2.5 - Lot apartment_number & lots_with_contacts view
-- Date: 2025-10-12
-- Description:
--   - Ajout du champ apartment_number à la table lots
--   - Création de la vue lots_with_contacts (agrège compteurs contacts)
--   - Simplification des fonctions RLS helpers
--   - Nettoyage des fonctions de debug temporaires
-- ============================================================================

-- ============================================================================
-- SECTION 1: AJOUT DU CHAMP APARTMENT_NUMBER
-- ============================================================================

-- Ajouter le champ apartment_number à la table lots
ALTER TABLE lots ADD COLUMN apartment_number TEXT;

-- Index pour recherche par numéro de porte (souvent utilisé avec building_id)
CREATE INDEX idx_lots_apartment_number ON lots(building_id, apartment_number)
  WHERE apartment_number IS NOT NULL AND building_id IS NOT NULL;

-- Commentaire pour documentation
COMMENT ON COLUMN lots.apartment_number IS 'Numéro de porte/appartement (ex: "A12", "Porte 3", "301")';

-- ============================================================================
-- SECTION 2: CRÉATION DE LA VUE LOTS_WITH_CONTACTS
-- ============================================================================

-- Vue agrégée: lots avec compteurs de contacts par rôle
-- Note: Le code a un fallback si cette vue n'existe pas, mais on la crée
-- pour éviter les warnings TypeScript et améliorer les performances
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

-- ============================================================================
-- SECTION 3: SIMPLIFICATION DES FONCTIONS RLS HELPERS
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Simplifier get_lot_team_id() : team_id est NOT NULL, pas besoin de COALESCE
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION get_lot_team_id(lot_uuid UUID)
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT team_id FROM lots WHERE id = lot_uuid;
$$;

COMMENT ON FUNCTION get_lot_team_id IS 'Récupère le team_id d''un lot (simplifié: team_id est obligatoire)';

-- ============================================================================
-- SECTION 4: NETTOYAGE DES FONCTIONS TEMPORAIRES
-- ============================================================================

-- Supprimer la fonction de debug temporaire (plus nécessaire après stabilisation Phase 2)
DROP FUNCTION IF EXISTS debug_check_building_insert(UUID);

-- ============================================================================
-- SECTION 5: VALIDATION ET LOGS
-- ============================================================================

DO $$
DECLARE
  lots_count INTEGER;
  lots_with_apartment_number INTEGER;
  view_exists BOOLEAN;
BEGIN
  -- Compter les lots
  SELECT COUNT(*) INTO lots_count FROM lots WHERE deleted_at IS NULL;
  SELECT COUNT(*) INTO lots_with_apartment_number FROM lots WHERE apartment_number IS NOT NULL;

  -- Vérifier l'existence de la vue
  SELECT EXISTS (
    SELECT 1 FROM information_schema.views
    WHERE table_name = 'lots_with_contacts'
  ) INTO view_exists;

  RAISE NOTICE '=== MIGRATION PHASE 2.5 APPLIQUÉE AVEC SUCCÈS ===';
  RAISE NOTICE '✅ Colonne apartment_number ajoutée à la table lots';
  RAISE NOTICE '✅ Index idx_lots_apartment_number créé';
  RAISE NOTICE '✅ Vue lots_with_contacts créée: %', view_exists;
  RAISE NOTICE '✅ Fonction get_lot_team_id() simplifiée';
  RAISE NOTICE '✅ Fonction debug_check_building_insert() supprimée';
  RAISE NOTICE '';
  RAISE NOTICE '📊 STATISTIQUES:';
  RAISE NOTICE '   - Total lots actifs: %', lots_count;
  RAISE NOTICE '   - Lots avec apartment_number: %', lots_with_apartment_number;
  RAISE NOTICE '';
  RAISE NOTICE '📝 PROCHAINES ÉTAPES:';
  RAISE NOTICE '   1. Régénérer les types TypeScript: npm run supabase:types';
  RAISE NOTICE '   2. Tester la création/édition de lots avec apartment_number';
  RAISE NOTICE '   3. Vérifier que la vue lots_with_contacts fonctionne';
END $$;

-- ============================================================================
-- FIN DE LA MIGRATION PHASE 2.5
-- ============================================================================
