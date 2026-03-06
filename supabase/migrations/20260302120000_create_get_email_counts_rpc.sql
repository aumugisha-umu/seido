-- ============================================================================
-- RPC: get_email_counts — single-scan email folder counts
--
-- Replaces 4 separate count queries with a single table scan using FILTER.
-- Returns inbox (unread received), processed, sent, archive counts.
-- Includes team membership check to prevent cross-tenant data exposure.
-- ============================================================================

CREATE OR REPLACE FUNCTION get_email_counts(p_team_id uuid)
RETURNS TABLE(
  inbox bigint,
  processed bigint,
  sent bigint,
  archive bigint
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
    COUNT(*) FILTER (WHERE status = 'archived' AND deleted_at IS NULL) AS archive
  FROM emails
  WHERE team_id = p_team_id
    -- Authorization: caller must be a member of the team
    AND EXISTS (
      SELECT 1 FROM team_members tm
      WHERE tm.team_id = p_team_id
        AND tm.user_id IN (SELECT get_my_profile_ids())
        AND tm.left_at IS NULL
    );
$$;

-- Grant execute to authenticated users (RPC requires explicit GRANT)
GRANT EXECUTE ON FUNCTION get_email_counts(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION get_email_counts(uuid) TO service_role;
