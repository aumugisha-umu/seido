-- ============================================================================
-- FIX RLS POLICY team_members SELECT - Dashboard vide apres Phase 3
-- ============================================================================
-- Date: 2025-10-15
-- Issue: La policy team_members_select utilise une recursion qui echoue
--        en mode Server Component, causant 0 resultats sur getUserTeams()
-- Solution: Simplifier la policy avec verification directe auth.uid()
-- ============================================================================

-- ----------------------------------------------------------------------------
-- DROP ancienne policy recursive (Phase 1)
-- ----------------------------------------------------------------------------
DROP POLICY IF EXISTS "team_members_select" ON team_members;

-- ----------------------------------------------------------------------------
-- CREATE nouvelle policy simplifiee et performante
-- ----------------------------------------------------------------------------
CREATE POLICY "team_members_select" ON team_members
FOR SELECT
TO authenticated
USING (
  -- OPTION 1: User consulte ses propres memberships
  -- Verification directe via auth.uid() -> users.auth_user_id -> team_members.user_id
  EXISTS (
    SELECT 1 FROM users u
    WHERE u.auth_user_id = auth.uid()
      AND u.id = team_members.user_id
  )
  OR
  -- OPTION 2: User est admin/gestionnaire de cette team
  -- Peut voir tous les membres de ses teams
  EXISTS (
    SELECT 1 FROM team_members tm
    INNER JOIN users u ON u.id = tm.user_id
    WHERE u.auth_user_id = auth.uid()
      AND tm.team_id = team_members.team_id
      AND tm.left_at IS NULL
      AND tm.role = 'admin'
  )
);

COMMENT ON POLICY "team_members_select" ON team_members IS
  'Fix Phase 3: Verification directe auth.uid() sans recursion. Permet: (1) User voit ses memberships, (2) Admin voit tous les membres de ses teams';

-- ============================================================================
-- VERIFICATION
-- ============================================================================

-- Test 1: Verifier que la policy existe
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'team_members'
      AND policyname = 'team_members_select'
  ) THEN
    RAISE NOTICE ' Policy team_members_select reconstruite avec succes';
  ELSE
    RAISE EXCEPTION 'L ERREUR: Policy team_members_select manquante apres migration';
  END IF;
END $$;

-- Test 2: Afficher la definition de la policy
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
WHERE tablename = 'team_members' AND policyname = 'team_members_select';

-- ============================================================================
-- NOTES
-- ============================================================================
--
-- AVANT (Phase 1 - recursif):
-- ----------------------------------------
-- USING (
--   EXISTS (
--     SELECT tm.user_id
--     FROM team_members tm
--     WHERE tm.team_id IN (SELECT get_user_teams_v2())  <- RECURSION ICI
--     AND tm.left_at IS NULL
--   )
-- );
--
-- PROBLEME: get_user_teams_v2() interroge team_members, qui appelle sa propre
--           policy RLS, qui re-appelle get_user_teams_v2() -> boucle infinie
--           ou resultats vides selon le contexte (Server Component vs Browser)
--
-- APRES (Fix Phase 3 - direct):
-- ----------------------------------------
-- USING (
--   EXISTS (SELECT 1 FROM users WHERE auth_user_id = auth.uid() AND id = team_members.user_id)
--   OR
--   EXISTS (SELECT 1 FROM team_members tm JOIN users u ...)  <- PAS DE RECURSION
-- );
--
-- SOLUTION: Verification directe via users.auth_user_id = auth.uid()
--           Plus de recursion, politique stable dans tous les contextes
--
-- ============================================================================
