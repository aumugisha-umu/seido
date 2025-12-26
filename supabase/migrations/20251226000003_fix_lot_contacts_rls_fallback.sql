-- ============================================================================
-- Migration: Fix lot_contacts RLS policy with fallback
-- Date: 2025-12-26
-- Description: Corrige la politique RLS de lot_contacts pour fonctionner
--              même si team_id n'est pas encore peuplé (fallback vers can_view_lot)
-- Impact: Restaure l'accès aux lot_contacts pour les gestionnaires
-- ============================================================================

-- ============================================================================
-- ÉTAPE 1: CORRIGER LA POLITIQUE SELECT AVEC FALLBACK
-- ============================================================================

-- La politique actuelle ne fonctionne que si team_id est peuplé.
-- On ajoute un fallback vers can_view_lot(lot_id) pour les cas où team_id est NULL.

DROP POLICY IF EXISTS lot_contacts_select ON lot_contacts;
CREATE POLICY lot_contacts_select ON lot_contacts
FOR SELECT USING (
  is_admin()
  OR user_id = get_current_user_id()
  -- Utiliser team_id si disponible (optimisé, pas de JOIN)
  OR (team_id IS NOT NULL AND is_team_manager(team_id))
  -- Fallback vers can_view_lot si team_id est NULL (compatible avec données existantes)
  OR (team_id IS NULL AND can_view_lot(lot_id))
);

COMMENT ON POLICY lot_contacts_select ON lot_contacts IS
'SELECT: Admin, contact lui-même, team_manager (via team_id optimisé ou fallback can_view_lot)';

-- ============================================================================
-- ÉTAPE 2: CORRIGER LES AUTRES POLITIQUES AVEC FALLBACK
-- ============================================================================

-- INSERT: Utiliser team_id si fourni, sinon fallback
DROP POLICY IF EXISTS lot_contacts_insert ON lot_contacts;
CREATE POLICY lot_contacts_insert ON lot_contacts
FOR INSERT WITH CHECK (
  (team_id IS NOT NULL AND is_team_manager(team_id))
  OR (team_id IS NULL AND is_team_manager(get_lot_team_id(lot_id)))
);

COMMENT ON POLICY lot_contacts_insert ON lot_contacts IS
'INSERT: Team manager (via team_id optimisé ou fallback get_lot_team_id)';

-- UPDATE: Utiliser team_id si disponible, sinon fallback
DROP POLICY IF EXISTS lot_contacts_update ON lot_contacts;
CREATE POLICY lot_contacts_update ON lot_contacts
FOR UPDATE USING (
  (team_id IS NOT NULL AND is_team_manager(team_id))
  OR (team_id IS NULL AND is_team_manager(get_lot_team_id(lot_id)))
);

COMMENT ON POLICY lot_contacts_update ON lot_contacts IS
'UPDATE: Team manager (via team_id optimisé ou fallback get_lot_team_id)';

-- DELETE: Utiliser team_id si disponible, sinon fallback
DROP POLICY IF EXISTS lot_contacts_delete ON lot_contacts;
CREATE POLICY lot_contacts_delete ON lot_contacts
FOR DELETE USING (
  (team_id IS NOT NULL AND is_team_manager(team_id))
  OR (team_id IS NULL AND is_team_manager(get_lot_team_id(lot_id)))
);

COMMENT ON POLICY lot_contacts_delete ON lot_contacts IS
'DELETE: Team manager (via team_id optimisé ou fallback get_lot_team_id)';

-- ============================================================================
-- ÉTAPE 3: S'ASSURER QUE TOUS LES LOT_CONTACTS ONT TEAM_ID
-- ============================================================================

-- Re-exécuter la population pour être sûr
UPDATE lot_contacts lc
SET team_id = (
  SELECT COALESCE(b.team_id, l.team_id)
  FROM lots l
  LEFT JOIN buildings b ON l.building_id = b.id
  WHERE l.id = lc.lot_id
)
WHERE lc.team_id IS NULL;

-- Vérifier s'il reste des NULL
DO $$
DECLARE
  v_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_count FROM lot_contacts WHERE team_id IS NULL;
  IF v_count > 0 THEN
    RAISE WARNING 'lot_contacts: % lignes sans team_id (peut-être des lots orphelins)', v_count;
  ELSE
    RAISE NOTICE 'lot_contacts: Tous les enregistrements ont un team_id valide';
  END IF;
END $$;

-- ============================================================================
-- FIN DE LA MIGRATION
-- ============================================================================
