-- ============================================================================
-- FIX RLS POLICY intervention_assignments INSERT - Chicken-and-egg problem
-- ============================================================================
-- Date: 2025-10-15 16:50
-- Issue: La policy assignments_insert appelle can_manage_intervention() qui
--        tente de vérifier si l'intervention est visible, mais les assignments
--        n'existent pas encore au moment de l'INSERT -> échec RLS
-- Root Cause: can_manage_intervention() -> is_manager_of_intervention_team()
--             qui vérifie si user appartient à l'équipe, MAIS à l'INSERT
--             l'intervention vient juste d'être créée
-- Solution: Simplifier la policy INSERT pour vérifier directement:
--           (1) User est team manager de l'intervention
--           (2) User est celui qui fait l'assignation (assigned_by)
-- ============================================================================

-- ----------------------------------------------------------------------------
-- DROP ancienne policy problématique
-- ----------------------------------------------------------------------------
DROP POLICY IF EXISTS "assignments_insert" ON intervention_assignments;

-- ----------------------------------------------------------------------------
-- CREATE nouvelle policy simplifiée et fonctionnelle
-- ----------------------------------------------------------------------------
CREATE POLICY "assignments_insert" ON intervention_assignments
FOR INSERT
TO authenticated
WITH CHECK (
  -- OPTION 1: User est gestionnaire de l'équipe de l'intervention
  -- (utilise is_manager_of_intervention_team qui vérifie team_id directement)
  is_manager_of_intervention_team(intervention_id)

  OR

  -- OPTION 2: User est celui qui fait l'assignation (assigned_by = user.id)
  -- Résolution: auth.uid() -> users.auth_user_id -> users.id
  assigned_by IN (
    SELECT u.id FROM users u
    WHERE u.auth_user_id = auth.uid()
  )
);

COMMENT ON POLICY "assignments_insert" ON intervention_assignments IS
  'Fix Phase 3: Permet INSERT si (1) user est team manager OU (2) user est assigned_by. Évite chicken-and-egg avec can_manage_intervention().';

-- ============================================================================
-- VERIFICATION
-- ============================================================================

-- Test 1: Vérifier que la policy existe
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'intervention_assignments'
      AND policyname = 'assignments_insert'
  ) THEN
    RAISE NOTICE '✅ Policy assignments_insert reconstruite avec succès';
  ELSE
    RAISE EXCEPTION '❌ ERREUR: Policy assignments_insert manquante après migration';
  END IF;
END $$;

-- Test 2: Afficher la définition de la policy
SELECT
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual IS NOT NULL as has_using_clause,
  with_check IS NOT NULL as has_with_check_clause
FROM pg_policies
WHERE tablename = 'intervention_assignments' AND policyname = 'assignments_insert';

-- ============================================================================
-- NOTES TECHNIQUES
-- ============================================================================
--
-- AVANT (Phase 3 original - chicken-and-egg):
-- ----------------------------------------
-- WITH CHECK (
--   can_manage_intervention(intervention_id)
-- );
--
-- PROBLEME: can_manage_intervention() appelle is_manager_of_intervention_team()
--           qui vérifie team_id de l'intervention, MAIS à l'INSERT initiale
--           il n'y a pas encore d'assignments, donc certaines vérifications échouent
--
-- APRÈS (Fix - verification directe):
-- ----------------------------------------
-- WITH CHECK (
--   is_manager_of_intervention_team(intervention_id)  -- Direct team check
--   OR
--   assigned_by IN (SELECT u.id FROM users u WHERE u.auth_user_id = auth.uid())
-- );
--
-- SOLUTION:
-- - is_manager_of_intervention_team() vérifie UNIQUEMENT team_id (pas d'assignments requis)
-- - assigned_by permet au gestionnaire de s'auto-assigner lors de la création
-- - Plus de dépendance circulaire entre intervention et assignments
--
-- ============================================================================
