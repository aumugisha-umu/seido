-- ============================================================================
-- ROLLBACK: Restaurer policy team_members_select Phase 1 (correcte)
-- ============================================================================
-- Date: 2025-10-15
-- Issue: Ma correction precedente causait recursion infinie car :
--        team_members policy -> users -> team_members -> BOUCLE
-- Solution: Restaurer policy Phase 1 qui utilise get_user_teams_v2()
--           (fonction SECURITY DEFINER qui bypass RLS = pas de recursion)
-- ============================================================================

-- ----------------------------------------------------------------------------
-- DROP ma correction incorrecte (20251015101339)
-- ----------------------------------------------------------------------------
DROP POLICY IF EXISTS "team_members_select" ON team_members;

-- ----------------------------------------------------------------------------
-- RESTORE policy Phase 1 originale (ligne 750-752 de Phase 1)
-- ----------------------------------------------------------------------------
CREATE POLICY "team_members_select" ON team_members FOR SELECT
TO authenticated
USING (team_id IN (SELECT get_user_teams_v2()));

COMMENT ON POLICY "team_members_select" ON team_members IS
  'Phase 1 originale restauree: Utilise get_user_teams_v2() (SECURITY DEFINER) qui bypass RLS = pas de recursion. User voit membres de ses teams.';

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
    RAISE NOTICE ' Policy team_members_select restauree avec succes (Phase 1)';
  ELSE
    RAISE EXCEPTION 'L ERREUR: Policy team_members_select manquante apres rollback';
  END IF;
END $$;

-- Test 2: Afficher la definition de la policy
-- Note: pg_get_expr necessite pg_catalog, utiliser une approche simplifiee
DO $$
DECLARE
  policy_exists BOOLEAN;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'team_members' AND policyname = 'team_members_select'
  ) INTO policy_exists;

  IF policy_exists THEN
    RAISE NOTICE '✅ Policy team_members_select est active';
  ELSE
    RAISE WARNING '⚠️ Policy team_members_select introuvable';
  END IF;
END $$;

-- ============================================================================
-- DIAGNOSTIC: Verifier donnees team_members.left_at
-- ============================================================================

-- Compter membres actifs (left_at IS NULL)
DO $$
DECLARE
  active_count INT;
  inactive_count INT;
BEGIN
  SELECT COUNT(*) INTO active_count FROM team_members WHERE left_at IS NULL;
  SELECT COUNT(*) INTO inactive_count FROM team_members WHERE left_at IS NOT NULL;

  RAISE NOTICE '=� Diagnostic team_members:';
  RAISE NOTICE '   " Membres actifs (left_at IS NULL): %', active_count;
  RAISE NOTICE '   " Membres inactifs (left_at non-NULL): %', inactive_count;

  IF active_count = 0 THEN
    RAISE WARNING '� ATTENTION: 0 membres actifs detectes ! Verifier donnees team_members.';
  END IF;
END $$;

-- ============================================================================
-- NOTES
-- ============================================================================
--
-- POURQUOI LE ROLLBACK ?
-- ----------------------------------------
--
-- Ma correction (20251015101339) utilisait :
-- USING (
--   EXISTS (SELECT 1 FROM users WHERE auth_user_id = auth.uid() AND id = team_members.user_id)
--   OR ...
-- )
--
-- PROBLEME: La table users a une policy qui interroge team_members :
-- users_select_team_members_managers:
--   id IN (SELECT tm.user_id FROM team_members tm WHERE ...)
--
-- -> RECURSION INFINIE: team_members -> users -> team_members -> ...
--
-- SOLUTION PHASE 1 ORIGINALE:
-- ----------------------------------------
-- USING (team_id IN (SELECT get_user_teams_v2()))
--
-- get_user_teams_v2() est declare SECURITY DEFINER :
-- CREATE OR REPLACE FUNCTION public.get_user_teams_v2()
-- LANGUAGE plpgsql
-- SECURITY DEFINER STABLE  <- BYPASS les RLS policies !
--
-- -> PAS DE RECURSION car la fonction ne declenche pas les RLS lors de l'acces a team_members
--
-- C'est exactement ce pattern qu'utilise Phase 1 pour eviter les recursions RLS.
-- Ma correction etait donc inutile et incorrecte.
--
-- ============================================================================
