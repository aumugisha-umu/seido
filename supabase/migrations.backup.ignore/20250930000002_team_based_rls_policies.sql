-- =============================================================================
-- MIGRATION: Policies RLS basées sur les équipes (team_members)
-- =============================================================================
-- Date: 30 septembre 2025
-- Description: Politiques RLS pour isolation des données par équipe
--              Utilise team_members comme source de vérité pour l'appartenance aux équipes
-- Objectif: Permettre multi-tenancy avec un utilisateur dans plusieurs équipes
-- =============================================================================

-- =============================================================================
-- FONCTION HELPER: user_belongs_to_team_v2
-- =============================================================================
-- Vérifie si un utilisateur appartient à une équipe via team_members
-- Remplace la logique users.team_id

CREATE OR REPLACE FUNCTION public.user_belongs_to_team_v2(check_team_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM public.team_members tm
    INNER JOIN public.users u ON u.id = tm.user_id
    WHERE tm.team_id = check_team_id
    AND u.auth_user_id = auth.uid()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

COMMENT ON FUNCTION public.user_belongs_to_team_v2(UUID) IS
  'Vérifie si l''utilisateur authentifié est membre d''une équipe via team_members. Support multi-équipes.';

-- =============================================================================
-- FONCTION HELPER: get_user_teams_v2
-- =============================================================================
-- Retourne la liste des team_ids auxquels un utilisateur appartient

CREATE OR REPLACE FUNCTION public.get_user_teams_v2()
RETURNS TABLE(team_id UUID) AS $$
BEGIN
  RETURN QUERY
  SELECT tm.team_id
  FROM public.team_members tm
  INNER JOIN public.users u ON u.id = tm.user_id
  WHERE u.auth_user_id = auth.uid();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

COMMENT ON FUNCTION public.get_user_teams_v2() IS
  'Retourne toutes les équipes dont l''utilisateur authentifié est membre. Support multi-équipes.';

-- =============================================================================
-- RLS POLICIES: BUILDINGS (Bâtiments)
-- =============================================================================

-- Activer RLS sur buildings (si pas déjà fait)
ALTER TABLE public.buildings ENABLE ROW LEVEL SECURITY;

-- Supprimer les anciennes policies si elles existent
DROP POLICY IF EXISTS "Users see their team buildings" ON public.buildings;
DROP POLICY IF EXISTS "Users can create buildings for their team" ON public.buildings;
DROP POLICY IF EXISTS "Users can update their team buildings" ON public.buildings;
DROP POLICY IF EXISTS "Users can delete their team buildings" ON public.buildings;

-- Policy SELECT: Voir les bâtiments des équipes dont on est membre
CREATE POLICY "team_members_select_buildings"
ON public.buildings
FOR SELECT
TO authenticated
USING (
  team_id IN (SELECT get_user_teams_v2())
);

-- Policy INSERT: Créer des bâtiments pour ses équipes (gestionnaires/admin uniquement)
CREATE POLICY "team_members_insert_buildings"
ON public.buildings
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.team_members tm
    INNER JOIN public.users u ON u.id = tm.user_id
    WHERE tm.team_id = buildings.team_id
    AND u.auth_user_id = auth.uid()
    AND u.role IN ('admin', 'gestionnaire')
  )
);

-- Policy UPDATE: Modifier les bâtiments de ses équipes (gestionnaires/admin)
CREATE POLICY "team_members_update_buildings"
ON public.buildings
FOR UPDATE
TO authenticated
USING (
  team_id IN (SELECT get_user_teams_v2())
  AND EXISTS (
    SELECT 1 FROM public.users u
    WHERE u.auth_user_id = auth.uid()
    AND u.role IN ('admin', 'gestionnaire')
  )
);

-- Policy DELETE: Supprimer les bâtiments de ses équipes (admin uniquement)
CREATE POLICY "team_members_delete_buildings"
ON public.buildings
FOR DELETE
TO authenticated
USING (
  team_id IN (SELECT get_user_teams_v2())
  AND EXISTS (
    SELECT 1 FROM public.users u
    WHERE u.auth_user_id = auth.uid()
    AND u.role = 'admin'
  )
);

-- =============================================================================
-- RLS POLICIES: LOTS
-- =============================================================================

ALTER TABLE public.lots ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "team_members_select_lots" ON public.lots;
DROP POLICY IF EXISTS "team_members_insert_lots" ON public.lots;
DROP POLICY IF EXISTS "team_members_update_lots" ON public.lots;
DROP POLICY IF EXISTS "team_members_delete_lots" ON public.lots;

-- SELECT: Voir les lots des équipes dont on est membre
CREATE POLICY "team_members_select_lots"
ON public.lots
FOR SELECT
TO authenticated
USING (
  team_id IN (SELECT get_user_teams_v2())
);

-- INSERT: Créer des lots pour ses équipes (gestionnaires/admin)
CREATE POLICY "team_members_insert_lots"
ON public.lots
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.team_members tm
    INNER JOIN public.users u ON u.id = tm.user_id
    WHERE tm.team_id = lots.team_id
    AND u.auth_user_id = auth.uid()
    AND u.role IN ('admin', 'gestionnaire')
  )
);

-- UPDATE: Modifier les lots de ses équipes (gestionnaires/admin)
CREATE POLICY "team_members_update_lots"
ON public.lots
FOR UPDATE
TO authenticated
USING (
  team_id IN (SELECT get_user_teams_v2())
  AND EXISTS (
    SELECT 1 FROM public.users u
    WHERE u.auth_user_id = auth.uid()
    AND u.role IN ('admin', 'gestionnaire')
  )
);

