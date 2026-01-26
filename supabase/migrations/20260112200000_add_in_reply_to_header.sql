-- Migration: Add in_reply_to_header column for RFC 5322 email threading
-- Date: 2026-01-12
-- Purpose: Store the raw In-Reply-To header (Message-ID string) for conversation grouping
--
-- The existing in_reply_to column is a UUID FK referencing emails(id) for direct linking.
-- This new column stores the RFC 5322 In-Reply-To header value (e.g., <xxx@gmail.com>)
-- which is needed for Gmail-style conversation threading.

-- Add the new column for raw RFC In-Reply-To header
ALTER TABLE emails ADD COLUMN IF NOT EXISTS in_reply_to_header TEXT;

-- Create partial index for efficient lookups (only index non-null values)
CREATE INDEX IF NOT EXISTS idx_emails_in_reply_to_header
ON emails(in_reply_to_header)
WHERE in_reply_to_header IS NOT NULL;

-- Add comments for documentation
COMMENT ON COLUMN emails.in_reply_to IS 'UUID FK to parent email record (resolved link). Used for direct parent-child relationship.';
COMMENT ON COLUMN emails.in_reply_to_header IS 'Raw RFC 5322 In-Reply-To header value (Message-ID string). Used for conversation grouping.';
COMMENT ON COLUMN emails.references IS 'Raw RFC 5322 References header (space-separated Message-IDs). First ID is conversation root.';
COMMENT ON COLUMN emails.message_id IS 'RFC 5322 Message-ID header. Unique identifier for this email.';
