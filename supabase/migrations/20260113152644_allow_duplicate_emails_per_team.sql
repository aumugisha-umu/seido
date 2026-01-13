-- Migration: Allow duplicate emails per team
-- Purpose: Enable multi-team support where the same email can exist in different teams
-- 
-- Context:
-- - Previously: UNIQUE(email) globally - one user per email across all teams
-- - Now: UNIQUE(email, team_id) - one user per email PER team
--
-- This enables:
-- - Import creating NEW contacts even if email exists in another team
-- - Each team has its own "instance" of a contact
-- - auth_user_id linked only when that specific team invites the contact
-- - CRM-only usage (no app access) in teams that don't send invitations

-- 1. Drop the old global UNIQUE constraint on email
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_email_key;

-- 2. Add new composite UNIQUE constraint (email, team_id)
-- NULLS NOT DISTINCT: Treats NULL values as equal for uniqueness
-- This means: only ONE user with NULL email per team (if needed)
-- And: same email can exist in multiple teams
ALTER TABLE users ADD CONSTRAINT users_email_team_unique 
  UNIQUE NULLS NOT DISTINCT (email, team_id);

-- 3. Create index for performance on email+team lookups
-- Partial index excluding soft-deleted users
CREATE INDEX IF NOT EXISTS idx_users_email_team 
  ON users(email, team_id) WHERE deleted_at IS NULL;

-- 4. Update the existing index on email to be partial (exclude deleted)
-- Drop old index if exists and recreate
DROP INDEX IF EXISTS idx_users_email;
CREATE INDEX idx_users_email ON users(email) WHERE deleted_at IS NULL;

-- Note: Existing data is not affected as each user already has a team_id
-- The migration is non-destructive and backward compatible
COMMENT ON CONSTRAINT users_email_team_unique ON users IS 
  'Allows the same email in different teams. Each team has its own user record for a contact.';