-- DELETE: Supprimer les lots de ses équipes (admin uniquement)
CREATE POLICY "team_members_delete_lots"
ON public.lots
FOR DELETE
TO authenticated
USING (
  team_id IN (SELECT get_user_teams_v2())
  AND EXISTS (
    SELECT 1 FROM public.users u
    WHERE u.auth_user_id = auth.uid()
    AND u.role = 'admin'
  )
);

-- =============================================================================
-- RLS POLICIES: INTERVENTIONS
-- =============================================================================

ALTER TABLE public.interventions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "team_members_select_interventions" ON public.interventions;
DROP POLICY IF EXISTS "team_members_insert_interventions" ON public.interventions;
DROP POLICY IF EXISTS "team_members_update_interventions" ON public.interventions;

-- SELECT: Voir les interventions des équipes dont on est membre
CREATE POLICY "team_members_select_interventions"
ON public.interventions
FOR SELECT
TO authenticated
USING (
  team_id IN (SELECT get_user_teams_v2())
  OR tenant_id = (SELECT id FROM public.users WHERE auth_user_id = auth.uid())
);

-- INSERT: Créer des interventions (tous les membres authentifiés)
CREATE POLICY "team_members_insert_interventions"
ON public.interventions
FOR INSERT
TO authenticated
WITH CHECK (
  team_id IN (SELECT get_user_teams_v2())
);

-- UPDATE: Modifier les interventions de ses équipes
CREATE POLICY "team_members_update_interventions"
ON public.interventions
FOR UPDATE
TO authenticated
USING (
  team_id IN (SELECT get_user_teams_v2())
  OR tenant_id = (SELECT id FROM public.users WHERE auth_user_id = auth.uid())
);

-- =============================================================================
-- RLS POLICIES: USERS (Utilisateurs)
-- =============================================================================

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "team_members_select_users" ON public.users;
DROP POLICY IF EXISTS "users_can_update_own_profile" ON public.users;

-- SELECT: Voir les utilisateurs des équipes dont on est membre
CREATE POLICY "team_members_select_users"
ON public.users
FOR SELECT
TO authenticated
USING (
  -- Voir les membres de ses équipes
  id IN (
    SELECT DISTINCT tm2.user_id
    FROM public.team_members tm1
    INNER JOIN public.team_members tm2 ON tm1.team_id = tm2.team_id
    INNER JOIN public.users u ON u.id = tm1.user_id
    WHERE u.auth_user_id = auth.uid()
  )
  OR
  -- Ou voir son propre profil
  auth_user_id = auth.uid()
);

-- UPDATE: Modifier son propre profil uniquement
CREATE POLICY "users_can_update_own_profile"
ON public.users
FOR UPDATE
TO authenticated
USING (auth_user_id = auth.uid())
WITH CHECK (auth_user_id = auth.uid());

-- =============================================================================
-- RLS POLICIES: TEAM_MEMBERS
-- =============================================================================

ALTER TABLE public.team_members ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "team_members_select_team_members" ON public.team_members;
DROP POLICY IF EXISTS "team_members_manage_team_members" ON public.team_members;

-- SELECT: Voir les membres de ses équipes
CREATE POLICY "team_members_select_team_members"
ON public.team_members
FOR SELECT
TO authenticated
USING (
  team_id IN (SELECT get_user_teams_v2())
);

-- INSERT/UPDATE/DELETE: Gérer les membres (admin de l'équipe uniquement)
CREATE POLICY "team_members_manage_team_members"
ON public.team_members
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.team_members tm
    INNER JOIN public.users u ON u.id = tm.user_id
    WHERE tm.team_id = team_members.team_id
    AND u.auth_user_id = auth.uid()
    AND tm.role = 'admin'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.team_members tm
    INNER JOIN public.users u ON u.id = tm.user_id
    WHERE tm.team_id = team_members.team_id
    AND u.auth_user_id = auth.uid()
    AND tm.role = 'admin'
  )
);

-- =============================================================================
-- INDEX POUR PERFORMANCES
-- =============================================================================

-- Index sur team_members pour les requêtes RLS
CREATE INDEX IF NOT EXISTS idx_team_members_user_auth_lookup
ON public.team_members(user_id);

CREATE INDEX IF NOT EXISTS idx_users_auth_user_id_lookup
ON public.users(auth_user_id);

-- =============================================================================
-- VALIDATION ET RÉSUMÉ
-- =============================================================================

DO $$
BEGIN
  RAISE NOTICE '✅ Politiques RLS basées sur team_members créées';
  RAISE NOTICE '🔐 Isolation multi-tenancy activée';
  RAISE NOTICE '';
  RAISE NOTICE '📋 Politiques créées pour:';
  RAISE NOTICE '  - buildings (SELECT, INSERT, UPDATE, DELETE)';
  RAISE NOTICE '  - lots (SELECT, INSERT, UPDATE, DELETE)';
  RAISE NOTICE '  - interventions (SELECT, INSERT, UPDATE)';
  RAISE NOTICE '  - users (SELECT, UPDATE own profile)';
  RAISE NOTICE '  - team_members (SELECT, ALL for admins)';
  RAISE NOTICE '';
  RAISE NOTICE '🎯 Fonctions helper:';
  RAISE NOTICE '  - user_belongs_to_team_v2(team_id)';
  RAISE NOTICE '  - get_user_teams_v2() RETURNS TABLE(team_id)';
  RAISE NOTICE '';
  RAISE NOTICE '⚡ Index de performance créés pour RLS';
  RAISE NOTICE '✅ Migration complète';
END $$;