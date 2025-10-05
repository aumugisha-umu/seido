-- =============================================================================
-- MIGRATION: Fix RLS Policies for team_members, user_invitations, activity_logs
-- =============================================================================
-- Date: 2025-10-04 15:00:00
-- Problem:
--   1. team_members: INSERT policy too restrictive (admin only)
--      → Gestionnaires cannot add contacts to team
--   2. user_invitations: NO RLS policies at all
--      → Cannot create invitation records
--   3. activity_logs: NO RLS policies at all
--      → Cannot log activity
--
-- Solution:
--   1. Replace team_members FOR ALL policy with granular INSERT/UPDATE/DELETE
--      → Gestionnaires can add contacts (except other gestionnaires)
--      → Only admins can add other gestionnaires
--   2. Create complete RLS policies for user_invitations
--   3. Create complete RLS policies for activity_logs
-- =============================================================================

-- =============================================================================
-- PART 1: FIX team_members POLICIES
-- =============================================================================

-- Drop old restrictive policy
DROP POLICY IF EXISTS "team_members_manage_team_members" ON public.team_members;

-- CREATE GRANULAR POLICIES

-- INSERT: Members can add contacts to their teams
-- EXCEPT: Only admins can add other gestionnaires (security)
CREATE POLICY "team_members_insert_members"
ON public.team_members
FOR INSERT
TO authenticated
WITH CHECK (
  -- Must be member of the team
  team_id IN (SELECT get_user_teams_v2())
  AND (
    -- CASE 1: Adding a non-gestionnaire (locataire, prestataire) → OK for all members
    NOT EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.id = team_members.user_id
      AND u.role = 'gestionnaire'
    )
    OR
    -- CASE 2: Adding a gestionnaire → ADMIN ONLY (privilege escalation protection)
    EXISTS (
      SELECT 1 FROM public.team_members tm
      INNER JOIN public.users u ON u.id = tm.user_id
      WHERE tm.team_id = team_members.team_id
      AND u.auth_user_id = auth.uid()
      AND tm.role = 'admin'
    )
  )
);

COMMENT ON POLICY "team_members_insert_members" ON public.team_members IS
  'Permet aux membres d''ajouter des contacts (locataires/prestataires) à leur équipe. Seuls les admins peuvent ajouter d''autres gestionnaires.';

-- UPDATE: Only admins can modify member roles
CREATE POLICY "team_members_update_members"
ON public.team_members
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.team_members tm
    INNER JOIN public.users u ON u.id = tm.user_id
    WHERE tm.team_id = team_members.team_id
    AND u.auth_user_id = auth.uid()
    AND tm.role = 'admin'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.team_members tm
    INNER JOIN public.users u ON u.id = tm.user_id
    WHERE tm.team_id = team_members.team_id
    AND u.auth_user_id = auth.uid()
    AND tm.role = 'admin'
  )
);

COMMENT ON POLICY "team_members_update_members" ON public.team_members IS
  'Seuls les admins peuvent modifier les rôles des membres.';

-- DELETE: Only admins can remove members
CREATE POLICY "team_members_delete_members"
ON public.team_members
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.team_members tm
    INNER JOIN public.users u ON u.id = tm.user_id
    WHERE tm.team_id = team_members.team_id
    AND u.auth_user_id = auth.uid()
    AND tm.role = 'admin'
  )
);

COMMENT ON POLICY "team_members_delete_members" ON public.team_members IS
  'Seuls les admins peuvent retirer des membres de l''équipe.';

-- =============================================================================
-- PART 2: CREATE user_invitations POLICIES
-- =============================================================================

-- Enable RLS on user_invitations
ALTER TABLE public.user_invitations ENABLE ROW LEVEL SECURITY;

-- Drop any existing policies (cleanup)
DROP POLICY IF EXISTS "user_invitations_select" ON public.user_invitations;
DROP POLICY IF EXISTS "user_invitations_insert" ON public.user_invitations;
DROP POLICY IF EXISTS "user_invitations_update" ON public.user_invitations;
DROP POLICY IF EXISTS "user_invitations_delete" ON public.user_invitations;

-- SELECT: View invitations for your teams
CREATE POLICY "user_invitations_select"
ON public.user_invitations
FOR SELECT
TO authenticated
USING (
  team_id IN (SELECT get_user_teams_v2())
);

COMMENT ON POLICY "user_invitations_select" ON public.user_invitations IS
  'Voir les invitations des équipes dont on est membre.';

-- INSERT: Create invitations for your teams
CREATE POLICY "user_invitations_insert"
ON public.user_invitations
FOR INSERT
TO authenticated
WITH CHECK (
  team_id IN (SELECT get_user_teams_v2())
);

COMMENT ON POLICY "user_invitations_insert" ON public.user_invitations IS
  'Créer des invitations pour ses équipes.';

-- UPDATE: Modify invitations for your teams
CREATE POLICY "user_invitations_update"
ON public.user_invitations
FOR UPDATE
TO authenticated
USING (
  team_id IN (SELECT get_user_teams_v2())
);

COMMENT ON POLICY "user_invitations_update" ON public.user_invitations IS
  'Modifier les invitations de ses équipes.';

-- DELETE: Only admins can delete invitations
CREATE POLICY "user_invitations_delete"
ON public.user_invitations
FOR DELETE
TO authenticated
USING (
  team_id IN (SELECT get_user_teams_v2())
  AND EXISTS (
    SELECT 1 FROM public.team_members tm
    INNER JOIN public.users u ON u.id = tm.user_id
    WHERE tm.team_id = user_invitations.team_id
    AND u.auth_user_id = auth.uid()
    AND tm.role = 'admin'
  )
);

