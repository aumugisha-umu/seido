-- ============================================================================
-- Atomic upsert for AI phone usage counter
-- ============================================================================
-- Prevents race conditions when two calls complete simultaneously for the same team.
-- Uses INSERT ... ON CONFLICT DO UPDATE with SQL-level addition.
-- ============================================================================

CREATE OR REPLACE FUNCTION upsert_ai_phone_usage(
  p_team_id UUID,
  p_month DATE,
  p_minutes INTEGER
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO ai_phone_usage (team_id, month, minutes_used, calls_count)
  VALUES (p_team_id, p_month, p_minutes, 1)
  ON CONFLICT (team_id, month)
  DO UPDATE SET
    minutes_used = ai_phone_usage.minutes_used + EXCLUDED.minutes_used,
    calls_count = ai_phone_usage.calls_count + 1;
END;
$$;

GRANT EXECUTE ON FUNCTION upsert_ai_phone_usage TO authenticated, service_role;
