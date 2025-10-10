-- =============================================================================
-- MIGRATION: Fix Gestionnaire Permissions for team_members and user_invitations
-- =============================================================================
-- Date: 2025-10-04 16:00:00
-- Problem:
--   Current policies are too restrictive:
--   1. team_members UPDATE/DELETE: Only admin can modify → TOO RESTRICTIVE
--      → Gestionnaires should be able to UPDATE/DELETE locataires/prestataires
--   2. user_invitations DELETE: Only admin can delete → TOO RESTRICTIVE
--      → All gestionnaires should be able to delete invitations
--
-- Clarification:
--   - "Admin" = team_members.role = 'admin' (team admin, not system admin)
--   - "Gestionnaire" = users.role = 'gestionnaire' (manager role)
--
-- Solution:
--   1. team_members UPDATE: Gestionnaires can update locataires/prestataires
--                           Only admin can update other gestionnaires
--   2. team_members DELETE: Gestionnaires can delete locataires/prestataires
--                           Only admin can delete other gestionnaires
--   3. user_invitations DELETE: All gestionnaires can delete invitations
-- =============================================================================

-- =============================================================================
-- PART 1: FIX team_members UPDATE POLICY
-- =============================================================================

DROP POLICY IF EXISTS "team_members_update_members" ON public.team_members;

CREATE POLICY "team_members_update_members"
ON public.team_members
FOR UPDATE
TO authenticated
USING (
  -- Member of the team
  team_id IN (SELECT get_user_teams_v2())
  AND (
    -- CASE 1: Updating a locataire/prestataire → OK for gestionnaires
    EXISTS (
      SELECT 1 FROM public.users u_current
      WHERE u_current.auth_user_id = auth.uid()
      AND u_current.role = 'gestionnaire'
    )
    AND NOT EXISTS (
      SELECT 1 FROM public.users u_target
      WHERE u_target.id = team_members.user_id
      AND u_target.role = 'gestionnaire'
    )
    OR
    -- CASE 2: Updating anyone (including gestionnaires) → ADMIN ONLY
    EXISTS (
      SELECT 1 FROM public.team_members tm
      INNER JOIN public.users u ON u.id = tm.user_id
      WHERE tm.team_id = team_members.team_id
      AND u.auth_user_id = auth.uid()
      AND tm.role = 'admin'
    )
  )
)
WITH CHECK (
  -- Same logic for WITH CHECK
  team_id IN (SELECT get_user_teams_v2())
  AND (
    EXISTS (
      SELECT 1 FROM public.users u_current
      WHERE u_current.auth_user_id = auth.uid()
      AND u_current.role = 'gestionnaire'
    )
    AND NOT EXISTS (
      SELECT 1 FROM public.users u_target
      WHERE u_target.id = team_members.user_id
      AND u_target.role = 'gestionnaire'
    )
    OR
    EXISTS (
      SELECT 1 FROM public.team_members tm
      INNER JOIN public.users u ON u.id = tm.user_id
      WHERE tm.team_id = team_members.team_id
      AND u.auth_user_id = auth.uid()
      AND tm.role = 'admin'
    )
  )
);

COMMENT ON POLICY "team_members_update_members" ON public.team_members IS
  'Gestionnaires peuvent modifier locataires/prestataires. Seuls les admins peuvent modifier d''autres gestionnaires.';

-- =============================================================================
-- PART 2: FIX team_members DELETE POLICY
-- =============================================================================

DROP POLICY IF EXISTS "team_members_delete_members" ON public.team_members;

