-- Migration: Remove obsolete find_or_add_user_to_team RPC
-- Purpose: This function is no longer needed after switching to UNIQUE(email, team_id)
--
-- Context:
-- - Previously: Used to find a user by email (bypassing RLS) and add them to another team
-- - Now: Each team creates its own user record, so this function is obsolete
--
-- Note: add_user_to_team is still useful for adding users to team_members table

-- Drop the find_or_add_user_to_team function (with correct type signature)
DROP FUNCTION IF EXISTS find_or_add_user_to_team(TEXT, UUID, team_member_role);

-- Also drop the old signature with user_role (if exists from older migration)
DROP FUNCTION IF EXISTS find_or_add_user_to_team(TEXT, UUID, user_role);

-- Add comment for documentation
COMMENT ON FUNCTION add_user_to_team IS
  'Adds an existing user to a team via team_members table. Used after creating a new user during import.';
