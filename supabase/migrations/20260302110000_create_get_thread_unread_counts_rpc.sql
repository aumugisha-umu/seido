-- Migration: Create get_thread_unread_counts RPC
-- Replaces N+1 per-thread unread count queries with a single batch call.
-- Used by gestionnaire/locataire/prestataire intervention detail pages.

CREATE OR REPLACE FUNCTION get_thread_unread_counts(
  p_thread_ids uuid[],
  p_user_id uuid
)
RETURNS TABLE(thread_id uuid, unread_count bigint)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    t.thread_id,
    COALESCE(
      CASE
        -- No participant record or NULL last_read_message_id → count ALL messages
        WHEN cp.last_read_message_id IS NULL THEN (
          SELECT COUNT(*)
          FROM conversation_messages cm
          WHERE cm.thread_id = t.thread_id
            AND cm.deleted_at IS NULL
        )
        -- last_read message exists → count messages created after it
        WHEN lr.created_at IS NOT NULL THEN (
          SELECT COUNT(*)
          FROM conversation_messages cm
          WHERE cm.thread_id = t.thread_id
            AND cm.deleted_at IS NULL
            AND cm.created_at > lr.created_at
        )
        -- last_read message was deleted → return 0 (match current app behavior)
        ELSE 0
      END,
      0
    )::bigint AS unread_count
  FROM unnest(p_thread_ids) AS t(thread_id)
  LEFT JOIN conversation_participants cp
    ON cp.thread_id = t.thread_id AND cp.user_id = p_user_id
  LEFT JOIN conversation_messages lr
    ON lr.id = cp.last_read_message_id;
END;
$$;

-- Grant execute to authenticated users (function is SECURITY DEFINER to bypass RLS on conversation tables)
GRANT EXECUTE ON FUNCTION get_thread_unread_counts(uuid[], uuid) TO authenticated;

COMMENT ON FUNCTION get_thread_unread_counts IS
  'Batch unread count for multiple threads. Replaces N+1 per-thread queries. '
  'Edge cases: NULL last_read = count all; deleted last_read = 0; non-participant = count all.';