CREATE POLICY "team_members_delete_members"
ON public.team_members
FOR DELETE
TO authenticated
USING (
  -- Member of the team
  team_id IN (SELECT get_user_teams_v2())
  AND (
    -- CASE 1: Deleting a locataire/prestataire → OK for gestionnaires
    EXISTS (
      SELECT 1 FROM public.users u_current
      WHERE u_current.auth_user_id = auth.uid()
      AND u_current.role = 'gestionnaire'
    )
    AND NOT EXISTS (
      SELECT 1 FROM public.users u_target
      WHERE u_target.id = team_members.user_id
      AND u_target.role = 'gestionnaire'
    )
    OR
    -- CASE 2: Deleting anyone (including gestionnaires) → ADMIN ONLY
    EXISTS (
      SELECT 1 FROM public.team_members tm
      INNER JOIN public.users u ON u.id = tm.user_id
      WHERE tm.team_id = team_members.team_id
      AND u.auth_user_id = auth.uid()
      AND tm.role = 'admin'
    )
  )
);

COMMENT ON POLICY "team_members_delete_members" ON public.team_members IS
  'Gestionnaires peuvent retirer locataires/prestataires. Seuls les admins peuvent retirer d''autres gestionnaires.';

-- =============================================================================
-- PART 3: FIX user_invitations DELETE POLICY
-- =============================================================================

DROP POLICY IF EXISTS "user_invitations_delete" ON public.user_invitations;

CREATE POLICY "user_invitations_delete"
ON public.user_invitations
FOR DELETE
TO authenticated
USING (
  -- Member of the team
  team_id IN (SELECT get_user_teams_v2())
  AND
  -- Must be a gestionnaire (manager role)
  EXISTS (
    SELECT 1 FROM public.users u
    WHERE u.auth_user_id = auth.uid()
    AND u.role = 'gestionnaire'
  )
);

COMMENT ON POLICY "user_invitations_delete" ON public.user_invitations IS
  'Tous les gestionnaires peuvent supprimer les invitations de leurs équipes.';

-- =============================================================================
-- VALIDATION & DIAGNOSTIC
-- =============================================================================

DO $$
DECLARE
  policy_record RECORD;
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '═══════════════════════════════════════════════════════════';
  RAISE NOTICE '✅ Gestionnaire Permissions Fixed';
  RAISE NOTICE '═══════════════════════════════════════════════════════════';
  RAISE NOTICE '';

  RAISE NOTICE '🔐 team_members policies:';
  FOR policy_record IN (
    SELECT policyname, cmd
    FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'team_members'
    ORDER BY cmd, policyname
  ) LOOP
    RAISE NOTICE '  [%] %', policy_record.cmd, policy_record.policyname;
  END LOOP;

  RAISE NOTICE '';
  RAISE NOTICE '🔐 user_invitations policies:';
  FOR policy_record IN (
    SELECT policyname, cmd
    FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'user_invitations'
    ORDER BY cmd, policyname
  ) LOOP
    RAISE NOTICE '  [%] %', policy_record.cmd, policy_record.policyname;
  END LOOP;

  RAISE NOTICE '';
  RAISE NOTICE '🎯 New Permission Matrix:';
  RAISE NOTICE '';
  RAISE NOTICE '📊 team_members:';
  RAISE NOTICE '  ✅ Admin équipe:';
  RAISE NOTICE '    - INSERT: locataires/prestataires/gestionnaires';
  RAISE NOTICE '    - UPDATE/DELETE: tous les membres';
  RAISE NOTICE '  ✅ Gestionnaire équipe (non-admin):';
  RAISE NOTICE '    - INSERT: locataires/prestataires uniquement';
  RAISE NOTICE '    - UPDATE/DELETE: locataires/prestataires uniquement';
  RAISE NOTICE '  ❌ Locataire/Prestataire:';
  RAISE NOTICE '    - Pas de permissions INSERT/UPDATE/DELETE';
  RAISE NOTICE '';
  RAISE NOTICE '📊 user_invitations:';
  RAISE NOTICE '  ✅ Tous les gestionnaires:';
  RAISE NOTICE '    - SELECT/INSERT/UPDATE/DELETE invitations';
  RAISE NOTICE '  ✅ Locataires/Prestataires:';
  RAISE NOTICE '    - SELECT/INSERT/UPDATE uniquement';
  RAISE NOTICE '═══════════════════════════════════════════════════════════';
END
$$;
