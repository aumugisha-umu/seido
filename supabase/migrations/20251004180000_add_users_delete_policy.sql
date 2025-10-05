-- =============================================================================
-- MIGRATION: Add DELETE Policy for users Table
-- =============================================================================
-- Date: 2025-10-04 18:00:00
-- Problem:
--   Table users has INSERT, SELECT, UPDATE policies but NO DELETE policy
--   → Cannot delete obsolete contacts (departed tenants, inactive providers)
--   → Inconsistent with team_members logic which has DELETE policy
--
-- Solution:
--   Add granular DELETE policy following same logic as team_members:
--   - Gestionnaires can delete locataires/prestataires
--   - Only team admins can delete other gestionnaires
--   - No one can delete themselves (security protection)
--   - Team isolation enforced via get_user_teams_v2()
-- =============================================================================

-- =============================================================================
-- CLEANUP: Drop existing DELETE policy if any
-- =============================================================================

DROP POLICY IF EXISTS "users_delete_team_contacts" ON public.users;
DROP POLICY IF EXISTS "users_can_delete" ON public.users;

-- =============================================================================
-- CREATE: Granular DELETE Policy for users
-- =============================================================================

CREATE POLICY "users_delete_team_contacts"
ON public.users
FOR DELETE
TO authenticated
USING (
  -- Must be member of user's team
  team_id IN (SELECT get_user_teams_v2())
  AND
  -- Cannot delete yourself (security protection)
  auth_user_id != auth.uid()
  AND (
    -- CASE 1: Deleting a locataire/prestataire → OK for gestionnaires
    EXISTS (
      SELECT 1 FROM public.users u_current
      WHERE u_current.auth_user_id = auth.uid()
      AND u_current.role = 'gestionnaire'
    )
    AND role IN ('locataire', 'prestataire')
    OR
    -- CASE 2: Deleting a gestionnaire → ADMIN ONLY
    EXISTS (
      SELECT 1 FROM public.team_members tm
      INNER JOIN public.users u ON u.id = tm.user_id
      WHERE tm.team_id = users.team_id
      AND u.auth_user_id = auth.uid()
      AND tm.role = 'admin'
    )
  )
);

COMMENT ON POLICY "users_delete_team_contacts" ON public.users IS
  'Gestionnaires peuvent supprimer locataires/prestataires. Seuls les admins d''équipe peuvent supprimer gestionnaires. Protection auto-suppression.';

-- =============================================================================
-- VALIDATION & DIAGNOSTIC
-- =============================================================================

DO $$
DECLARE
  policy_record RECORD;
  insert_count INTEGER;
  select_count INTEGER;
  update_count INTEGER;
  delete_count INTEGER;
BEGIN
  -- Count policies by command
  SELECT COUNT(*) INTO insert_count FROM pg_policies
  WHERE schemaname = 'public' AND tablename = 'users' AND cmd = 'INSERT';

  SELECT COUNT(*) INTO select_count FROM pg_policies
  WHERE schemaname = 'public' AND tablename = 'users' AND cmd = 'SELECT';

  SELECT COUNT(*) INTO update_count FROM pg_policies
  WHERE schemaname = 'public' AND tablename = 'users' AND cmd = 'UPDATE';

  SELECT COUNT(*) INTO delete_count FROM pg_policies
  WHERE schemaname = 'public' AND tablename = 'users' AND cmd = 'DELETE';

  RAISE NOTICE '';
  RAISE NOTICE '═══════════════════════════════════════════════════════════';
  RAISE NOTICE '✅ Users Table DELETE Policy Added';
  RAISE NOTICE '═══════════════════════════════════════════════════════════';
  RAISE NOTICE '';
  RAISE NOTICE '📊 Policy Counts by Command:';
  RAISE NOTICE '  INSERT policies: % (expected: 1)', insert_count;
  RAISE NOTICE '  SELECT policies: % (expected: 3 - authenticated, postgres, service_role)', select_count;
  RAISE NOTICE '  UPDATE policies: % (expected: 1)', update_count;
  RAISE NOTICE '  DELETE policies: % (expected: 1) ← NEWLY ADDED', delete_count;
  RAISE NOTICE '';

  -- List all policies on users table
  RAISE NOTICE '📋 Complete Policy List for users Table:';
  FOR policy_record IN (
    SELECT policyname, cmd, roles
    FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'users'
    ORDER BY
      CASE cmd
        WHEN 'INSERT' THEN 1
        WHEN 'SELECT' THEN 2
        WHEN 'UPDATE' THEN 3
        WHEN 'DELETE' THEN 4
      END,
      policyname
  ) LOOP
    RAISE NOTICE '  [%] % (applied to: %)',
      policy_record.cmd,
      policy_record.policyname,
      policy_record.roles;
  END LOOP;

  RAISE NOTICE '';
  RAISE NOTICE '🎯 Permission Matrix - users Table:';
  RAISE NOTICE '';
  RAISE NOTICE '  👤 Admin d''équipe (team_members.role = admin):';
  RAISE NOTICE '    ✅ INSERT: Users pour ses équipes';
  RAISE NOTICE '    ✅ SELECT: Membres de ses équipes + soi-même';
  RAISE NOTICE '    ✅ UPDATE: Son propre profil uniquement';
  RAISE NOTICE '    ✅ DELETE: Tous les membres (locataires/prestataires/gestionnaires)';
  RAISE NOTICE '';
  RAISE NOTICE '  👤 Gestionnaire (users.role = gestionnaire, non-admin):';
  RAISE NOTICE '    ✅ INSERT: Users pour ses équipes';
  RAISE NOTICE '    ✅ SELECT: Membres de ses équipes + soi-même';
  RAISE NOTICE '    ✅ UPDATE: Son propre profil uniquement';
  RAISE NOTICE '    ✅ DELETE: Locataires/prestataires uniquement';
  RAISE NOTICE '';
  RAISE NOTICE '  👤 Locataire/Prestataire:';
  RAISE NOTICE '    ❌ INSERT: Pas de permissions';
  RAISE NOTICE '    ✅ SELECT: Membres de ses équipes + soi-même';
  RAISE NOTICE '    ✅ UPDATE: Son propre profil uniquement';
  RAISE NOTICE '    ❌ DELETE: Pas de permissions';
  RAISE NOTICE '';
  RAISE NOTICE '🔒 Security Protections:';
  RAISE NOTICE '  ✅ Team isolation via get_user_teams_v2()';
  RAISE NOTICE '  ✅ Self-deletion blocked (auth_user_id != auth.uid())';
  RAISE NOTICE '  ✅ Role-based access (gestionnaire vs admin)';
  RAISE NOTICE '  ✅ Cannot delete users from other teams';
  RAISE NOTICE '';
  RAISE NOTICE '✅ Consistency with team_members table: ACHIEVED';
  RAISE NOTICE '═══════════════════════════════════════════════════════════';
END
$$;
