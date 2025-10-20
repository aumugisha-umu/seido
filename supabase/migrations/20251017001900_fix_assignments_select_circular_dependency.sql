-- ============================================================================
-- FIX CIRCULAR DEPENDENCY - intervention_assignments SELECT policy
-- ============================================================================
-- Date: 2025-10-17 00:19
-- Issue: La policy SELECT appelle can_view_intervention() qui appelle
--        is_assigned_to_intervention() qui doit SELECT sur intervention_assignments
--        → Dépendance circulaire causant un blocage RLS
-- Symptom: Les assignments sont créées dans la DB mais invisibles dans l'UI
-- Solution: Policy SELECT directe sans dépendance circulaire
-- ============================================================================

-- ----------------------------------------------------------------------------
-- DROP ancienne policy problématique
-- ----------------------------------------------------------------------------
DROP POLICY IF EXISTS "assignments_select" ON intervention_assignments;

-- ----------------------------------------------------------------------------
-- CREATE nouvelle policy sans dépendance circulaire
-- ----------------------------------------------------------------------------
CREATE POLICY "assignments_select" ON intervention_assignments
FOR SELECT
TO authenticated
USING (
  -- OPTION 1: User est gestionnaire/admin de l'équipe de l'intervention
  -- (Cette vérification ne dépend PAS de intervention_assignments)
  is_manager_of_intervention_team(intervention_id)

  OR

  -- OPTION 2: User est le tenant de l'intervention
  -- (Vérifie via intervention_assignments.role='locataire' mais c'est OK
  --  car is_tenant_of_intervention utilise une sous-requête différente)
  is_tenant_of_intervention(intervention_id)

  OR

  -- OPTION 3: User est l'utilisateur assigné lui-même
  -- (Vérification DIRECTE sans appel de fonction = pas de circularité)
  user_id IN (
    SELECT u.id FROM users u
    WHERE u.auth_user_id = auth.uid()
  )
);

COMMENT ON POLICY "assignments_select" ON intervention_assignments IS
  'RLS Fix 2025-10-17: Permet SELECT si (1) manager équipe OU (2) tenant OU (3) user assigné. SANS dépendance circulaire.';

-- ----------------------------------------------------------------------------
-- Vérification de la policy
-- ----------------------------------------------------------------------------
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'intervention_assignments'
      AND policyname = 'assignments_select'
  ) THEN
    RAISE NOTICE '✅ Policy assignments_select reconstruite avec succès';
  ELSE
    RAISE EXCEPTION '❌ ERREUR: Policy assignments_select manquante après migration';
  END IF;
END $$;

-- ============================================================================
-- NOTES TECHNIQUES
-- ============================================================================
--
-- AVANT (Dépendance circulaire):
-- --------------------------------
-- CREATE POLICY assignments_select ON intervention_assignments
-- FOR SELECT
-- USING (
--   can_view_intervention(intervention_id)  -- ❌ Appelle is_assigned_to_intervention()
-- );                                         --    qui doit SELECT sur cette table !
--
-- PROBLÈME:
-- can_view_intervention() → is_assigned_to_intervention() → SELECT intervention_assignments
-- → assignments_select policy → can_view_intervention() → BOUCLE !
--
-- APRÈS (Logique directe):
-- ------------------------
-- CREATE POLICY assignments_select ON intervention_assignments
-- FOR SELECT
-- USING (
--   is_manager_of_intervention_team(intervention_id)  -- ✅ Vérifie team_id directement
--   OR is_tenant_of_intervention(intervention_id)     -- ✅ Vérifie via autre méthode
--   OR user_id IN (SELECT u.id ...)                   -- ✅ Vérification SQL directe
-- );
--
-- AVANTAGES:
-- 1. Pas de dépendance circulaire
-- 2. Performance: 3 vérifications parallèles (OR)
-- 3. Lisibilité: Logique explicite
-- 4. Extensibilité: Facile d'ajouter d'autres conditions
--
-- ============================================================================
