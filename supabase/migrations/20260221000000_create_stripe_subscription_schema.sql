-- ============================================================================
-- Migration: Create Stripe subscription billing schema
-- US-002: Foundation for SEIDO subscription system
-- ============================================================================
-- Creates:
--   1. Enum subscription_status (10 values)
--   2. Table subscriptions (team subscription state)
--   3. Table stripe_customers (team <-> Stripe customer mapping)
--   4. Table stripe_invoices (payment history)
--   5. Table stripe_webhook_events (idempotency tracking)
--   6. Trigger tr_lots_subscription_count (lot count tracking)
--   7. Helper functions: can_team_add_property(), is_team_read_only(), cleanup_old_webhook_events()
--   8. RLS policies (admin role only — Correction C4)
--   9. Performance indexes
-- ============================================================================

-- ============================================================================
-- 1. Create subscription_status enum
-- ============================================================================
-- 10 statuses covering the full Stripe subscription lifecycle + SEIDO-specific states
CREATE TYPE subscription_status AS ENUM (
  'trialing',             -- App-managed trial (no Stripe subscription)
  'active',               -- Paid and active
  'past_due',             -- Payment failed, Stripe retrying
  'canceled',             -- Subscription canceled (end of period or immediate)
  'incomplete',           -- First payment requires action (e.g., 3D Secure)
  'incomplete_expired',   -- First payment failed after 23h timeout
  'unpaid',               -- Dunning exhausted (alternative to canceled per Stripe settings)
  'paused',               -- Subscription paused via Portal (pause_collection)
  'free_tier',            -- SEIDO: <= 2 lots, free forever
  'read_only'             -- SEIDO: trial expired with > 2 lots, or canceled
);

-- ============================================================================
-- 2. Create subscriptions table
-- ============================================================================
CREATE TABLE subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  stripe_subscription_id TEXT,                        -- NULL during trial (app-managed)
  stripe_customer_id TEXT,                            -- Stripe customer ID
  price_id TEXT,                                      -- Stripe price ID (annual or monthly)
  status subscription_status NOT NULL DEFAULT 'trialing',

  -- Trial tracking (app-managed)
  trial_start TIMESTAMPTZ,
  trial_end TIMESTAMPTZ,

  -- Stripe subscription period
  current_period_start TIMESTAMPTZ,
  current_period_end TIMESTAMPTZ,

  -- Cancellation tracking
  cancel_at_period_end BOOLEAN NOT NULL DEFAULT false,
  cancel_at TIMESTAMPTZ,
  canceled_at TIMESTAMPTZ,
  ended_at TIMESTAMPTZ,

  -- Lot count tracking
  subscribed_lots INTEGER NOT NULL DEFAULT 0,          -- Lots the user pays for
  billable_properties INTEGER NOT NULL DEFAULT 0,      -- Actual lot count in DB (updated by trigger)

  -- Notification tracking for CRON idempotency
  notification_j7_sent BOOLEAN NOT NULL DEFAULT false,
  notification_j3_sent BOOLEAN NOT NULL DEFAULT false,
  notification_j1_sent BOOLEAN NOT NULL DEFAULT false,
  trial_expired_email_sent BOOLEAN NOT NULL DEFAULT false,

  -- Behavioral trigger tracking
  last_behavioral_email_at TIMESTAMPTZ,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- One subscription per team
  CONSTRAINT uq_subscriptions_team_id UNIQUE (team_id)
);

COMMENT ON TABLE subscriptions IS 'Team subscription state — combines Stripe subscription data with SEIDO-specific trial and free tier tracking';
COMMENT ON COLUMN subscriptions.stripe_subscription_id IS 'Stripe subscription ID (sub_xxx). NULL during app-managed trial.';
COMMENT ON COLUMN subscriptions.subscribed_lots IS 'Number of lots the user is paying for in their Stripe subscription';
COMMENT ON COLUMN subscriptions.billable_properties IS 'Actual lot count in database — updated by trigger, used for comparison with subscribed_lots';

-- ============================================================================
-- 3. Create stripe_customers table
-- ============================================================================
CREATE TABLE stripe_customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  stripe_customer_id TEXT NOT NULL,
  email TEXT,
  name TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT uq_stripe_customers_team_id UNIQUE (team_id),
  CONSTRAINT uq_stripe_customers_stripe_id UNIQUE (stripe_customer_id)
);

