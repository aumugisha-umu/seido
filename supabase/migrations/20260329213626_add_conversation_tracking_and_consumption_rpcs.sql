-- =============================================================================
-- Migration: Add conversation tracking + proportional consumption RPCs
-- =============================================================================
-- Adds conversation counters to ai_phone_usage and creates atomic RPCs
-- for recording voice/conversation usage with cross-deduction (ratio 5:3).
-- =============================================================================

-- 1. Add new columns to ai_phone_usage
ALTER TABLE ai_phone_usage
  ADD COLUMN IF NOT EXISTS conversations_used NUMERIC(10, 2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS conversations_included INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS minutes_included INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS topup_minutes_added NUMERIC(10, 2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS topup_conversations_added NUMERIC(10, 2) NOT NULL DEFAULT 0;

-- 2. RPC: record_voice_usage
-- Atomically increments minutes_used + cross-deducts conversations
-- Returns remaining quotas and exhaustion flag
CREATE OR REPLACE FUNCTION record_voice_usage(
  p_team_id UUID,
  p_month DATE,
  p_minutes NUMERIC,
  p_minutes_included INTEGER DEFAULT 0,
  p_conversations_included INTEGER DEFAULT 0
)
RETURNS TABLE(
  minutes_remaining NUMERIC,
  conversations_remaining NUMERIC,
  quota_exhausted BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_conv_cross NUMERIC;
  v_min_rem NUMERIC;
  v_conv_rem NUMERIC;
BEGIN
  -- Input validation
  IF p_minutes < 0 THEN
    RAISE EXCEPTION 'p_minutes must be non-negative';
  END IF;

  -- Cross-deduction: 1 min = 5/3 conversations
  v_conv_cross := p_minutes * 5.0 / 3.0;

  -- Upsert: insert or update usage row
  INSERT INTO ai_phone_usage (
    id, team_id, month,
    minutes_used, conversations_used, calls_count,
    minutes_included, conversations_included,
    topup_minutes_added, topup_conversations_added,
    created_at, updated_at
  ) VALUES (
    gen_random_uuid(), p_team_id, p_month,
    p_minutes, v_conv_cross, 1,
    p_minutes_included, p_conversations_included,
    0, 0,
    now(), now()
  )
  ON CONFLICT (team_id, month)
  DO UPDATE SET
    minutes_used = ai_phone_usage.minutes_used + p_minutes,
    conversations_used = ai_phone_usage.conversations_used + v_conv_cross,
    calls_count = ai_phone_usage.calls_count + 1,
    -- Update included quotas if provided (first call of month sets them)
    minutes_included = GREATEST(ai_phone_usage.minutes_included, p_minutes_included),
    conversations_included = GREATEST(ai_phone_usage.conversations_included, p_conversations_included),
    updated_at = now();

  -- Calculate remaining
  SELECT
    (u.minutes_included + u.topup_minutes_added) - u.minutes_used,
    (u.conversations_included + u.topup_conversations_added) - u.conversations_used
  INTO v_min_rem, v_conv_rem
  FROM ai_phone_usage u
  WHERE u.team_id = p_team_id AND u.month = p_month;

  RETURN QUERY SELECT
    v_min_rem,
    v_conv_rem,
    (v_min_rem <= 0 AND v_conv_rem <= 0);
END;
$$;

-- 3. RPC: record_conversation_usage
-- Atomically increments conversations_used + cross-deducts minutes
CREATE OR REPLACE FUNCTION record_conversation_usage(
  p_team_id UUID,
  p_month DATE,
  p_conversations NUMERIC DEFAULT 1,
  p_minutes_included INTEGER DEFAULT 0,
  p_conversations_included INTEGER DEFAULT 0
)
RETURNS TABLE(
  minutes_remaining NUMERIC,
  conversations_remaining NUMERIC,
  quota_exhausted BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_min_cross NUMERIC;
  v_min_rem NUMERIC;
  v_conv_rem NUMERIC;
BEGIN
  -- Input validation
  IF p_conversations < 0 THEN
    RAISE EXCEPTION 'p_conversations must be non-negative';
  END IF;

  -- Cross-deduction: 1 conv = 3/5 minutes
  v_min_cross := p_conversations * 3.0 / 5.0;

  INSERT INTO ai_phone_usage (
    id, team_id, month,
    minutes_used, conversations_used, calls_count,
    minutes_included, conversations_included,
    topup_minutes_added, topup_conversations_added,
    created_at, updated_at
  ) VALUES (
    gen_random_uuid(), p_team_id, p_month,
    v_min_cross, p_conversations, 0,
    p_minutes_included, p_conversations_included,
    0, 0,
    now(), now()
  )
  ON CONFLICT (team_id, month)
  DO UPDATE SET
    minutes_used = ai_phone_usage.minutes_used + v_min_cross,
    conversations_used = ai_phone_usage.conversations_used + p_conversations,
    -- Don't increment calls_count for text conversations
    minutes_included = GREATEST(ai_phone_usage.minutes_included, p_minutes_included),
    conversations_included = GREATEST(ai_phone_usage.conversations_included, p_conversations_included),
    updated_at = now();

  SELECT
    (u.minutes_included + u.topup_minutes_added) - u.minutes_used,
    (u.conversations_included + u.topup_conversations_added) - u.conversations_used
  INTO v_min_rem, v_conv_rem
  FROM ai_phone_usage u
  WHERE u.team_id = p_team_id AND u.month = p_month;

  RETURN QUERY SELECT
    v_min_rem,
    v_conv_rem,
    (v_min_rem <= 0 AND v_conv_rem <= 0);
END;
$$;

-- 4. RPC: apply_topup_credits
-- Adds topup credits to the current month's usage row
CREATE OR REPLACE FUNCTION apply_topup_credits(
  p_team_id UUID,
  p_month DATE,
  p_minutes NUMERIC,
  p_conversations NUMERIC
)
RETURNS TABLE(
  minutes_remaining NUMERIC,
  conversations_remaining NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_min_rem NUMERIC;
  v_conv_rem NUMERIC;
BEGIN
  -- Input validation
  IF p_minutes < 0 OR p_conversations < 0 THEN
    RAISE EXCEPTION 'topup credits must be non-negative';
  END IF;

  UPDATE ai_phone_usage
  SET
    topup_minutes_added = topup_minutes_added + p_minutes,
    topup_conversations_added = topup_conversations_added + p_conversations,
    updated_at = now()
  WHERE team_id = p_team_id AND month = p_month;

  -- If no row exists yet, create one with topup credits
  IF NOT FOUND THEN
    INSERT INTO ai_phone_usage (
      id, team_id, month,
      minutes_used, conversations_used, calls_count,
      minutes_included, conversations_included,
      topup_minutes_added, topup_conversations_added,
      created_at, updated_at
    ) VALUES (
      gen_random_uuid(), p_team_id, p_month,
      0, 0, 0,
      0, 0,
      p_minutes, p_conversations,
      now(), now()
    );
  END IF;

  SELECT
    (u.minutes_included + u.topup_minutes_added) - u.minutes_used,
    (u.conversations_included + u.topup_conversations_added) - u.conversations_used
  INTO v_min_rem, v_conv_rem
  FROM ai_phone_usage u
  WHERE u.team_id = p_team_id AND u.month = p_month;

  RETURN QUERY SELECT v_min_rem, v_conv_rem;
END;
$$;

-- 5. Grant access (service_role only — these are SECURITY DEFINER, never called from client)
GRANT EXECUTE ON FUNCTION record_voice_usage TO service_role;
GRANT EXECUTE ON FUNCTION record_conversation_usage TO service_role;
GRANT EXECUTE ON FUNCTION apply_topup_credits TO service_role;
