-- ============================================================================
-- Migration: Add Email Visibility (Private/Shared) + Email Shares
-- Date: 2026-03-18
-- Description:
--   1. Add visibility + added_by_user_id to team_email_connections
--   2. Create email_shares table for contextual sharing of private emails
--   3. Trigger to auto-propagate shares when new thread emails arrive
--   4. Update RLS on team_email_connections for visibility filtering
-- ============================================================================

-- ============================================================================
-- 1. New columns on team_email_connections
-- ============================================================================

ALTER TABLE team_email_connections
  ADD COLUMN added_by_user_id UUID REFERENCES users(id),
  ADD COLUMN visibility TEXT DEFAULT 'shared'
    CHECK (visibility IN ('private', 'shared'));

-- Backfill: existing connections → shared, added_by = first team admin
UPDATE team_email_connections tec
SET added_by_user_id = (
  SELECT tm.user_id FROM team_members tm
  WHERE tm.team_id = tec.team_id AND tm.role = 'admin'
  ORDER BY tm.joined_at ASC NULLS LAST LIMIT 1
);

-- Fallback: if no admin found, use first gestionnaire
UPDATE team_email_connections tec
SET added_by_user_id = (
  SELECT tm.user_id FROM team_members tm
  WHERE tm.team_id = tec.team_id AND tm.role = 'gestionnaire'
  ORDER BY tm.joined_at ASC NULLS LAST LIMIT 1
)
WHERE added_by_user_id IS NULL;

-- Make NOT NULL after backfill
ALTER TABLE team_email_connections
  ALTER COLUMN added_by_user_id SET NOT NULL;

-- Indexes
CREATE INDEX idx_team_email_connections_visibility
  ON team_email_connections(visibility);
CREATE INDEX idx_team_email_connections_added_by
  ON team_email_connections(added_by_user_id);

-- ============================================================================
-- 2. Create email_shares table
-- ============================================================================

CREATE TABLE email_shares (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email_id            UUID NOT NULL REFERENCES emails(id) ON DELETE CASCADE,
  thread_id           UUID NOT NULL REFERENCES conversation_threads(id) ON DELETE CASCADE,
  shared_with_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  shared_by_user_id   UUID NOT NULL REFERENCES users(id) ON DELETE SET NULL,
  team_id             UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  created_at          TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (email_id, shared_with_user_id)
);

-- Indexes
CREATE INDEX idx_email_shares_email_id ON email_shares(email_id);
CREATE INDEX idx_email_shares_shared_with ON email_shares(shared_with_user_id);
CREATE INDEX idx_email_shares_team_id ON email_shares(team_id);

-- ============================================================================
-- 3. RLS on email_shares
-- ============================================================================

ALTER TABLE email_shares ENABLE ROW LEVEL SECURITY;

-- SELECT: user can see shares they received, created, or team manager
CREATE POLICY email_shares_select ON email_shares FOR SELECT USING (
  shared_with_user_id = get_current_user_id()
  OR shared_by_user_id = get_current_user_id()
  OR is_team_manager(team_id)
);

-- INSERT: only team managers can create shares
CREATE POLICY email_shares_insert ON email_shares FOR INSERT WITH CHECK (
  is_team_manager(team_id)
);

-- DELETE: sharer or team manager can remove shares
CREATE POLICY email_shares_delete ON email_shares FOR DELETE USING (
  shared_by_user_id = get_current_user_id()
  OR is_team_manager(team_id)
);

-- ============================================================================
-- 4. Update RLS on team_email_connections (SELECT policy)
-- ============================================================================

-- Drop old SELECT policy
DROP POLICY IF EXISTS "Team members can view their email connections" ON team_email_connections;

-- New: see shared connections OR own private connections
CREATE POLICY "Team members can view accessible email connections"
  ON team_email_connections FOR SELECT
  USING (
    is_team_manager(team_id)
    AND (
      visibility = 'shared'
      OR added_by_user_id = get_current_user_id()
    )
  );

-- ============================================================================
-- 5. Trigger: auto-share thread emails for private connections
-- ============================================================================

CREATE OR REPLACE FUNCTION auto_share_thread_emails()
RETURNS TRIGGER AS $$
BEGIN
  -- Only process emails on private connections
  IF NEW.email_connection_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM team_email_connections tec
    WHERE tec.id = NEW.email_connection_id
      AND tec.visibility = 'private'
  ) THEN
    -- Propagate shares from existing thread emails to this new email
    INSERT INTO email_shares (email_id, thread_id, shared_with_user_id, shared_by_user_id, team_id)
    SELECT
      NEW.id,
      es.thread_id,
      es.shared_with_user_id,
      es.shared_by_user_id,
      es.team_id
    FROM emails existing_email
    JOIN email_shares es ON es.email_id = existing_email.id
    WHERE existing_email.email_connection_id = NEW.email_connection_id
      AND (
        -- Match by in_reply_to header
        (NEW.in_reply_to_header IS NOT NULL AND NEW.in_reply_to_header = existing_email.message_id)
        OR
        -- Match by references header (thread contains an already-shared email)
        (NEW."references" IS NOT NULL AND existing_email.message_id = ANY(string_to_array(NEW."references", ' ')))
      )
    ON CONFLICT (email_id, shared_with_user_id) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trg_auto_share_thread_emails
  AFTER INSERT ON emails
  FOR EACH ROW EXECUTE FUNCTION auto_share_thread_emails();

-- ============================================================================
-- Comments
-- ============================================================================

COMMENT ON COLUMN team_email_connections.visibility IS
  'Email connection visibility: shared (all team gestionnaires) or private (owner only)';

COMMENT ON COLUMN team_email_connections.added_by_user_id IS
  'User who created this email connection (owner for private connections)';

COMMENT ON TABLE email_shares IS
  'Tracks per-email access grants for private connection emails shared via conversations';

COMMENT ON FUNCTION auto_share_thread_emails() IS
  'Auto-propagates email_shares when new emails arrive in a thread that has been shared from a private connection';
