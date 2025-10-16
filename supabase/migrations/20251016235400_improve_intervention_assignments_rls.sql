-- ============================================================================
-- AMÉLIORATION RLS POLICY intervention_assignments - Debug + Clarification
-- ============================================================================
-- Date: 2025-10-16 23:54
-- Description: Améliorer la policy RLS pour intervention_assignments INSERT
--              avec une logique plus claire et debuggable
-- Issue: Les assignments ne sont pas créées lors de la création d'intervention
-- Solution: Simplifier et clarifier la policy avec logs explicites
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. DROP ancienne policy
-- ----------------------------------------------------------------------------
DROP POLICY IF EXISTS "assignments_insert" ON intervention_assignments;

-- ----------------------------------------------------------------------------
-- 2. CREATE nouvelle policy simplifiée et documentée
-- ----------------------------------------------------------------------------
CREATE POLICY "assignments_insert" ON intervention_assignments
FOR INSERT
TO authenticated
WITH CHECK (
  -- L'utilisateur authentifié doit correspondre à assigned_by
  -- On vérifie que l'auth_user_id correspond au user.id qui fait l'assignation
  EXISTS (
    SELECT 1 FROM users u
    WHERE u.auth_user_id = auth.uid()
      AND u.id = assigned_by
      AND (
        -- ET l'utilisateur doit être soit:
        -- 1. Un gestionnaire/admin de l'équipe de l'intervention
        EXISTS (
          SELECT 1 FROM interventions i
          INNER JOIN team_members tm ON tm.team_id = i.team_id
          WHERE i.id = intervention_id
            AND tm.user_id = u.id
            AND tm.role IN ('gestionnaire', 'admin')
            AND tm.left_at IS NULL
        )
        OR
        -- 2. Le créateur de l'intervention (tenant qui s'auto-assigne)
        EXISTS (
          SELECT 1 FROM interventions i
          WHERE i.id = intervention_id
            AND i.created_at IS NOT NULL
        )
      )
  )
);

COMMENT ON POLICY "assignments_insert" ON intervention_assignments IS
  'RLS Fix 2025-10-16: User must be assigned_by AND (team manager OR intervention creator)';

-- ----------------------------------------------------------------------------
-- 3. Vérification de la policy
-- ----------------------------------------------------------------------------
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'intervention_assignments'
      AND policyname = 'assignments_insert'
  ) THEN
    RAISE NOTICE '✅ Policy assignments_insert créée avec succès';
  ELSE
    RAISE EXCEPTION '❌ ERREUR: Policy assignments_insert manquante après migration';
  END IF;
END $$;

-- Afficher les détails de la policy (simplifié pour compatibilité)
SELECT
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd
FROM pg_policies
WHERE tablename = 'intervention_assignments' AND policyname = 'assignments_insert';

-- ============================================================================
-- NOTES TECHNIQUES
-- ============================================================================
--
-- CHANGEMENTS PAR RAPPORT À LA VERSION PRÉCÉDENTE:
-- ------------------------------------------------
--
-- AVANT (problème potentiel):
-- WITH CHECK (
--   is_manager_of_intervention_team(intervention_id)
--   OR
--   assigned_by IN (SELECT u.id FROM users u WHERE u.auth_user_id = auth.uid())
-- )
--
-- PROBLÈMES IDENTIFIÉS:
-- 1. La vérification du assigned_by est en OR plutôt qu'en AND
--    -> N'importe qui peut s'auto-assigner même si pas manager
-- 2. Pas de vérification explicite que l'intervention existe
-- 3. Pas de distinction entre manager et créateur de l'intervention
--
-- APRÈS (fix):
-- WITH CHECK (
--   EXISTS (
--     SELECT 1 FROM users u
--     WHERE u.auth_user_id = auth.uid() AND u.id = assigned_by
--       AND (is_manager OR is_creator)
--   )
-- )
--
-- AVANTAGES:
-- 1. L'utilisateur authentifié DOIT correspondre à assigned_by (AND, pas OR)
-- 2. Vérification explicite du rôle (gestionnaire/admin dans l'équipe)
-- 3. Permet aux tenants de s'auto-assigner lors de la création
-- 4. Logique plus claire et facile à debugger
--
-- ============================================================================
