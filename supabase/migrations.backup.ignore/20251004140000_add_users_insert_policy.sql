-- =============================================================================
-- MIGRATION: Add INSERT policy for users table
-- =============================================================================
-- Date: 2025-10-04 14:00:00
-- Problem:
--   Users table has SELECT and UPDATE policies but NO INSERT policy
--   When creating contacts via /api/invite-user, insertion fails with:
--   "new row violates row-level security policy for table users"
--
-- Root Cause:
--   Migration 20250930000002_team_based_rls_policies.sql only created:
--   - team_members_select_users (SELECT)
--   - users_can_update_own_profile (UPDATE)
--   But no INSERT policy was defined
--
-- Solution:
--   Add INSERT policy that allows authenticated users to create users
--   for teams they belong to
-- =============================================================================

-- =============================================================================
-- STEP 1: Drop old policy if exists (cleanup)
-- =============================================================================

DROP POLICY IF EXISTS "team_members_insert_users" ON public.users;
DROP POLICY IF EXISTS "users_can_insert_team_contacts" ON public.users;

-- =============================================================================
-- STEP 2: Create INSERT policy for users table
-- =============================================================================

-- Policy INSERT: Créer des utilisateurs/contacts pour les équipes dont on est membre
-- Logique:
--   - Un utilisateur authentifié peut créer des contacts (users)
--   - Seulement si le team_id du nouvel utilisateur correspond à une équipe dont il est membre
--   - Permet aux gestionnaires de créer des contacts pour leurs équipes
--   - Empêche la création de contacts pour d'autres équipes

CREATE POLICY "team_members_insert_users"
ON public.users
FOR INSERT
TO authenticated
WITH CHECK (
  -- Le team_id du nouvel utilisateur doit être une équipe dont on est membre
  team_id IN (SELECT get_user_teams_v2())
);

COMMENT ON POLICY "team_members_insert_users" ON public.users IS
  'Permet aux membres authentifiés de créer des utilisateurs/contacts pour les équipes dont ils sont membres';

-- =============================================================================
-- STEP 3: Validation et diagnostic
-- =============================================================================

DO $$
DECLARE
  policy_count INTEGER;
  insert_policy_count INTEGER;
  policy_record RECORD;
BEGIN
  -- Count total policies on users table
  SELECT COUNT(*) INTO policy_count
  FROM pg_policies
  WHERE schemaname = 'public'
    AND tablename = 'users';

  -- Count INSERT policies specifically
  SELECT COUNT(*) INTO insert_policy_count
  FROM pg_policies
  WHERE schemaname = 'public'
    AND tablename = 'users'
    AND cmd = 'INSERT';

  RAISE NOTICE '';
  RAISE NOTICE '═══════════════════════════════════════════════════════════';
  RAISE NOTICE '✅ Users table RLS - INSERT Policy Added';
  RAISE NOTICE '═══════════════════════════════════════════════════════════';
  RAISE NOTICE 'Total policies on users table: %', policy_count;
  RAISE NOTICE 'INSERT policies: %', insert_policy_count;
  RAISE NOTICE '';

  -- List all policies for users table
  RAISE NOTICE '📋 All policies on users table:';
  FOR policy_record IN (
    SELECT policyname, cmd,
           CASE
             WHEN cmd = 'SELECT' THEN qual::text
             WHEN cmd = 'INSERT' THEN with_check::text
             WHEN cmd = 'UPDATE' THEN qual::text || ' / ' || with_check::text
             ELSE 'N/A'
           END as condition
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'users'
    ORDER BY cmd, policyname
  ) LOOP
    RAISE NOTICE '  % [%]: %', policy_record.cmd, policy_record.policyname, LEFT(policy_record.condition, 100);
  END LOOP;

  RAISE NOTICE '';
  RAISE NOTICE '🎯 Expected Behavior After This Migration:';
  RAISE NOTICE '  ✅ Authenticated users can INSERT users/contacts for their teams';
  RAISE NOTICE '  ✅ Contact creation via /api/invite-user should now succeed';
  RAISE NOTICE '  ✅ Team isolation preserved (can only create for own teams)';
  RAISE NOTICE '═══════════════════════════════════════════════════════════';
END
$$;
