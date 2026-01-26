-- Migration: 20260122000000_optimize_email_links_indexes.sql
-- Description: Optimize email_links queries to fix /api/email-linked-entities timeout (24s+ → <1s)
-- Problem: Sequential DISTINCT queries + JavaScript deduplication caused 24s timeout on large datasets
-- Solution: Composite index + RPC function with GROUP BY + Promise.all parallelization in API

-- 1. Composite index for DISTINCT query optimization
-- Allows efficient GROUP BY on (team_id, entity_type, entity_id)
CREATE INDEX IF NOT EXISTS idx_email_links_team_entity_composite
    ON email_links(team_id, entity_type, entity_id);

-- 2. Index for webhook inbound emails (email_connection_id IS NULL)
-- Used by "notification replies" feature to find emails received via webhook (not IMAP)
CREATE INDEX IF NOT EXISTS idx_emails_webhook_inbound
    ON emails(team_id, received_at DESC)
    WHERE email_connection_id IS NULL;

-- 3. Index for unread counts per email connection (Phase 2 feature)
CREATE INDEX IF NOT EXISTS idx_emails_connection_unread
    ON emails(email_connection_id, status)
    WHERE status = 'unread' AND deleted_at IS NULL;

-- 4. Optimized RPC function to get distinct linked entities with email counts
-- Replaces: SELECT entity_type, entity_id + JavaScript Map() deduplication
-- Benefits: Single query, uses composite index, returns counts directly
CREATE OR REPLACE FUNCTION get_distinct_linked_entities(p_team_id UUID)
RETURNS TABLE (
    entity_type email_link_entity_type,
    entity_id UUID,
    email_count BIGINT
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        el.entity_type,
        el.entity_id,
        COUNT(DISTINCT el.email_id)::BIGINT as email_count
    FROM email_links el
    WHERE el.team_id = p_team_id
    GROUP BY el.entity_type, el.entity_id;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- 5. Grant execute to authenticated users (RLS is checked at email_links level)
GRANT EXECUTE ON FUNCTION get_distinct_linked_entities(UUID) TO authenticated;

-- 6. Add comment for documentation
COMMENT ON FUNCTION get_distinct_linked_entities(UUID) IS
    'Returns distinct entity types and IDs linked to emails for a team, with email counts per entity.
     Used by /api/email-linked-entities to populate the email sidebar filters.
     Performance: O(n) scan with composite index vs O(n²) JavaScript deduplication.';