COMMENT ON TABLE stripe_customers IS 'Maps SEIDO teams to Stripe customer objects. Created at signup, used for checkout sessions.';

-- ============================================================================
-- 4. Create stripe_invoices table
-- ============================================================================
CREATE TABLE stripe_invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  stripe_invoice_id TEXT NOT NULL,
  subscription_id UUID REFERENCES subscriptions(id) ON DELETE SET NULL,
  stripe_customer_id TEXT NOT NULL,
  amount_due INTEGER NOT NULL DEFAULT 0,               -- In cents
  amount_paid INTEGER NOT NULL DEFAULT 0,              -- In cents
  amount_remaining INTEGER NOT NULL DEFAULT 0,         -- In cents
  currency TEXT NOT NULL DEFAULT 'eur',
  status TEXT NOT NULL DEFAULT 'draft',                -- draft, open, paid, uncollectible, void
  hosted_invoice_url TEXT,
  invoice_pdf TEXT,
  period_start TIMESTAMPTZ,
  period_end TIMESTAMPTZ,
  paid_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT uq_stripe_invoices_stripe_id UNIQUE (stripe_invoice_id)
);

COMMENT ON TABLE stripe_invoices IS 'Payment history synced from Stripe webhooks. Used for displaying invoices in billing page.';

-- ============================================================================
-- 5. Create stripe_webhook_events table (idempotency)
-- ============================================================================
CREATE TABLE stripe_webhook_events (
  event_id TEXT PRIMARY KEY,                           -- Stripe event ID (evt_xxx)
  event_type TEXT NOT NULL,
  processed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  team_id UUID REFERENCES teams(id) ON DELETE SET NULL
);

COMMENT ON TABLE stripe_webhook_events IS 'Tracks processed webhook events to ensure idempotent processing. Cleaned up by CRON after 30 days.';

-- ============================================================================
-- 6. Trigger: tr_lots_subscription_count
-- ============================================================================
-- Counts ONLY lots (not buildings) — buildings are organizational containers
CREATE OR REPLACE FUNCTION update_subscription_lot_count()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_team_id UUID;
  v_count INTEGER;
BEGIN
  IF TG_OP = 'DELETE' THEN
    v_team_id := OLD.team_id;
  ELSE
    v_team_id := NEW.team_id;
  END IF;

  -- Count all non-deleted lots for this team
  SELECT COUNT(*) INTO v_count
  FROM lots
  WHERE team_id = v_team_id
    AND deleted_at IS NULL;

  -- Update subscription billable_properties (tracking field, NOT the paid quantity)
  UPDATE subscriptions
  SET billable_properties = v_count,
      updated_at = now()
  WHERE team_id = v_team_id;

  RETURN COALESCE(NEW, OLD);
END;
$$;

-- Drop any existing trigger on lots for subscription count
DROP TRIGGER IF EXISTS tr_lots_subscription_count ON lots;
DROP TRIGGER IF EXISTS tr_buildings_subscription_count ON buildings;

CREATE TRIGGER tr_lots_subscription_count
AFTER INSERT OR UPDATE OF deleted_at OR DELETE ON lots
FOR EACH ROW EXECUTE FUNCTION update_subscription_lot_count();

-- ============================================================================
-- 7. Helper functions
-- ============================================================================

