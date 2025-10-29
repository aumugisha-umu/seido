-- Migration: Allow Gestionnaires to Cancel Team Invitations
-- Date: 2025-10-29
-- Purpose: Fix RLS policy to allow any gestionnaire in a team to cancel invitations
--          (not just team admins)

-- ============================================================================
-- Drop Existing Restrictive Policy
-- ============================================================================

DROP POLICY IF EXISTS "user_invitations_delete" ON user_invitations;

-- ============================================================================
-- Create New Policy: Allow Gestionnaires OR Team Admins
-- ============================================================================

CREATE POLICY "user_invitations_delete" ON user_invitations FOR DELETE
TO authenticated
USING (
  -- User must be in the team
  team_id IN (SELECT get_user_teams_v2())
  AND EXISTS (
    SELECT 1 FROM team_members tm
    INNER JOIN users u ON u.id = tm.user_id
    WHERE tm.team_id = user_invitations.team_id
    AND u.auth_user_id = auth.uid()
    AND (
      -- Allow gestionnaires (users.role)
      u.role = 'gestionnaire'::user_role
      OR
      -- Allow team admins (team_members.role)
      tm.role = 'admin'::team_member_role
    )
    AND tm.left_at IS NULL  -- Must be active team member
  )
);

-- ============================================================================
-- Add Comment for Documentation
-- ============================================================================

COMMENT ON POLICY "user_invitations_delete" ON user_invitations IS
'Allow gestionnaires and team admins to delete team invitations.
Team isolation is maintained via team_id check.';
