-- Migration: Deduplicate emails and add UNIQUE constraint on (team_id, message_id)
--
-- Problem: IMAP sync has no dedup check, and no DB constraint prevents duplicates.
-- Multiple sync runs on the same email create duplicate rows.
--
-- Solution:
-- 1. Delete duplicate emails (keep the oldest row per team_id + message_id)
-- 2. Add UNIQUE partial index on (team_id, message_id) WHERE message_id IS NOT NULL

-- Step 1: Clean up existing duplicates
-- Keep the row with the earliest created_at (original sync), delete later duplicates
DELETE FROM emails
WHERE id IN (
  SELECT id FROM (
    SELECT
      id,
      ROW_NUMBER() OVER (
        PARTITION BY team_id, message_id
        ORDER BY created_at ASC
      ) AS rn
    FROM emails
    WHERE message_id IS NOT NULL
  ) ranked
  WHERE rn > 1
);

-- Step 2: Add UNIQUE partial index (only for non-null message_ids)
-- This prevents future duplicates during IMAP sync
CREATE UNIQUE INDEX IF NOT EXISTS idx_emails_unique_message_id_per_team
  ON emails (team_id, message_id)
  WHERE message_id IS NOT NULL;
