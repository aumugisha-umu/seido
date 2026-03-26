-- Atomic increment for rent_call total_received.
-- Prevents TOCTOU race when multiple bank transactions reconcile
-- against the same rent call concurrently.
CREATE OR REPLACE FUNCTION increment_rent_call_received(
  p_rent_call_id UUID,
  p_delta NUMERIC
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE rent_calls
  SET total_received = GREATEST(0, COALESCE(total_received, 0) + p_delta)
  WHERE id = p_rent_call_id;
END;
$$;

GRANT EXECUTE ON FUNCTION increment_rent_call_received(UUID, NUMERIC) TO authenticated;
