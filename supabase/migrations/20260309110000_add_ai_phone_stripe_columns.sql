-- ============================================================================
-- Add Stripe subscription tracking to ai_phone_numbers
-- ============================================================================

ALTER TABLE ai_phone_numbers
  ADD COLUMN IF NOT EXISTS stripe_ai_subscription_id TEXT,
  ADD COLUMN IF NOT EXISTS stripe_ai_price_id TEXT;

-- Index for webhook lookup by subscription_id
CREATE INDEX IF NOT EXISTS idx_ai_phone_numbers_stripe_sub
  ON ai_phone_numbers (stripe_ai_subscription_id)
  WHERE stripe_ai_subscription_id IS NOT NULL;
