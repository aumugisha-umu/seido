-- Migration: Add RPC function to find user by email and add to team
-- Purpose: Fix import issue when contact exists in another team (RLS blocks SELECT, but INSERT fails with 409)
--
-- Problem: When importing contacts that exist in another team:
-- 1. findByEmail() returns null (RLS blocks the SELECT)
-- 2. CREATE fails with 23505 (unique constraint on email)
-- 3. Contact not added to emailToId map
-- 4. Baux import fails with "Locataire introuvable"
--
-- Solution: SECURITY DEFINER function that bypasses RLS to find and add user to team

-- Function: find_or_add_user_to_team
-- Finds a user by email (bypassing RLS) and adds them to the specified team
-- Returns the user_id if found and added, null otherwise
CREATE OR REPLACE FUNCTION find_or_add_user_to_team(
  p_email TEXT,
  p_team_id UUID,
  p_role user_role DEFAULT 'locataire'
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

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION find_or_add_user_to_team(TEXT, UUID, user_role) TO authenticated;

-- Add comment for documentation
COMMENT ON FUNCTION find_or_add_user_to_team IS
'Finds a user by email (bypassing RLS) and adds them to the specified team.
Used during import when a contact exists in another team.
Returns the user_id if found and added, NULL if user does not exist.';
