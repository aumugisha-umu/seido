-- ============================================================================
-- FIX RLS POLICY interventions INSERT - Allow Managers to Create Interventions
-- ============================================================================
-- Date: 2025-10-15 17:30
-- Issue: Policy interventions_insert ONLY allows tenants (tenant_id = auth.uid())
--        Gestionnaires cannot create interventions for tenants
-- Root Cause: interventions_insert checks tenant_id = auth.uid(), which fails
--             when manager creates intervention with tenant_id = actual tenant
-- Solution: Split into TWO policies:
--           (1) interventions_insert_tenant (original - locataires)
--           (2) interventions_insert_manager (NEW - gestionnaires)
-- ============================================================================

-- ----------------------------------------------------------------------------
-- DROP ancienne policy unique (locataires seulement)
-- ----------------------------------------------------------------------------
DROP POLICY IF EXISTS "interventions_insert" ON interventions;

-- ----------------------------------------------------------------------------
-- POLICY 1: INSERT pour LOCATAIRES (original logic)
-- ----------------------------------------------------------------------------
CREATE POLICY "interventions_insert_tenant" ON interventions
FOR INSERT
TO authenticated
WITH CHECK (
  -- User must be the tenant
  tenant_id IN (
    SELECT u.id FROM users u
    WHERE u.auth_user_id = auth.uid()
  )
  AND (
    -- Lot-level: user is tenant of the lot
    (lot_id IS NOT NULL AND is_tenant_of_lot(lot_id))
    OR
    -- Building-level: user is tenant of a lot in the building
    (building_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM lots l
      WHERE l.building_id = interventions.building_id
        AND is_tenant_of_lot(l.id)
    ))
  )
);

COMMENT ON POLICY "interventions_insert_tenant" ON interventions IS
  'Permet aux LOCATAIRES de créer des interventions pour leurs lots/immeubles';

-- ----------------------------------------------------------------------------
-- POLICY 2: INSERT pour GESTIONNAIRES (NEW - critical for manager creation)
-- ----------------------------------------------------------------------------
CREATE POLICY "interventions_insert_manager" ON interventions
FOR INSERT
TO authenticated
WITH CHECK (
  -- User must be team manager of the intervention's team
  is_team_manager(team_id)
  AND
  -- Must have either lot_id OR building_id
  (lot_id IS NOT NULL OR building_id IS NOT NULL)
);

COMMENT ON POLICY "interventions_insert_manager" ON interventions IS
  'Permet aux GESTIONNAIRES de créer des interventions pour leurs équipes (tenant_id peut être différent de auth.uid())';

-- ============================================================================
-- VERIFICATION
-- ============================================================================

-- Test 1: Vérifier que les deux policies existent
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'interventions'
      AND policyname = 'interventions_insert_tenant'
  ) THEN
    RAISE NOTICE '✅ Policy interventions_insert_tenant créée avec succès';
  ELSE
    RAISE EXCEPTION '❌ ERREUR: Policy interventions_insert_tenant manquante';
  END IF;

  IF EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'interventions'
      AND policyname = 'interventions_insert_manager'
  ) THEN
    RAISE NOTICE '✅ Policy interventions_insert_manager créée avec succès';
  ELSE
    RAISE EXCEPTION '❌ ERREUR: Policy interventions_insert_manager manquante';
  END IF;
END $$;

-- Test 2: Afficher les policies interventions
SELECT
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd
FROM pg_policies
WHERE tablename = 'interventions'
  AND policyname LIKE 'interventions_insert%'
ORDER BY policyname;

-- ============================================================================
-- NOTES TECHNIQUES
-- ============================================================================
--
-- AVANT (Phase 3 original - locataires UNIQUEMENT):
-- ----------------------------------------
-- CREATE POLICY interventions_insert ON interventions
--   FOR INSERT
--   WITH CHECK (
--     tenant_id = auth.uid()  -- ❌ BLOQUE les gestionnaires
--     AND (lot_id IS NOT NULL OR building_id IS NOT NULL)
--   );
--
-- PROBLÈME:
-- - Gestionnaire (auth.uid() = gestionnaire_id) essaie d'insérer
-- - Avec tenant_id = locataire_id (✅ Correct métier)
-- - Policy vérifie: tenant_id (= locataire_id) == auth.uid() (= gestionnaire_id)
-- - Résultat: ❌ FAIL → INSERT refusé → intervention.id = NULL
-- - Code essaie d'insérer assignments avec intervention_id: NULL → Erreur 23502
--
-- APRÈS (Fix - deux policies distinctes):
-- ----------------------------------------
-- Policy 1 (interventions_insert_tenant):
--   - Pour locataires créant leurs propres interventions
--   - Vérifie que tenant_id = auth.uid() (via users table)
--   - Vérifie que locataire est bien tenant du lot/building
--
-- Policy 2 (interventions_insert_manager - NOUVEAU):
--   - Pour gestionnaires créant interventions pour leurs locataires
--   - Vérifie UNIQUEMENT que user est team manager de l'équipe
--   - PAS de vérification tenant_id = auth.uid() (car tenant != manager)
--   - Permet tenant_id différent de auth.uid()
--
-- SOLUTION:
-- - Locataires peuvent créer leurs propres interventions (policy 1)
-- - Gestionnaires peuvent créer interventions pour leurs locataires (policy 2)
-- - Plus de conflit entre auth.uid() et tenant_id
-- - Intervention.create() réussit → intervention.id NOT NULL
-- - Assignments insérés avec intervention_id valide → ✅ SUCCESS
--
-- ============================================================================