-- can_team_add_property(team_id): Check if team can add a new lot
CREATE OR REPLACE FUNCTION can_team_add_property(p_team_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_status subscription_status;
  v_subscribed INTEGER;
  v_actual INTEGER;
BEGIN
  SELECT status, subscribed_lots, billable_properties
  INTO v_status, v_subscribed, v_actual
  FROM subscriptions
  WHERE team_id = p_team_id;

  -- No subscription = new team, allow (they'll get trial/free tier)
  IF NOT FOUND THEN
    RETURN true;
  END IF;

  -- Read-only or canceled = cannot add
  IF v_status IN ('read_only', 'canceled', 'unpaid', 'incomplete_expired') THEN
    RETURN false;
  END IF;

  -- Free tier: allow if still under limit
  IF v_status = 'free_tier' THEN
    RETURN v_actual < 2;  -- Can add up to 2 lots total
  END IF;

  -- Trialing: always allow (no limit during trial)
  IF v_status = 'trialing' THEN
    RETURN true;
  END IF;

  -- Active/past_due/paused/incomplete: depends on subscription capacity
  -- If subscribed_lots is 0, they haven't subscribed yet (treat as trialing)
  IF v_subscribed = 0 THEN
    RETURN true;
  END IF;

  -- Allow if actual < subscribed
  RETURN v_actual < v_subscribed;
END;
$$;

COMMENT ON FUNCTION can_team_add_property IS 'Check if team can add a new lot based on subscription status and limits.';

-- is_team_read_only(team_id): Check if team is in read-only mode
CREATE OR REPLACE FUNCTION is_team_read_only(p_team_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_status subscription_status;
BEGIN
  SELECT status INTO v_status
  FROM subscriptions
  WHERE team_id = p_team_id;

  -- No subscription = not read-only
  IF NOT FOUND THEN
    RETURN false;
  END IF;

  RETURN v_status = 'read_only';
END;
$$;

COMMENT ON FUNCTION is_team_read_only IS 'Returns true if team subscription is in read-only mode (expired trial with > 2 lots).';

-- cleanup_old_webhook_events(): Remove events older than 30 days
CREATE OR REPLACE FUNCTION cleanup_old_webhook_events()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_deleted INTEGER;
BEGIN
  DELETE FROM stripe_webhook_events
  WHERE processed_at < now() - INTERVAL '30 days';

  GET DIAGNOSTICS v_deleted = ROW_COUNT;
  RETURN v_deleted;
END;
$$;

COMMENT ON FUNCTION cleanup_old_webhook_events IS 'Cleanup webhook idempotency records older than 30 days. Called by weekly CRON.';

-- ============================================================================
-- 8. RLS Policies
-- ============================================================================

-- Subscriptions: admin role can read their team subscription
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Team admins can view subscription"
ON subscriptions FOR SELECT
TO authenticated
USING (
  team_id IN (
    SELECT tm.team_id
    FROM team_members tm
    JOIN users u ON u.id = tm.user_id
    WHERE u.auth_user_id = auth.uid()
      AND u.deleted_at IS NULL
      AND tm.role = 'admin'::team_member_role
      AND tm.left_at IS NULL
  )
);
-- No INSERT/UPDATE/DELETE policies for authenticated — all writes via service_role (webhook + CRON)

-- Stripe Customers: admin can read
ALTER TABLE stripe_customers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Team admins can view stripe customer"
ON stripe_customers FOR SELECT
TO authenticated
USING (
  team_id IN (
    SELECT tm.team_id
    FROM team_members tm
    JOIN users u ON u.id = tm.user_id
    WHERE u.auth_user_id = auth.uid()
      AND u.deleted_at IS NULL
      AND tm.role = 'admin'::team_member_role
      AND tm.left_at IS NULL
  )
);

-- Stripe Invoices: admin can read their invoices
ALTER TABLE stripe_invoices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Team admins can view invoices"
ON stripe_invoices FOR SELECT
TO authenticated
USING (
  subscription_id IN (
    SELECT s.id FROM subscriptions s
    JOIN team_members tm ON s.team_id = tm.team_id
    JOIN users u ON u.id = tm.user_id
    WHERE u.auth_user_id = auth.uid()
      AND u.deleted_at IS NULL
      AND tm.role = 'admin'::team_member_role
      AND tm.left_at IS NULL
  )
);

-- Webhook Events: service_role only (no authenticated access)
ALTER TABLE stripe_webhook_events ENABLE ROW LEVEL SECURITY;
-- No policies = no authenticated access

-- ============================================================================
-- 9. Performance Indexes
-- ============================================================================
CREATE INDEX idx_subscriptions_team_id ON subscriptions(team_id);
CREATE INDEX idx_subscriptions_status ON subscriptions(status);
CREATE INDEX idx_subscriptions_stripe_sub_id ON subscriptions(stripe_subscription_id) WHERE stripe_subscription_id IS NOT NULL;
CREATE INDEX idx_stripe_customers_team_id ON stripe_customers(team_id);
CREATE INDEX idx_stripe_customers_stripe_id ON stripe_customers(stripe_customer_id);
CREATE INDEX idx_stripe_invoices_subscription_id ON stripe_invoices(subscription_id);
CREATE INDEX idx_stripe_invoices_stripe_id ON stripe_invoices(stripe_invoice_id);
CREATE INDEX idx_webhook_events_processed ON stripe_webhook_events(processed_at);
