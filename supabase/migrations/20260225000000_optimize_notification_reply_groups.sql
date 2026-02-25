-- Optimize notification reply groups: SQL GROUP BY instead of fetching all rows
-- Previously, page.tsx fetched ALL emails with intervention_id IS NOT NULL,
-- then grouped them in JavaScript. This RPC does the grouping in SQL.

CREATE OR REPLACE FUNCTION public.get_notification_reply_groups(p_team_id UUID)
RETURNS TABLE(
  intervention_id UUID,
  intervention_title TEXT,
  email_count BIGINT
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    e.intervention_id,
    i.title AS intervention_title,
    COUNT(*) AS email_count
  FROM emails e
  INNER JOIN interventions i ON i.id = e.intervention_id
  WHERE e.team_id = p_team_id
    AND e.direction = 'received'
    AND e.intervention_id IS NOT NULL
    AND e.deleted_at IS NULL
  GROUP BY e.intervention_id, i.title
  ORDER BY email_count DESC
  LIMIT 20;
$$;

-- Grant execute to authenticated users (RPC access)
GRANT EXECUTE ON FUNCTION public.get_notification_reply_groups(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_notification_reply_groups(UUID) TO service_role;
