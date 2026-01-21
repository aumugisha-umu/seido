-- ============================================================================
-- Migration: Create System User for Email Replies
-- Purpose: When external users reply to notifications by email, we need a
--          user_id to store conversation messages (FK constraint NOT NULL).
--          This system user serves as a proxy for all external email senders.
-- ============================================================================

-- Create the system user for email messages
-- Note: Uses a well-known UUID for easy identification and queries
INSERT INTO users (
  id,
  auth_user_id,
  email,
  name,
  first_name,
  last_name,
  role
)
VALUES (
  '00000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000001',  -- Fake auth_user_id (no real auth)
  'system@seido-app.com',
  'SEIDO Email',
  'SEIDO',
  'Email',
  'admin'  -- System role
)
ON CONFLICT (id) DO NOTHING;

-- Add a comment to explain the system user
COMMENT ON COLUMN users.id IS
  'Primary key. Note: UUID 00000000-0000-0000-0000-000000000001 is reserved for the SEIDO Email system user (used for email replies from external senders).';

-- Index to quickly identify system-generated messages
CREATE INDEX IF NOT EXISTS idx_conversation_messages_system_user
  ON conversation_messages (user_id)
  WHERE user_id = '00000000-0000-0000-0000-000000000001';

-- Index for querying email-sourced messages
CREATE INDEX IF NOT EXISTS idx_conversation_messages_email_source
  ON conversation_messages ((metadata->>'source'))
  WHERE metadata->>'source' = 'email';
