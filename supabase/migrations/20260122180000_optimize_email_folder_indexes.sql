-- Migration: 20260121180000_optimize_email_folder_indexes.sql
-- Description: Add composite indexes for email folder queries to fix statement timeout (57014)
-- Problem: getEmailsByFolder uses count: 'exact' with multiple filters but no composite index
-- Solution: Create covering indexes for each folder type (inbox, processed, sent, archive)

-- ============================================================================
-- 1. INBOX: team_id + received + unread + not deleted
-- Query: .eq('direction', 'received').eq('status', 'unread').is('deleted_at', null)
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_emails_folder_inbox
    ON emails(team_id, received_at DESC)
    WHERE direction = 'received'
      AND status = 'unread'
      AND deleted_at IS NULL;

-- ============================================================================
-- 2. PROCESSED: team_id + received + read + not deleted
-- Query: .eq('direction', 'received').eq('status', 'read').is('deleted_at', null)
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_emails_folder_processed
    ON emails(team_id, received_at DESC)
    WHERE direction = 'received'
      AND status = 'read'
      AND deleted_at IS NULL;

-- ============================================================================
-- 3. SENT: team_id + sent + not deleted
-- Query: .eq('direction', 'sent').is('deleted_at', null)
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_emails_folder_sent
    ON emails(team_id, received_at DESC)
    WHERE direction = 'sent'
      AND deleted_at IS NULL;

-- ============================================================================
-- 4. ARCHIVE: team_id + archived + not deleted
-- Query: .eq('status', 'archived').is('deleted_at', null)
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_emails_folder_archive
    ON emails(team_id, received_at DESC)
    WHERE status = 'archived'
      AND deleted_at IS NULL;

-- ============================================================================
-- 5. SOURCE FILTER: team_id + email_connection_id (for "source" dropdown)
-- Query: .eq('email_connection_id', uuid) or .is('email_connection_id', null)
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_emails_team_connection
    ON emails(team_id, email_connection_id, received_at DESC)
    WHERE deleted_at IS NULL;

-- ============================================================================
-- 6. SEARCH: Ensure GIN index exists for full-text search
-- Already created in original migration, but ensure it's there
-- ============================================================================
-- idx_emails_search_vector already exists (GIN index on search_vector)

-- ============================================================================
-- Documentation
-- ============================================================================
COMMENT ON INDEX idx_emails_folder_inbox IS
    'Covering index for inbox folder (unread received emails). Supports fast count: exact.';

COMMENT ON INDEX idx_emails_folder_processed IS
    'Covering index for processed folder (read received emails). Supports fast count: exact.';

COMMENT ON INDEX idx_emails_folder_sent IS
    'Covering index for sent folder (outgoing emails). Supports fast count: exact.';

COMMENT ON INDEX idx_emails_folder_archive IS
    'Covering index for archive folder (archived emails). Supports fast count: exact.';

COMMENT ON INDEX idx_emails_team_connection IS
    'Index for source filter dropdown (filter by email connection). Supports fast pagination.';
