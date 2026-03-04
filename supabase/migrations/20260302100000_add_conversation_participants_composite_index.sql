-- Performance optimization: composite index for conversation_participants
-- Supports the unread count RPC function (US-012) and all participant lookups
-- that filter on both thread_id AND user_id simultaneously.
-- Existing single-column indexes: idx_participants_thread(thread_id), idx_participants_user(user_id)
-- This composite index avoids a bitmap-AND of two separate index scans.

CREATE INDEX IF NOT EXISTS idx_participants_thread_user
  ON conversation_participants(thread_id, user_id);
