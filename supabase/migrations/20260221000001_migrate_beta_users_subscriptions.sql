-- ============================================================================
-- Migration: Beta users subscription initialization
-- US-003: Create subscription records for all existing teams
-- ============================================================================
-- Rules:
--   - Teams with <= 2 lots -> status = 'free_tier'
--   - Teams with > 2 lots -> status = 'trialing', trial_end = now + 30 days
--   - Idempotent: uses INSERT ... ON CONFLICT DO NOTHING
--   - Stripe Customers will be created via application code on first billing access
--     (not in this migration — no Stripe API calls from SQL)
-- ============================================================================

-- Insert subscription records for all existing teams that don't have one
INSERT INTO subscriptions (
  team_id,
  status,
  trial_start,
  trial_end,
  billable_properties,
  created_at,
  updated_at
)
SELECT
  t.id AS team_id,
  CASE
    WHEN COALESCE(lot_counts.lot_count, 0) <= 2 THEN 'free_tier'::subscription_status
    ELSE 'trialing'::subscription_status
  END AS status,
  -- Trial start = now (deployment date)
  CASE
    WHEN COALESCE(lot_counts.lot_count, 0) > 2 THEN now()
    ELSE NULL  -- Free tier doesn't need trial dates
  END AS trial_start,
  -- Trial end = 30 days from deployment
  CASE
    WHEN COALESCE(lot_counts.lot_count, 0) > 2 THEN now() + INTERVAL '30 days'
    ELSE NULL
  END AS trial_end,
  COALESCE(lot_counts.lot_count, 0) AS billable_properties,
  now() AS created_at,
  now() AS updated_at
FROM teams t
LEFT JOIN (
  SELECT team_id, COUNT(*) AS lot_count
  FROM lots
  WHERE deleted_at IS NULL
  GROUP BY team_id
) lot_counts ON lot_counts.team_id = t.id
WHERE t.deleted_at IS NULL
ON CONFLICT (team_id) DO NOTHING;

-- Log results
DO $$
DECLARE
  v_total INTEGER;
  v_free INTEGER;
  v_trialing INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_total FROM subscriptions;
  SELECT COUNT(*) INTO v_free FROM subscriptions WHERE status = 'free_tier';
  SELECT COUNT(*) INTO v_trialing FROM subscriptions WHERE status = 'trialing';

  RAISE NOTICE 'Beta migration complete: % total subscriptions (% free_tier, % trialing)',
    v_total, v_free, v_trialing;
END $$;
