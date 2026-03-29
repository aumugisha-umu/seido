-- ============================================================================
-- Add conversation_history JSONB column to phone_team_mappings
-- ============================================================================
-- Stores structured summaries of past conversations for AI context injection.
-- Format: { compacted?: string, compacted_count?: number, entries: [...] }
-- Entries are compacted every 10 conversations.

ALTER TABLE phone_team_mappings
  ADD COLUMN conversation_history JSONB NOT NULL DEFAULT '{"entries":[]}';

COMMENT ON COLUMN phone_team_mappings.conversation_history IS
  'Structured summaries of past conversations. entries[] holds recent (max 10), compacted holds older summary text.';
