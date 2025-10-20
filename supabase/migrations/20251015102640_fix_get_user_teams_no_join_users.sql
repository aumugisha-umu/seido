-- ============================================================================
-- FIX: Casser la recursion infinie users <-> team_members
-- ============================================================================
-- Date: 2025-10-15
-- Issue: get_user_teams_v2() fait JOIN users, causant recursion infinie :
--        users RLS policy -> get_user_teams_v2() -> JOIN users -> recursion
-- Solution: Creer get_user_id_from_auth() qui bypass users, puis refactor
--           get_user_teams_v2() pour ne plus JOIN users directement
-- ============================================================================

-- ----------------------------------------------------------------------------
-- ETAPE 1: Creer fonction helper qui recupere user_id sans passer par RLS users
-- ----------------------------------------------------------------------------

-- Cette fonction interroge users avec SECURITY DEFINER, ce qui bypass les RLS
-- Elle est APPELEE PAR get_user_teams_v2(), donc pas de recursion possible
CREATE OR REPLACE FUNCTION public.get_user_id_from_auth()
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER STABLE
AS $$
DECLARE
  v_user_id UUID;
BEGIN
  -- SELECT direct sur users.id avec SECURITY DEFINER = bypass RLS
  SELECT u.id INTO v_user_id
  FROM public.users u
  WHERE u.auth_user_id = auth.uid()
    AND u.deleted_at IS NULL
  LIMIT 1;

  RETURN v_user_id;
END;
$$;

COMMENT ON FUNCTION get_user_id_from_auth IS
  'Retourne user.id depuis auth.uid() en bypassant RLS (SECURITY DEFINER). Utilise par get_user_teams_v2() pour eviter recursion.';

-- ----------------------------------------------------------------------------
-- ETAPE 2: Refactor get_user_teams_v2() - SANS JOIN users
-- ----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.get_user_teams_v2()
RETURNS TABLE(team_id UUID)
LANGUAGE plpgsql
SECURITY DEFINER STABLE
AS $$
DECLARE
  v_user_id UUID;
BEGIN
  -- Recuperer user_id via la fonction helper (bypass RLS users)
  v_user_id := get_user_id_from_auth();

  IF v_user_id IS NULL THEN
    -- User not found, return empty set
    RETURN;
  END IF;

  -- Query team_members SANS JOIN users (evite recursion)
  RETURN QUERY
  SELECT tm.team_id
  FROM public.team_members tm
  WHERE tm.user_id = v_user_id  -- Direct comparison, pas de JOIN
    AND tm.left_at IS NULL;
END;
$$;

COMMENT ON FUNCTION get_user_teams_v2 IS
  'Liste equipes actives utilisateur (REFACTORED). Utilise get_user_id_from_auth() pour eviter JOIN users = pas de recursion RLS.';

-- ----------------------------------------------------------------------------
-- ETAPE 3: Refactor user_belongs_to_team_v2() - SANS JOIN users
-- ----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.user_belongs_to_team_v2(check_team_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER STABLE
AS $$
DECLARE
  v_user_id UUID;
BEGIN
  -- Recuperer user_id via la fonction helper (bypass RLS users)
  v_user_id := get_user_id_from_auth();

  IF v_user_id IS NULL THEN
    RETURN FALSE;
  END IF;

  -- Query team_members SANS JOIN users (evite recursion)
  RETURN EXISTS (
    SELECT 1
    FROM public.team_members tm
    WHERE tm.team_id = check_team_id
      AND tm.user_id = v_user_id  -- Direct comparison, pas de JOIN
      AND tm.left_at IS NULL
  );
END;
$$;

COMMENT ON FUNCTION user_belongs_to_team_v2 IS
  'Verifie appartenance equipe (REFACTORED). Utilise get_user_id_from_auth() pour eviter JOIN users = pas de recursion RLS.';

-- ----------------------------------------------------------------------------
-- ETAPE 4: Refactor get_current_user_role() - Utilise get_user_id_from_auth()
-- ----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.get_current_user_role()
RETURNS user_role
LANGUAGE plpgsql
SECURITY DEFINER STABLE
AS $$
DECLARE
  v_user_id UUID;
  v_role user_role;
BEGIN
  -- Recuperer user_id via la fonction helper (bypass RLS users)
  v_user_id := get_user_id_from_auth();

  IF v_user_id IS NULL THEN
    RETURN NULL;
  END IF;

  -- SELECT role avec SECURITY DEFINER = bypass RLS
  SELECT u.role INTO v_role
  FROM public.users u
  WHERE u.id = v_user_id
    AND u.deleted_at IS NULL;

  RETURN v_role;
END;
$$;

COMMENT ON FUNCTION get_current_user_role IS
  'Retourne role utilisateur connecte (REFACTORED). Utilise get_user_id_from_auth() pour eviter recursion RLS.';

-- ============================================================================
-- VERIFICATION
-- ============================================================================

DO $$
BEGIN
  RAISE NOTICE ' Fonctions RLS helpers refactorees:';
  RAISE NOTICE '   " get_user_id_from_auth() - NOUVEAU helper (bypass RLS users)';
  RAISE NOTICE '   " get_user_teams_v2() - SANS JOIN users (evite recursion)';
  RAISE NOTICE '   " user_belongs_to_team_v2() - SANS JOIN users (evite recursion)';
  RAISE NOTICE '   " get_current_user_role() - Utilise get_user_id_from_auth()';
  RAISE NOTICE '';
  RAISE NOTICE ' Recursion infinie cassee:';
  RAISE NOTICE '   AVANT: users RLS -> get_user_teams_v2() -> JOIN users -> RLS -> BOUCLE';
  RAISE NOTICE '   APRES: users RLS -> get_user_teams_v2() -> get_user_id_from_auth() (SECURITY DEFINER) -> PAS DE RECURSION';
END $$;

-- ============================================================================
-- NOTES
-- ============================================================================
--
-- ARCHITECTURE ANTI-RECURSION:
-- ----------------------------------------
--
-- LAYER 1: get_user_id_from_auth() (SECURITY DEFINER)
--   - SELECT direct sur users.id avec SECURITY DEFINER
--   - Bypass TOUTES les RLS policies de users
--   - Retourne UUID ou NULL
--   - AUCUNE dependance sur d'autres fonctions
--
-- LAYER 2: get_user_teams_v2(), user_belongs_to_team_v2(), get_current_user_role()
--   - Utilisent get_user_id_from_auth() pour obtenir user_id
--   - Interrogent team_members avec WHERE user_id = v_user_id (pas de JOIN)
--   - SECURITY DEFINER = bypass RLS de team_members
--   - Pas de recursion car team_members RLS n'appelle pas ces fonctions
--
-- LAYER 3: RLS Policies (users, team_members, buildings, etc.)
--   - Utilisent get_user_teams_v2(), get_current_user_role(), etc.
--   - Ces fonctions retournent directement les resultats (Layer 2)
--   - Pas de recursion car Layer 2 ne depend pas de Layer 3
--
-- PATTERN: Fonction SECURITY DEFINER "feuille" (get_user_id_from_auth) qui
--          n'a AUCUNE dependance et bypass toutes les RLS = point d'ancrage
--          qui casse la recursion.
--
-- ============================================================================
