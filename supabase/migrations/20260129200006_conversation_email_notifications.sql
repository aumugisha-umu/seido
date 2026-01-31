-- Migration: Add throttling support for conversation email notifications
-- Date: 2026-01-28
-- Purpose: Track last email notification sent per thread to prevent spam (max 1 per 5 min)

-- ══════════════════════════════════════════════════════════════════════════════
-- 1. Add throttling column to conversation_threads
-- ══════════════════════════════════════════════════════════════════════════════

ALTER TABLE conversation_threads
ADD COLUMN IF NOT EXISTS last_email_notification_at TIMESTAMPTZ DEFAULT NULL;

-- Add comment for documentation
COMMENT ON COLUMN conversation_threads.last_email_notification_at IS
  'Last time an email notification was sent for this thread. Used for throttling (max 1 email per 5 minutes).';

-- ══════════════════════════════════════════════════════════════════════════════
-- 2. Add index for efficient throttling queries
-- ══════════════════════════════════════════════════════════════════════════════

-- Index to optimize queries that check if a notification was recently sent
CREATE INDEX IF NOT EXISTS idx_conversation_threads_last_email_notification
  ON conversation_threads (last_email_notification_at)
  WHERE last_email_notification_at IS NOT NULL;
