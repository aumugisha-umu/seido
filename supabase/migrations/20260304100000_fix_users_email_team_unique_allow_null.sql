-- ============================================================================
-- Fix: Allow multiple contacts with NULL email per team
--
-- The previous constraint used NULLS NOT DISTINCT, which treats NULL as equal
-- and blocks creating more than one contact without email per team.
--
-- Solution: Replace with a partial unique index that only enforces uniqueness
-- for non-null, non-empty emails. Contacts without email are unrestricted.
-- ============================================================================

-- Drop the old constraint (NULLS NOT DISTINCT)
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_email_team_unique;

-- Drop the associated index if it exists separately
DROP INDEX IF EXISTS idx_users_email_team;

-- Create partial unique index: only enforces uniqueness for real emails
CREATE UNIQUE INDEX users_email_team_unique
  ON users (email, team_id)
  WHERE email IS NOT NULL AND email != '';

-- Recreate the performance index (partial, same condition)
CREATE INDEX IF NOT EXISTS idx_users_email_team
  ON users (email, team_id)
  WHERE email IS NOT NULL AND email != '';

COMMENT ON INDEX users_email_team_unique IS
  'Prevents duplicate real emails per team. NULL/empty emails are allowed (multiple contacts without email per team).';
