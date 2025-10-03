-- =============================================================================
-- MIGRATION: Fix RLS recursion impacting login/profile load
-- =============================================================================
-- Date: 2025-10-02 19:30:00 (local)
-- Problem:
--   Selecting from public.users during login triggers users policy referencing
--   public.team_members, whose SELECT policy calls a helper that queries
--   team_members again, causing "infinite recursion detected in policy".
-- Solution (minimal, safe for auth):
--   1) Simplify users SELECT policy to only allow own profile via auth_user_id.
--   2) Simplify team_members SELECT policy to only allow viewing own membership
--      rows (no helper calls or subqueries to team_members).
--   These changes unblock login/profile fetch without weakening other tables.
-- =============================================================================

-- USERS: Replace team-based SELECT policy with own-profile only
DO $plpgsql$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'users'
      AND policyname = 'team_members_select_users'
  ) THEN
    EXECUTE 'DROP POLICY "team_members_select_users" ON public.users';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'users'
      AND policyname = 'users_select_own_profile'
  ) THEN
    EXECUTE $$
      CREATE POLICY "users_select_own_profile"
      ON public.users
      FOR SELECT
      TO authenticated
      USING (
        auth_user_id = auth.uid()
      )
    $$;
  END IF;
END
$plpgsql$;

-- TEAM_MEMBERS: Simplify SELECT policy to own membership rows only (break recursion)
DO $plpgsql$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'team_members'
      AND policyname = 'team_members_select_team_members'
  ) THEN
    EXECUTE 'DROP POLICY "team_members_select_team_members" ON public.team_members';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'team_members'
      AND policyname = 'team_members_select_own_membership'
  ) THEN
    EXECUTE $$
      CREATE POLICY "team_members_select_own_membership"
      ON public.team_members
      FOR SELECT
      TO authenticated
      USING (
        user_id = (SELECT id FROM public.users WHERE auth_user_id = auth.uid())
      )
    $$;
  END IF;
END
$plpgsql$;

-- Notes:
-- - Management policies (insert/update/delete) are left intact.
-- - If broader visibility over team members is required elsewhere, add a
--   separate policy not used on the login/profile code path, avoiding
--   self-referential queries on team_members.