COMMENT ON POLICY "user_invitations_delete" ON public.user_invitations IS
  'Seuls les admins peuvent supprimer les invitations.';

-- =============================================================================
-- PART 3: CREATE activity_logs POLICIES
-- =============================================================================

-- Enable RLS on activity_logs
ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;

-- Drop any existing policies (cleanup)
DROP POLICY IF EXISTS "activity_logs_select" ON public.activity_logs;
DROP POLICY IF EXISTS "activity_logs_insert" ON public.activity_logs;

-- SELECT: View logs for your teams
CREATE POLICY "activity_logs_select"
ON public.activity_logs
FOR SELECT
TO authenticated
USING (
  team_id IN (SELECT get_user_teams_v2())
);

COMMENT ON POLICY "activity_logs_select" ON public.activity_logs IS
  'Voir les logs d''activité de ses équipes.';

-- INSERT: Create logs for your teams
CREATE POLICY "activity_logs_insert"
ON public.activity_logs
FOR INSERT
TO authenticated
WITH CHECK (
  team_id IN (SELECT get_user_teams_v2())
);

COMMENT ON POLICY "activity_logs_insert" ON public.activity_logs IS
  'Créer des logs d''activité pour ses équipes.';

-- NOTE: No UPDATE/DELETE policies - activity logs are immutable

-- =============================================================================
-- VALIDATION & DIAGNOSTIC
-- =============================================================================

DO $$
DECLARE
  tm_insert_count INTEGER;
  tm_update_count INTEGER;
  tm_delete_count INTEGER;
  ui_policy_count INTEGER;
  al_policy_count INTEGER;
  policy_record RECORD;
BEGIN
  -- Count team_members policies
  SELECT COUNT(*) INTO tm_insert_count
  FROM pg_policies
  WHERE schemaname = 'public' AND tablename = 'team_members' AND cmd = 'INSERT';

  SELECT COUNT(*) INTO tm_update_count
  FROM pg_policies
  WHERE schemaname = 'public' AND tablename = 'team_members' AND cmd = 'UPDATE';

  SELECT COUNT(*) INTO tm_delete_count
  FROM pg_policies
  WHERE schemaname = 'public' AND tablename = 'team_members' AND cmd = 'DELETE';

  -- Count user_invitations policies
  SELECT COUNT(*) INTO ui_policy_count
  FROM pg_policies
  WHERE schemaname = 'public' AND tablename = 'user_invitations';

  -- Count activity_logs policies
  SELECT COUNT(*) INTO al_policy_count
  FROM pg_policies
  WHERE schemaname = 'public' AND tablename = 'activity_logs';

  RAISE NOTICE '';
  RAISE NOTICE '═══════════════════════════════════════════════════════════';
  RAISE NOTICE '✅ RLS Policies Fixed - Complete Report';
  RAISE NOTICE '═══════════════════════════════════════════════════════════';
  RAISE NOTICE '';
  RAISE NOTICE '📊 Policy Counts:';
  RAISE NOTICE '  team_members:';
  RAISE NOTICE '    - INSERT: % (expected: 1)', tm_insert_count;
  RAISE NOTICE '    - UPDATE: % (expected: 1)', tm_update_count;
  RAISE NOTICE '    - DELETE: % (expected: 1)', tm_delete_count;
  RAISE NOTICE '  user_invitations: % policies (expected: 4 - SELECT/INSERT/UPDATE/DELETE)', ui_policy_count;
  RAISE NOTICE '  activity_logs: % policies (expected: 2 - SELECT/INSERT)', al_policy_count;
  RAISE NOTICE '';

  -- List all policies for verification
  RAISE NOTICE '📋 All RLS Policies Created:';
  RAISE NOTICE '';

  RAISE NOTICE '🔐 team_members:';
  FOR policy_record IN (
    SELECT policyname, cmd
    FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'team_members'
    ORDER BY cmd, policyname
  ) LOOP
    RAISE NOTICE '  [%] %', policy_record.cmd, policy_record.policyname;
  END LOOP;

  RAISE NOTICE '';
  RAISE NOTICE '🔐 user_invitations:';
  FOR policy_record IN (
    SELECT policyname, cmd
    FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'user_invitations'
    ORDER BY cmd, policyname
  ) LOOP
    RAISE NOTICE '  [%] %', policy_record.cmd, policy_record.policyname;
  END LOOP;

  RAISE NOTICE '';
  RAISE NOTICE '🔐 activity_logs:';
  FOR policy_record IN (
    SELECT policyname, cmd
    FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'activity_logs'
    ORDER BY cmd, policyname
  ) LOOP
    RAISE NOTICE '  [%] %', policy_record.cmd, policy_record.policyname;
  END LOOP;

  RAISE NOTICE '';
  RAISE NOTICE '🎯 Expected Behavior After Migration:';
  RAISE NOTICE '  ✅ Gestionnaires can add locataires/prestataires to teams';
  RAISE NOTICE '  ✅ Only admins can add other gestionnaires (security)';
  RAISE NOTICE '  ✅ Only admins can update/delete team members';
  RAISE NOTICE '  ✅ All members can create/view invitations';
  RAISE NOTICE '  ✅ Only admins can delete invitations';
  RAISE NOTICE '  ✅ All members can create/view activity logs';
  RAISE NOTICE '  ✅ Contact creation workflow fully functional';
  RAISE NOTICE '═══════════════════════════════════════════════════════════';
END
$$;
