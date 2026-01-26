-- Migration: Fix role type in find_or_add_user_to_team RPC
-- Problem: Function parameter uses user_role but team_members.role uses team_member_role
-- Error: "column \"role\" is of type team_member_role but expression is of type user_role" (42804)
--
-- Fix: Change parameter type from user_role to team_member_role

-- Drop existing function with old signature
DROP FUNCTION IF EXISTS find_or_add_user_to_team(TEXT, UUID, user_role);

-- Recreate function with correct type
CREATE OR REPLACE FUNCTION find_or_add_user_to_team(
  p_email TEXT,
  p_team_id UUID,
  p_role team_member_role DEFAULT 'locataire'
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_existing_member_id UUID;
BEGIN
  -- Normalize email
  p_email := LOWER(TRIM(p_email));

  IF p_email IS NULL OR p_email = '' THEN
    RETURN NULL;
  END IF;

  -- Find user by email (bypassing RLS via SECURITY DEFINER)
  SELECT id INTO v_user_id
  FROM users
  WHERE email = p_email
  LIMIT 1;

  IF v_user_id IS NULL THEN
    -- User doesn't exist at all
    RETURN NULL;
  END IF;

  -- Check if user is already in this team
  SELECT id INTO v_existing_member_id
  FROM team_members
  WHERE user_id = v_user_id
    AND team_id = p_team_id
    AND left_at IS NULL
  LIMIT 1;

  IF v_existing_member_id IS NOT NULL THEN
    -- Already in team, just return the user_id
    RETURN v_user_id;
  END IF;

  -- Add user to team
  INSERT INTO team_members (user_id, team_id, role, joined_at)
  VALUES (v_user_id, p_team_id, p_role, NOW())
  ON CONFLICT (user_id, team_id)
  DO UPDATE SET
    left_at = NULL,
    role = EXCLUDED.role,
    joined_at = NOW()
  WHERE team_members.left_at IS NOT NULL;

  RETURN v_user_id;
END;
$$;

-- Grant execute permission to authenticated users (with correct type signature)
GRANT EXECUTE ON FUNCTION find_or_add_user_to_team(TEXT, UUID, team_member_role) TO authenticated;

-- Add comment for documentation
COMMENT ON FUNCTION find_or_add_user_to_team IS
'Finds a user by email (bypassing RLS) and adds them to the specified team.
Used during import when a contact exists in another team.
Returns the user_id if found and added, NULL if user does not exist.';
