-- ============================================================================
-- RPC: get_email_counts v2 — folder counts + per-source unread counts
--
-- Fixes:
-- 1. Removes get_my_profile_ids() guard that blocks service_role calls
--    (SECURITY DEFINER + p_team_id is sufficient; caller validated upstream)
-- 2. Adds source_counts JSONB: { email_connection_id → unread_count }
--    for per-mailbox unread badges in the sidebar
-- ============================================================================

-- Drop the old function signature first
DROP FUNCTION IF EXISTS get_email_counts(uuid);

CREATE OR REPLACE FUNCTION get_email_counts(p_team_id uuid)
RETURNS TABLE(
  inbox bigint,
  processed bigint,
  sent bigint,
  archive bigint,
  source_counts jsonb
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    COUNT(*) FILTER (WHERE direction = 'received' AND status = 'unread' AND deleted_at IS NULL) AS inbox,
    COUNT(*) FILTER (WHERE direction = 'received' AND status = 'read' AND deleted_at IS NULL) AS processed,
    COUNT(*) FILTER (WHERE direction = 'sent' AND deleted_at IS NULL) AS sent,
    COUNT(*) FILTER (WHERE status = 'archived' AND deleted_at IS NULL) AS archive,
    COALESCE(
      (
        SELECT jsonb_object_agg(ec_id, unread_ct)
        FROM (
          SELECT
            email_connection_id AS ec_id,
            COUNT(*) AS unread_ct
          FROM emails
          WHERE team_id = p_team_id
            AND direction = 'received'
            AND status = 'unread'
            AND deleted_at IS NULL
            AND email_connection_id IS NOT NULL
          GROUP BY email_connection_id
        ) sub
      ),
      '{}'::jsonb
    ) AS source_counts
  FROM emails
  WHERE team_id = p_team_id;
$$;

-- Grant execute to both authenticated and service_role
GRANT EXECUTE ON FUNCTION get_email_counts(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION get_email_counts(uuid) TO service_role;
