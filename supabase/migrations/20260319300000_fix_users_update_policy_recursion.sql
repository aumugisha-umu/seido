-- ============================================================================
-- Fix: users_update policy infinite recursion
-- Date: 2026-03-19
-- Description:
--   The unified users_update policy (from 20260211170000) contains an inline
--   INNER JOIN users u ON u.id = tm.user_id inside the EXISTS subquery.
--   This self-references the users table, triggering the same RLS policy
--   evaluation → infinite recursion.
--
--   Fix: Replace the INNER JOIN users with get_current_user_id() which is
--   a SECURITY DEFINER function that resolves auth.uid() → users.id
--   without triggering RLS.
-- ============================================================================

DROP POLICY IF EXISTS "users_update" ON users;

CREATE POLICY "users_update" ON users
  FOR UPDATE TO authenticated
  USING (
    auth_user_id = (select auth.uid())
    OR (
      get_current_user_role() IN ('gestionnaire', 'admin')
      AND team_id IN (SELECT get_user_teams_v2())
      AND EXISTS (
        SELECT 1 FROM team_members tm
        WHERE tm.team_id = users.team_id
          AND tm.user_id = get_current_user_id()
          AND tm.role = 'admin'::team_member_role
          AND tm.left_at IS NULL
      )
    )
  )
  WITH CHECK (
    auth_user_id = (select auth.uid())
    OR (
      get_current_user_role() IN ('gestionnaire', 'admin')
      AND team_id IN (SELECT get_user_teams_v2())
      AND EXISTS (
        SELECT 1 FROM team_members tm
        WHERE tm.team_id = users.team_id
          AND tm.user_id = get_current_user_id()
          AND tm.role = 'admin'::team_member_role
          AND tm.left_at IS NULL
      )
    )
  );

COMMENT ON POLICY "users_update" ON users IS
  'Unified UPDATE: own profile + admin team managers can update team members. Uses get_current_user_id() to avoid self-referencing users table recursion.';
