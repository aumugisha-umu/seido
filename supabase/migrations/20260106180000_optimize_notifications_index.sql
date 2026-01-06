-- =============================================================================
-- Migration: Optimize notifications query index
-- Purpose: Speed up notifications page loading by creating an optimized index
-- =============================================================================
--
-- Problem:
-- The notifications page was slow because queries filter by:
--   1. user_id (required)
--   2. is_personal (required for scope filtering)
--   3. read (sorting unread first)
--   4. created_at DESC (ordering)
--   5. archived = FALSE (always excluded)
--
-- The column order in the index matches the typical query filter order,
-- which allows PostgreSQL to use an Index Only Scan when possible.
--
-- Note: notifications table uses 'archived' boolean, not 'deleted_at' timestamp
-- =============================================================================

-- Create optimized index for notifications queries
-- CONCURRENTLY prevents locking the table during index creation (safe for production)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_notifications_user_personal_read_created
  ON notifications(user_id, is_personal, read, created_at DESC)
  WHERE archived = FALSE;

-- Add a comment explaining the purpose
COMMENT ON INDEX idx_notifications_user_personal_read_created IS
  'Optimized index for notifications page queries - partial index excludes archived notifications';
