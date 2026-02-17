# Stripe Subscription Integration - Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Implement Stripe subscription billing for SEIDO with per-lot pricing, 30-day app-managed trial, annual-first aggressive push, zero-friction upgrades, and read-only mode on expiry.

**Design Reference:** `docs/stripe/2026-01-30-stripe-subscription-design.md`

**Tech Stack:** Next.js 15, Stripe API, Supabase PostgreSQL, shadcn/ui, TypeScript

---

## Phase 1: Foundation & Infrastructure

### Task 1.1: Install Stripe Package

**Files:**
- Modify: `package.json`

**Steps:**

1. Install Stripe SDK:
```bash
npm install stripe @stripe/stripe-js
```

2. Verify installation:
```bash
npm ls stripe @stripe/stripe-js
```

Expected: Both packages installed (stripe for server, @stripe/stripe-js for client)

---

### Task 1.2: Add Environment Variables

**Files:**
- Modify: `.env.local`
- Modify: `.env.example`

**Steps:**

1. Add to `.env.local`:
```env
# Stripe Configuration
STRIPE_SECRET_KEY=sk_test_YOUR_KEY
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_YOUR_KEY
STRIPE_WEBHOOK_SECRET=whsec_YOUR_SECRET

# Stripe Product IDs (to be created in Dashboard)
STRIPE_PRICE_MONTHLY=price_xxx
STRIPE_PRICE_ANNUAL=price_xxx

# CRON Secret (for Vercel CRON authorization)
CRON_SECRET=xxx
```

2. Add placeholders to `.env.example`:
```env
# Stripe Configuration
STRIPE_SECRET_KEY=sk_test_xxx
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_xxx
STRIPE_WEBHOOK_SECRET=whsec_xxx
STRIPE_PRICE_MONTHLY=price_xxx
STRIPE_PRICE_ANNUAL=price_xxx
CRON_SECRET=xxx
```

---

### Task 1.3: Create Stripe Utility Library

**Files:**
- Create: `lib/stripe.ts`

**Content:**

```typescript
import Stripe from 'stripe'

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error('STRIPE_SECRET_KEY is not set')
}

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  // Use 2025-09-30.clover or later — flexible billing mode is DEFAULT
  // If using 2025-06-30.basil, you must pass billing_mode: {type: 'flexible'}
  // explicitly in each subscription/checkout creation call
  // Check latest: https://docs.stripe.com/upgrades
  apiVersion: '2025-09-30.clover',
  typescript: true,
})

// Price IDs from environment
export const STRIPE_PRICES = {
  annual: process.env.STRIPE_PRICE_ANNUAL!,   // Default — always listed first
  monthly: process.env.STRIPE_PRICE_MONTHLY!,
} as const

// Free tier threshold
export const FREE_TIER_LIMIT = 2

// Trial period in days
export const TRIAL_DAYS = 30

// Calculate price based on lot count and billing interval (in cents)
export function calculatePrice(lotCount: number, interval: 'month' | 'year'): number {
  if (lotCount <= FREE_TIER_LIMIT) return 0
  const pricePerLot = interval === 'year' ? 5000 : 500
  return lotCount * pricePerLot
}

// Calculate annual savings vs monthly (in cents)
export function calculateAnnualSavings(lotCount: number): number {
  const monthlyTotal = lotCount * 500 * 12  // 5€/lot × 12 months
  const annualTotal = lotCount * 5000       // 50€/lot/year
  return monthlyTotal - annualTotal          // Savings per year
}
```

---

### Task 1.4: Database Migration - Update Subscription Schema

**Files:**
- Create: `supabase/migrations/YYYYMMDDHHMMSS_update_subscription_schema_for_stripe.sql`

**Content:**

```sql
-- ============================================================================
-- Migration: Update subscription schema for Stripe integration
-- ============================================================================

-- 1. Add new enum values
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum
    WHERE enumlabel = 'free_tier'
    AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'subscription_status')
  ) THEN
    ALTER TYPE subscription_status ADD VALUE 'free_tier';
  END IF;
END$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum
    WHERE enumlabel = 'read_only'
    AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'subscription_status')
  ) THEN
    ALTER TYPE subscription_status ADD VALUE 'read_only';
  END IF;
END$$;

-- 2. Add subscribed_lots column to track user's subscribed quantity
ALTER TABLE subscriptions
ADD COLUMN IF NOT EXISTS subscribed_lots INTEGER NOT NULL DEFAULT 0;

COMMENT ON COLUMN subscriptions.subscribed_lots IS
  'Number of lots the user is paying for in their subscription';

COMMENT ON COLUMN subscriptions.billable_properties IS
  'Actual lot count in the database - for tracking, NOT billing';

-- 3. Update the trigger to ONLY count lots (not buildings)
CREATE OR REPLACE FUNCTION update_subscription_lot_count()
RETURNS TRIGGER AS $$
DECLARE
  v_team_id UUID;
  v_count INTEGER;
BEGIN
  IF TG_OP = 'DELETE' THEN
    v_team_id := OLD.team_id;
  ELSE
    v_team_id := NEW.team_id;
  END IF;

  -- Count ALL lots (both in buildings and standalone)
  SELECT COUNT(*) INTO v_count
  FROM lots
  WHERE team_id = v_team_id
    AND deleted_at IS NULL;

  -- Update subscription tracking field
  UPDATE subscriptions
  SET billable_properties = v_count,
      updated_at = NOW()
  WHERE team_id = v_team_id;

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Drop old building trigger (we only count lots now)
DROP TRIGGER IF EXISTS tr_buildings_subscription_count ON buildings;

-- 5. Recreate lot trigger with updated function
DROP TRIGGER IF EXISTS tr_lots_subscription_count ON lots;

CREATE TRIGGER tr_lots_subscription_count
AFTER INSERT OR UPDATE OF deleted_at OR DELETE ON lots
FOR EACH ROW EXECUTE FUNCTION update_subscription_lot_count();

-- 6. Add helper function to check if team can add property
CREATE OR REPLACE FUNCTION can_team_add_property(p_team_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  v_status subscription_status;
  v_subscribed_lots INTEGER;
  v_actual_lots INTEGER;
  v_trial_end TIMESTAMP WITH TIME ZONE;
BEGIN
  -- Get subscription info
  SELECT status, subscribed_lots, trial_end, billable_properties
  INTO v_status, v_subscribed_lots, v_trial_end, v_actual_lots
  FROM subscriptions
  WHERE team_id = p_team_id
  LIMIT 1;

  -- No subscription found
  IF v_status IS NULL THEN
    RETURN FALSE;
  END IF;

  -- Free tier: allow up to 2 lots
  IF v_status = 'free_tier' THEN
    RETURN v_actual_lots < 2;
  END IF;

  -- Trial period: unlimited
  IF v_status = 'trialing' AND v_trial_end > NOW() THEN
    RETURN TRUE;
  END IF;

  -- Active subscription: check against subscribed quantity
  IF v_status IN ('active', 'past_due') THEN
    RETURN v_actual_lots < v_subscribed_lots;
  END IF;

  -- read_only, canceled, etc: not allowed
  RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7. Webhook events tracking for idempotency
CREATE TABLE IF NOT EXISTS stripe_webhook_events (
  event_id TEXT PRIMARY KEY,          -- Stripe event ID (evt_xxx)
  event_type TEXT NOT NULL,
  processed_at TIMESTAMPTZ DEFAULT NOW(),
  team_id UUID REFERENCES teams(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_webhook_events_processed
  ON stripe_webhook_events(processed_at);

-- 8. Cleanup function for old webhook events (run via CRON)
CREATE OR REPLACE FUNCTION cleanup_old_webhook_events()
RETURNS void AS $$
BEGIN
  DELETE FROM stripe_webhook_events
  WHERE processed_at < NOW() - INTERVAL '30 days';
END;
$$ LANGUAGE plpgsql;

-- 9. Helper function to check read-only mode
CREATE OR REPLACE FUNCTION is_team_read_only(p_team_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  v_status subscription_status;
  v_trial_end TIMESTAMP WITH TIME ZONE;
  v_actual_lots INTEGER;
BEGIN
  SELECT status, trial_end, billable_properties
  INTO v_status, v_trial_end, v_actual_lots
  FROM subscriptions
  WHERE team_id = p_team_id
  LIMIT 1;

  -- No subscription = read only
  IF v_status IS NULL THEN
    RETURN TRUE;
  END IF;

  -- Explicit read_only status
  IF v_status = 'read_only' THEN
    RETURN TRUE;
  END IF;

  -- Canceled with > 2 lots
  IF v_status = 'canceled' AND v_actual_lots > 2 THEN
    RETURN TRUE;
  END IF;

  -- Expired trial with > 2 lots
  IF v_status = 'trialing' AND v_trial_end <= NOW() AND v_actual_lots > 2 THEN
    RETURN TRUE;
  END IF;

  -- Unpaid
  IF v_status = 'unpaid' THEN
    RETURN TRUE;
  END IF;

  RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 10. RLS Policies for Stripe tables
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Team managers can view their subscription"
ON subscriptions FOR SELECT
TO authenticated
USING (
  team_id IN (
    SELECT tm.team_id FROM team_members tm
    WHERE tm.user_id = auth.uid()
    AND tm.role IN ('owner', 'admin', 'gestionnaire')
  )
);
-- No INSERT/UPDATE/DELETE for authenticated — webhook handler uses admin/service_role client

ALTER TABLE stripe_customers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Team managers can view their stripe customer"
ON stripe_customers FOR SELECT
TO authenticated
USING (
  team_id IN (
    SELECT tm.team_id FROM team_members tm
    WHERE tm.user_id = auth.uid()
    AND tm.role IN ('owner', 'admin', 'gestionnaire')
  )
);

ALTER TABLE stripe_invoices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Team managers can view their invoices"
ON stripe_invoices FOR SELECT
TO authenticated
USING (
  subscription_id IN (
    SELECT s.id FROM subscriptions s
    JOIN team_members tm ON s.team_id = tm.team_id
    WHERE tm.user_id = auth.uid()
    AND tm.role IN ('owner', 'admin', 'gestionnaire')
  )
);

-- stripe_webhook_events: admin-only (no authenticated access)
ALTER TABLE stripe_webhook_events ENABLE ROW LEVEL SECURITY;

-- 11. Performance indexes for RLS queries
CREATE INDEX IF NOT EXISTS idx_subscriptions_team_id ON subscriptions(team_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_stripe_customers_team_id ON stripe_customers(team_id);
CREATE INDEX IF NOT EXISTS idx_stripe_invoices_subscription_id ON stripe_invoices(subscription_id);
```

**Run migration:**
```bash
npm run supabase:migrate
```

---

### Task 1.5: Regenerate Database Types

**Steps:**

```bash
npm run supabase:types
```

Expected: `lib/database.types.ts` updated with new columns and enum values

---

## Phase 2: Subscription Service Layer

### Task 2.1: Create Subscription Repository

**Files:**
- Create: `lib/services/repositories/subscription.repository.ts`

**Content:**

```typescript
import { Database } from '@/lib/database.types'
import { SupabaseClient } from '@supabase/supabase-js'

type SubscriptionRow = Database['public']['Tables']['subscriptions']['Row']
type SubscriptionInsert = Database['public']['Tables']['subscriptions']['Insert']
type SubscriptionUpdate = Database['public']['Tables']['subscriptions']['Update']

export class SubscriptionRepository {
  constructor(private supabase: SupabaseClient<Database>) {}

  async findByTeamId(teamId: string): Promise<SubscriptionRow | null> {
    const { data, error } = await this.supabase
      .from('subscriptions')
      .select('*')
      .eq('team_id', teamId)
      .limit(1)
      .maybeSingle()

    if (error) throw error
    return data
  }

  async findByStripeSubscriptionId(subscriptionId: string): Promise<SubscriptionRow | null> {
    const { data, error } = await this.supabase
      .from('subscriptions')
      .select('*')
      .eq('id', subscriptionId)
      .limit(1)
      .maybeSingle()

    if (error) throw error
    return data
  }

  async create(subscription: SubscriptionInsert): Promise<SubscriptionRow> {
    const { data, error } = await this.supabase
      .from('subscriptions')
      .insert(subscription)
      .select()
      .single()

    if (error) throw error
    return data
  }

  async update(subscriptionId: string, updates: SubscriptionUpdate): Promise<SubscriptionRow> {
    const { data, error } = await this.supabase
      .from('subscriptions')
      .update(updates)
      .eq('id', subscriptionId)
      .select()
      .single()

    if (error) throw error
    return data
  }

  async updateByTeamId(teamId: string, updates: SubscriptionUpdate): Promise<SubscriptionRow> {
    const { data, error } = await this.supabase
      .from('subscriptions')
      .update(updates)
      .eq('team_id', teamId)
      .select()
      .single()

    if (error) throw error
    return data
  }

  async upsertByTeamId(teamId: string, data: SubscriptionInsert): Promise<SubscriptionRow> {
    const { data: result, error } = await this.supabase
      .from('subscriptions')
      .upsert(data, { onConflict: 'team_id' })
      .select()
      .single()

    if (error) throw error
    return result
  }

  async getLotCount(teamId: string): Promise<number> {
    const { count, error } = await this.supabase
      .from('lots')
      .select('*', { count: 'exact', head: true })
      .eq('team_id', teamId)
      .is('deleted_at', null)

    if (error) throw error
    return count ?? 0
  }
}
```

**Note:** Uses `.limit(1).maybeSingle()` instead of `.single()` to avoid errors with multi-team users (see MEMORY.md).

---

### Task 2.2: Create Stripe Customer Repository

**Files:**
- Create: `lib/services/repositories/stripe-customer.repository.ts`

**Content:**

```typescript
import { Database } from '@/lib/database.types'
import { SupabaseClient } from '@supabase/supabase-js'

type StripeCustomerRow = Database['public']['Tables']['stripe_customers']['Row']
type StripeCustomerInsert = Database['public']['Tables']['stripe_customers']['Insert']

export class StripeCustomerRepository {
  constructor(private supabase: SupabaseClient<Database>) {}

  async findByTeamId(teamId: string): Promise<StripeCustomerRow | null> {
    const { data, error } = await this.supabase
      .from('stripe_customers')
      .select('*')
      .eq('team_id', teamId)
      .limit(1)
      .maybeSingle()

    if (error) throw error
    return data
  }

  async findByStripeCustomerId(stripeCustomerId: string): Promise<StripeCustomerRow | null> {
    const { data, error } = await this.supabase
      .from('stripe_customers')
      .select('*')
      .eq('stripe_customer_id', stripeCustomerId)
      .limit(1)
      .maybeSingle()

    if (error) throw error
    return data
  }

  async create(customer: StripeCustomerInsert): Promise<StripeCustomerRow> {
    const { data, error } = await this.supabase
      .from('stripe_customers')
      .insert(customer)
      .select()
      .single()

    if (error) throw error
    return data
  }
}
```

---

### Task 2.3: Create Subscription Service

**Files:**
- Create: `lib/services/domain/subscription.service.ts`

**Content:**

```typescript
import { stripe, STRIPE_PRICES, FREE_TIER_LIMIT, TRIAL_DAYS } from '@/lib/stripe'
import { SubscriptionRepository } from '../repositories/subscription.repository'
import { StripeCustomerRepository } from '../repositories/stripe-customer.repository'
import { SupabaseClient } from '@supabase/supabase-js'
import { Database } from '@/lib/database.types'
import Stripe from 'stripe'

export type SubscriptionStatus =
  | 'trialing'
  | 'active'
  | 'past_due'
  | 'canceled'
  | 'incomplete'
  | 'free_tier'
  | 'read_only'
  | 'unpaid'

export interface SubscriptionInfo {
  status: SubscriptionStatus
  subscribed_lots: number
  actual_lots: number
  trial_end: Date | null
  current_period_end: Date | null
  cancel_at_period_end: boolean
  can_add_property: boolean
  is_free_tier: boolean
  is_read_only: boolean
  has_stripe_subscription: boolean  // true if a real Stripe sub exists (not just trial)
  days_left_trial: number | null
}

export interface UpgradePreview {
  current_lots: number
  new_lots: number
  proration_amount: number  // cents, estimated
  recurring_change: number  // cents per period
  currency: string
  interval: 'month' | 'year'
}

export class SubscriptionService {
  private subscriptionRepo: SubscriptionRepository
  private stripeCustomerRepo: StripeCustomerRepository

  constructor(private supabase: SupabaseClient<Database>) {
    this.subscriptionRepo = new SubscriptionRepository(supabase)
    this.stripeCustomerRepo = new StripeCustomerRepository(supabase)
  }

  /**
   * Get full subscription info for a team
   */
  async getSubscriptionInfo(teamId: string): Promise<SubscriptionInfo | null> {
    const subscription = await this.subscriptionRepo.findByTeamId(teamId)
    if (!subscription) return null

    const lotCount = await this.subscriptionRepo.getLotCount(teamId)
    const status = subscription.status as SubscriptionStatus
    const trialEnd = subscription.trial_end ? new Date(subscription.trial_end) : null
    const isTrialExpired = trialEnd ? trialEnd <= new Date() : false
    const isFreeTier = status === 'free_tier'
    const hasStripeSub = subscription.id !== null && !subscription.id.startsWith('trial_')

    // Determine read-only mode
    const isReadOnly =
      status === 'read_only' ||
      status === 'unpaid' ||
      (status === 'canceled' && lotCount > FREE_TIER_LIMIT) ||
      (status === 'trialing' && isTrialExpired && lotCount > FREE_TIER_LIMIT)

    // Determine if can add property
    let canAdd = false
    if (status === 'trialing' && !isTrialExpired) {
      canAdd = true // Unlimited during active trial
    } else if (status === 'active' || status === 'past_due') {
      canAdd = lotCount < subscription.subscribed_lots
    } else if (isFreeTier) {
      canAdd = lotCount < FREE_TIER_LIMIT
    }

    // Calculate days left in trial
    let daysLeftTrial: number | null = null
    if (status === 'trialing' && trialEnd && !isTrialExpired) {
      daysLeftTrial = Math.max(0, Math.ceil((trialEnd.getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
    }

    return {
      status,
      subscribed_lots: subscription.subscribed_lots,
      actual_lots: lotCount,
      trial_end: trialEnd,
      current_period_end: subscription.current_period_end
        ? new Date(subscription.current_period_end)
        : null,
      cancel_at_period_end: subscription.cancel_at_period_end,
      can_add_property: canAdd,
      is_free_tier: isFreeTier,
      is_read_only: isReadOnly,
      has_stripe_subscription: hasStripeSub,
      days_left_trial: daysLeftTrial,
    }
  }

  /**
   * Check if team can add a property (with upgrade reason)
   */
  async canAddProperty(teamId: string): Promise<{ allowed: boolean; reason?: string; upgrade_needed?: boolean }> {
    const info = await this.getSubscriptionInfo(teamId)

    if (!info) {
      return { allowed: false, reason: 'No subscription found', upgrade_needed: true }
    }

    if (info.is_read_only) {
      return { allowed: false, reason: 'Account in read-only mode', upgrade_needed: true }
    }

    if (info.can_add_property) {
      return { allowed: true }
    }

    if (info.is_free_tier && info.actual_lots >= FREE_TIER_LIMIT) {
      return {
        allowed: false,
        reason: `Limite gratuite atteinte (${FREE_TIER_LIMIT} lots)`,
        upgrade_needed: true
      }
    }

    if (info.actual_lots >= info.subscribed_lots) {
      return {
        allowed: false,
        reason: `Limite d'abonnement atteinte (${info.subscribed_lots} lots)`,
        upgrade_needed: true
      }
    }

    return { allowed: false, reason: 'Abonnement inactif', upgrade_needed: true }
  }

  /**
   * Check if team has a saved payment method on Stripe
   */
  async hasPaymentMethod(teamId: string): Promise<boolean> {
    const stripeCustomer = await this.stripeCustomerRepo.findByTeamId(teamId)
    if (!stripeCustomer) return false

    const paymentMethods = await stripe.paymentMethods.list({
      customer: stripeCustomer.stripe_customer_id,
      type: 'card',
      limit: 1,
    })

    return paymentMethods.data.length > 0
  }

  /**
   * Get or create Stripe customer for team
   */
  async getOrCreateStripeCustomer(teamId: string, email: string, name?: string): Promise<string> {
    const existing = await this.stripeCustomerRepo.findByTeamId(teamId)
    if (existing) return existing.stripe_customer_id

    const customer = await stripe.customers.create({
      email,
      name,
      metadata: { team_id: teamId },
    })

    await this.stripeCustomerRepo.create({
      team_id: teamId,
      stripe_customer_id: customer.id,
    })

    return customer.id
  }

  /**
   * Create Checkout Session for NEW subscription (first time or reactivation)
   * Always pre-selects annual pricing.
   */
  async createCheckoutSession(
    teamId: string,
    customerId: string,
    priceId: string,
    quantity: number,
    successUrl: string,
    cancelUrl: string
  ): Promise<Stripe.Checkout.Session> {
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: 'subscription',
      line_items: [{ price: priceId, quantity }],
      subscription_data: {
        metadata: { team_id: teamId },
      },
      success_url: successUrl,
      cancel_url: cancelUrl,
      allow_promotion_codes: true,
    })

    return session
  }

  /**
   * Upgrade subscription quantity via direct API (for users with saved CB).
   * Uses stripe.subscriptions.update() — NO Checkout redirect.
   * Returns the prorated invoice amount.
   */
  async upgradeSubscriptionDirect(
    teamId: string,
    additionalLots: number
  ): Promise<{ success: boolean; invoice_amount?: number }> {
    const subscription = await this.subscriptionRepo.findByTeamId(teamId)
    if (!subscription || !subscription.id) {
      throw new Error('No active Stripe subscription found')
    }

    // Retrieve Stripe subscription to get item ID
    const stripeSub = await stripe.subscriptions.retrieve(subscription.id)
    const currentItem = stripeSub.items.data[0]
    const newQuantity = (subscription.subscribed_lots || 0) + additionalLots

    // Update subscription with immediate proration
    const updatedSub = await stripe.subscriptions.update(subscription.id, {
      items: [{
        id: currentItem.id,
        quantity: newQuantity,
      }],
      proration_behavior: 'always_invoice',
    })

    // Get the latest invoice to know the prorated amount
    const latestInvoice = updatedSub.latest_invoice
    let invoiceAmount = 0
    if (typeof latestInvoice === 'string') {
      const invoice = await stripe.invoices.retrieve(latestInvoice)
      invoiceAmount = invoice.amount_due
    }

    return { success: true, invoice_amount: invoiceAmount }
  }

  /**
   * Preview upgrade pricing (for showing in modal before confirming)
   */
  async previewUpgrade(teamId: string, additionalLots: number): Promise<UpgradePreview> {
    const subscription = await this.subscriptionRepo.findByTeamId(teamId)
    if (!subscription) {
      throw new Error('No subscription found')
    }

    const currentLots = subscription.subscribed_lots || 0
    const newLots = currentLots + additionalLots

    // Determine interval from current price
    const isAnnual = subscription.price_id === STRIPE_PRICES.annual
    const interval: 'month' | 'year' = isAnnual ? 'year' : 'month'
    const pricePerLot = isAnnual ? 5000 : 500  // cents

    // For accurate proration, use Stripe's upcoming invoice preview
    let prorationAmount = 0
    if (subscription.id && !subscription.id.startsWith('trial_')) {
      try {
        const stripeSub = await stripe.subscriptions.retrieve(subscription.id)
        const currentItem = stripeSub.items.data[0]

        const preview = await stripe.invoices.createPreview({
          customer: subscription.stripe_customer_id!,
          subscription: subscription.id,
          subscription_items: [{
            id: currentItem.id,
            quantity: newLots,
          }],
          subscription_proration_date: Math.floor(Date.now() / 1000),
        })

        prorationAmount = preview.amount_due
      } catch {
        // Fallback: rough estimate
        prorationAmount = Math.round((additionalLots * pricePerLot) / 2)
      }
    }

    return {
      current_lots: currentLots,
      new_lots: newLots,
      proration_amount: prorationAmount,
      recurring_change: additionalLots * pricePerLot,
      currency: 'eur',
      interval,
      // TRANSPARENCY: When displaying to user, always show disclaimer:
      // "Montant estimé. Le montant exact sera calculé au moment du paiement
      //  et peut varier selon la date de facturation."
      // This avoids user complaints if proration differs slightly from preview.
      is_estimate: !subscription.id || subscription.id.startsWith('trial_'),
    }
  }

  /**
   * Create Customer Portal session
   */
  async createPortalSession(teamId: string, returnUrl: string): Promise<Stripe.BillingPortal.Session> {
    const stripeCustomer = await this.stripeCustomerRepo.findByTeamId(teamId)
    if (!stripeCustomer) {
      throw new Error('No Stripe customer found')
    }

    const session = await stripe.billingPortal.sessions.create({
      customer: stripeCustomer.stripe_customer_id,
      return_url: returnUrl,
    })

    return session
  }

  /**
   * Initialize trial for new team (called after signup).
   * No Stripe subscription is created — trial is app-managed.
   */
  async initializeTrialSubscription(teamId: string, stripeCustomerId: string): Promise<void> {
    const trialEnd = new Date()
    trialEnd.setDate(trialEnd.getDate() + TRIAL_DAYS)

    const lotCount = await this.subscriptionRepo.getLotCount(teamId)

    await this.subscriptionRepo.create({
      id: null,  // No Stripe subscription during trial
      team_id: teamId,
      stripe_customer_id: stripeCustomerId,
      status: lotCount <= FREE_TIER_LIMIT ? 'free_tier' : 'trialing',
      trial_start: new Date().toISOString(),
      trial_end: trialEnd.toISOString(),
      subscribed_lots: 0,
      billable_properties: lotCount,
    })
  }

  /**
   * Check if team is in read-only mode
   */
  async isReadOnlyMode(teamId: string): Promise<boolean> {
    const info = await this.getSubscriptionInfo(teamId)
    return info?.is_read_only ?? true
  }
}
```

---

### Task 2.4: Export Subscription Service

**Files:**
- Modify: `lib/services/index.ts`

**Add export:**

```typescript
export { SubscriptionService } from './domain/subscription.service'
export { SubscriptionRepository } from './repositories/subscription.repository'
export { StripeCustomerRepository } from './repositories/stripe-customer.repository'
```

---

## Phase 3: Webhook Handler

### Task 3.1: Create Webhook API Route

**Files:**
- Create: `app/api/stripe/webhook/route.ts`

**Content:**

```typescript
import { headers } from 'next/headers'
import { NextResponse } from 'next/server'
import { stripe } from '@/lib/stripe'
import { createAdminSupabaseClient } from '@/lib/services/supabase/admin'
import Stripe from 'stripe'

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!

export async function POST(req: Request) {
  const body = await req.text()
  const headersList = await headers()
  const signature = headersList.get('stripe-signature')

  if (!signature) {
    return NextResponse.json({ error: 'No signature' }, { status: 400 })
  }

  let event: Stripe.Event

  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret)
  } catch (err) {
    console.error('Webhook signature verification failed:', err)
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  const supabase = createAdminSupabaseClient()

  // --- Idempotency check ---
  const { data: existingEvent } = await supabase
    .from('stripe_webhook_events')
    .select('event_id')
    .eq('event_id', event.id)
    .limit(1)
    .maybeSingle()

  if (existingEvent) {
    console.log(`Duplicate webhook event: ${event.id}`)
    return NextResponse.json({ received: true, duplicate: true })
  }

  // Record event BEFORE processing (prevents race conditions on retries)
  await supabase.from('stripe_webhook_events').insert({
    event_id: event.id,
    event_type: event.type,
    team_id: (event.data.object as any).metadata?.team_id || null,
  })

  // --- Handle events ---
  // IMPORTANT: Keep handlers fast (< 20s). No email sending here.
  // SCALING NOTE: If webhook volume grows (>100/min), consider moving to
  // an async queue (Inngest, QStash, or Vercel Edge Functions) to avoid
  // Vercel's 10s default / 60s max timeout on serverless functions.
  // See: https://www.inngest.com/docs/guides/stripe-webhooks
  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session
        await handleCheckoutCompleted(supabase, session)
        break
      }

      case 'customer.subscription.created':
      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription
        await handleSubscriptionUpsert(supabase, subscription)
        break
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription
        await handleSubscriptionDeleted(supabase, subscription)
        break
      }

      case 'invoice.paid': {
        const invoice = event.data.object as Stripe.Invoice
        await handleInvoicePaid(supabase, invoice)
        break
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice
        await handlePaymentFailed(supabase, invoice)
        break
      }

      default:
        console.log(`Unhandled event type: ${event.type}`)
    }

    return NextResponse.json({ received: true })
  } catch (error) {
    console.error('Webhook handler error:', error)
    // Return 500 so Stripe retries
    return NextResponse.json({ error: 'Webhook handler failed' }, { status: 500 })
  }
}

async function handleCheckoutCompleted(supabase: any, session: Stripe.Checkout.Session) {
  const teamId = session.metadata?.team_id || session.subscription_data?.metadata?.team_id
  if (!teamId) {
    // Try to get team_id from subscription metadata
    if (session.subscription) {
      const sub = await stripe.subscriptions.retrieve(session.subscription as string)
      if (sub.metadata.team_id) {
        // Subscription handler will take care of the rest
        console.log(`Checkout completed, subscription ${sub.id} will be handled by subscription.created`)
        return
      }
    }
    console.error('No team_id in checkout session metadata')
    return
  }

  console.log(`Checkout completed for team ${teamId}, subscription: ${session.subscription}`)
  // The subscription.created/updated webhook handles the actual DB update
}

async function handleSubscriptionUpsert(supabase: any, subscription: Stripe.Subscription) {
  const teamId = subscription.metadata.team_id
  if (!teamId) {
    console.error('No team_id in subscription metadata')
    return
  }

  const item = subscription.items.data[0]
  const quantity = item.quantity || 1

  // Determine the correct status
  let dbStatus = subscription.status
  // If subscription becomes active and team was in free_tier/trialing/read_only,
  // update to 'active'
  if (subscription.status === 'active') {
    dbStatus = 'active'
  }

  const updateData = {
    id: subscription.id,
    team_id: teamId,
    stripe_customer_id: subscription.customer as string,
    price_id: item.price.id,
    status: dbStatus,
    current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
    current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
    trial_start: subscription.trial_start
      ? new Date(subscription.trial_start * 1000).toISOString()
      : null,
    trial_end: subscription.trial_end
      ? new Date(subscription.trial_end * 1000).toISOString()
      : null,
    cancel_at_period_end: subscription.cancel_at_period_end,
    cancel_at: subscription.cancel_at
      ? new Date(subscription.cancel_at * 1000).toISOString()
      : null,
    canceled_at: subscription.canceled_at
      ? new Date(subscription.canceled_at * 1000).toISOString()
      : null,
    subscribed_lots: quantity,
    updated_at: new Date().toISOString(),
  }

  // Upsert: handles both subscription.created (first time) and subscription.updated
  // Uses team_id as conflict key since trial records have id=NULL
  const { error } = await supabase
    .from('subscriptions')
    .upsert(updateData, { onConflict: 'team_id' })

  if (error) {
    console.error('Error upserting subscription:', error)
    throw error
  }

  console.log(`Subscription ${subscription.id} upserted for team ${teamId} (status: ${dbStatus}, lots: ${quantity})`)
}

async function handleSubscriptionDeleted(supabase: any, subscription: Stripe.Subscription) {
  const teamId = subscription.metadata.team_id

  // Get current lot count to determine if free_tier or read_only
  let newStatus = 'canceled'
  if (teamId) {
    const { count } = await supabase
      .from('lots')
      .select('*', { count: 'exact', head: true })
      .eq('team_id', teamId)
      .is('deleted_at', null)

    if ((count ?? 0) <= 2) {
      newStatus = 'free_tier'  // Return to free tier
    } else {
      newStatus = 'read_only'  // Read-only until reactivation
    }
  }

  const { error } = await supabase
    .from('subscriptions')
    .update({
      status: newStatus,
      ended_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', subscription.id)

  if (error) {
    console.error('Error updating subscription on deletion:', error)
    throw error
  }

  console.log(`Subscription ${subscription.id} deleted → status: ${newStatus}`)
}

async function handleInvoicePaid(supabase: any, invoice: Stripe.Invoice) {
  const { error } = await supabase
    .from('stripe_invoices')
    .upsert({
      id: invoice.id,
      subscription_id: invoice.subscription as string,
      stripe_customer_id: invoice.customer as string,
      amount_due: invoice.amount_due,
      amount_paid: invoice.amount_paid,
      amount_remaining: invoice.amount_remaining,
      currency: invoice.currency,
      status: invoice.status,
      hosted_invoice_url: invoice.hosted_invoice_url,
      invoice_pdf: invoice.invoice_pdf,
      period_start: invoice.period_start
        ? new Date(invoice.period_start * 1000).toISOString()
        : null,
      period_end: invoice.period_end
        ? new Date(invoice.period_end * 1000).toISOString()
        : null,
      paid_at: new Date().toISOString(),
    })

  if (error) {
    console.error('Error storing invoice:', error)
  }

  console.log(`Invoice ${invoice.id} paid`)
}

async function handlePaymentFailed(supabase: any, invoice: Stripe.Invoice) {
  // Update subscription status to past_due
  // Dunning emails are handled by Stripe's Smart Retries (Dashboard config)
  if (invoice.subscription) {
    const { error } = await supabase
      .from('subscriptions')
      .update({
        status: 'past_due',
        updated_at: new Date().toISOString(),
      })
      .eq('id', invoice.subscription)

    if (error) {
      console.error('Error updating subscription to past_due:', error)
    }
  }

  console.log(`Payment failed for invoice ${invoice.id}`)
}
```

---

## Phase 4: Server Actions

### Task 4.1: Create Subscription Server Actions

**Files:**
- Create: `app/actions/subscription-actions.ts`

**Content:**

```typescript
'use server'

import { createServerSupabaseClient } from '@/lib/services/supabase/server'
import { SubscriptionService } from '@/lib/services'
import { STRIPE_PRICES, FREE_TIER_LIMIT } from '@/lib/stripe'

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

/**
 * Helper to get current user's team ID
 */
async function getTeamContext() {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const { data: teamMember } = await supabase
    .from('team_members')
    .select('team_id, teams(name)')
    .eq('user_id', user.id)
    .limit(1)
    .maybeSingle()

  if (!teamMember) throw new Error('No team found')

  return { supabase, user, teamMember }
}

export async function getSubscriptionStatus() {
  const { supabase, teamMember } = await getTeamContext()
  const service = new SubscriptionService(supabase)
  return service.getSubscriptionInfo(teamMember.team_id)
}

export async function checkCanAddProperty() {
  const { supabase, teamMember } = await getTeamContext()
  const service = new SubscriptionService(supabase)
  return service.canAddProperty(teamMember.team_id)
}

export async function checkHasPaymentMethod() {
  const { supabase, teamMember } = await getTeamContext()
  const service = new SubscriptionService(supabase)
  return service.hasPaymentMethod(teamMember.team_id)
}

export async function isReadOnlyMode() {
  const { supabase, teamMember } = await getTeamContext()
  const service = new SubscriptionService(supabase)
  return service.isReadOnlyMode(teamMember.team_id)
}

/**
 * Create Checkout Session for new subscription.
 * Default: annual pricing. Pass 'monthly' only if user explicitly chooses it.
 */
export async function createCheckoutSessionAction(interval: 'annual' | 'monthly' = 'annual') {
  const { supabase, user, teamMember } = await getTeamContext()
  const service = new SubscriptionService(supabase)

  // Get or create Stripe customer
  const customerId = await service.getOrCreateStripeCustomer(
    teamMember.team_id,
    user.email!,
    (teamMember.teams as any)?.name
  )

  // Get current lot count for initial quantity
  const { count } = await supabase
    .from('lots')
    .select('*', { count: 'exact', head: true })
    .eq('team_id', teamMember.team_id)
    .is('deleted_at', null)

  // Minimum quantity is FREE_TIER_LIMIT + 1 (3 lots, since 1-2 is free)
  const quantity = Math.max(count ?? 0, FREE_TIER_LIMIT + 1)

  const priceId = interval === 'annual'
    ? STRIPE_PRICES.annual
    : STRIPE_PRICES.monthly

  const session = await service.createCheckoutSession(
    teamMember.team_id,
    customerId,
    priceId,
    quantity,
    `${APP_URL}/gestionnaire/parametres?checkout=success`,
    `${APP_URL}/gestionnaire/parametres?checkout=canceled`
  )

  return { url: session.url }
}

/**
 * Upgrade subscription directly via API (for users with saved CB).
 * No Checkout redirect — instant upgrade with prorated charge.
 */
export async function upgradeSubscriptionDirect(additionalLots: number = 1) {
  const { supabase, teamMember } = await getTeamContext()
  const service = new SubscriptionService(supabase)
  return service.upgradeSubscriptionDirect(teamMember.team_id, additionalLots)
}

/**
 * Get upgrade preview (pricing) for showing in modal.
 */
export async function getUpgradePreview(additionalLots: number) {
  const { supabase, teamMember } = await getTeamContext()
  const service = new SubscriptionService(supabase)
  return service.previewUpgrade(teamMember.team_id, additionalLots)
}

/**
 * Verify a completed Checkout Session server-side.
 * Call this from the success page to confirm payment was received.
 * Prevents users from manually navigating to ?checkout=success.
 */
export async function verifyCheckoutSession(sessionId: string) {
  const { stripe } = await import('@/lib/stripe')

  try {
    const session = await stripe.checkout.sessions.retrieve(sessionId)
    return {
      verified: session.payment_status === 'paid',
      subscriptionId: session.subscription as string | null,
      customerId: session.customer as string | null,
    }
  } catch {
    return { verified: false, subscriptionId: null, customerId: null }
  }
}

/**
 * Create Customer Portal session (manage subscription, payment, cancel).
 */
export async function createPortalSessionAction() {
  const { supabase, teamMember } = await getTeamContext()
  const service = new SubscriptionService(supabase)

  const session = await service.createPortalSession(
    teamMember.team_id,
    `${APP_URL}/gestionnaire/parametres`
  )

  return { url: session.url }
}
```

---

## Phase 5: UI Components

### Task 5.1: Create Trial Banner Component

**Files:**
- Create: `components/billing/trial-banner.tsx`

See design doc section 7/15 for full component spec. Key behaviors:
- Shows during last 7 days of trial
- Progress bar with urgency color shift (blue → orange → red)
- CTA always points to **annual** Checkout
- Dismissible for 24 hours (localStorage)
- Loss aversion message on critical days (shows lot count, intervention count)
- Social proof counter on desktop

---

### Task 5.2: Create Read-Only Banner Component

**Files:**
- Create: `components/billing/read-only-banner.tsx`

**Behavior:**
- Permanent, non-dismissible banner for expired trial (> 2 lots) or canceled
- Message: "Votre compte est en lecture seule. Souscrivez pour retrouver l'accès complet."
- CTA: "Choisir l'abonnement annuel →" (primary) + "ou payer mensuellement" (link)

---

### Task 5.3: Create Upgrade Modal Component

**Files:**
- Create: `components/billing/upgrade-modal.tsx`

See design doc section 7.3 for two modes:
- **Mode A (CB saved):** Inline confirmation, 1-click `upgradeSubscriptionDirect()`
- **Mode B (no CB):** Redirect to Checkout (annual pre-selected)

---

### Task 5.4: Create Pricing Card Component

**Files:**
- Create: `components/billing/pricing-card.tsx`

See design doc section 7.2 for annual-aggressive layout:
- Annual: highlighted, recommended badge, savings badge, primary CTA
- Monthly: small muted link "ou payer mensuellement (5€/lot/mois)"

---

### Task 5.5: Update Subscription Management Section

**Files:**
- Modify: `components/subscription-management-section.tsx`

**Key changes from original:**
- Annual button is **primary**, monthly is secondary link
- Show read-only status and reactivation CTA if applicable
- Show "Manage subscription (Stripe)" button for active subscribers
- ValueCalculator component shown for active/trial users

---

### Task 5.6: Create Value Calculator Component

**Files:**
- Create: `components/billing/value-calculator.tsx`

Shows: hours saved, money saved, interventions completed (loss aversion for trial users).

---

### Task 5.7: Create Contextual Upgrade Prompt

**Files:**
- Create: `components/billing/upgrade-prompt.tsx`

Contextual prompts: `add_lot`, `add_intervention`, `export_data`, `ai_feature`
Each has different icon, message, and CTA. All point to annual by default.

---

## Phase 6: Integration & Hooks

### Task 6.1: Add Banners to Layout

**Files:**
- Modify: `app/(app)/layout.tsx` (or equivalent gestionnaire layout)

Add:
```tsx
import { TrialBanner } from '@/components/billing/trial-banner'
import { ReadOnlyBanner } from '@/components/billing/read-only-banner'

// Before main content:
<TrialBanner />
<ReadOnlyBanner />
```

---

### Task 6.2: Create useSubscription Hook

**Files:**
- Create: `hooks/use-subscription.ts`

```typescript
'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  getSubscriptionStatus,
  checkCanAddProperty,
  checkHasPaymentMethod,
} from '@/app/actions/subscription-actions'

export function useSubscription() {
  const [status, setStatus] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(async () => {
    setLoading(true)
    try {
      const data = await getSubscriptionStatus()
      setStatus(data)
    } catch (err) {
      console.error('Error fetching subscription:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { refresh() }, [refresh])

  const canAddProperty = useCallback(async () => {
    try { return await checkCanAddProperty() }
    catch { return { allowed: false, reason: 'Error', upgrade_needed: true } }
  }, [])

  const hasPaymentMethod = useCallback(async () => {
    try { return await checkHasPaymentMethod() }
    catch { return false }
  }, [])

  return { status, loading, refresh, canAddProperty, hasPaymentMethod }
}
```

---

### Task 6.3: Integrate Limit Check in Property Forms

**Files to modify:**
- Lot creation form
- Building creation form (if creates lots)

**Pattern:**
```typescript
const { canAddProperty, hasPaymentMethod, status } = useSubscription()
const [showUpgradeModal, setShowUpgradeModal] = useState(false)

const handleSubmit = async () => {
  const { allowed, upgrade_needed } = await canAddProperty()
  if (!allowed && upgrade_needed) {
    setShowUpgradeModal(true)
    return
  }
  // Continue with form submission...
}

// In JSX:
<UpgradeModal
  open={showUpgradeModal}
  onOpenChange={setShowUpgradeModal}
  currentLots={status?.actual_lots || 0}
  subscribedLots={status?.subscribed_lots || 0}
/>
```

---

### Task 6.4: Integrate Read-Only Enforcement

**Pattern for blocking actions in read-only mode:**
```typescript
const { status } = useSubscription()

// Disable create buttons when read-only
<Button disabled={status?.is_read_only}>
  Nouvelle intervention
</Button>

// Or show upgrade prompt inline
{status?.is_read_only && <UpgradePrompt context="add_intervention" />}
```

---

## Phase 7: Trial Management (CRON Jobs)

### Task 7.1: CRON — Trial Notification Emails

**Files:**
- Create: `app/api/cron/trial-notifications/route.ts`

**Schedule:** Daily at 9:00 AM (Vercel CRON)
**Logic:**
1. Find trials ending in 7 days → send J-7 email
2. Find trials ending in 3 days → send J-3 email
3. Find trials ending in 1 day → send J-1 email

**Auth:** Bearer token via `CRON_SECRET` environment variable.

---

### Task 7.2: CRON — Trial Expiration

**Files:**
- Create: `app/api/cron/trial-expiration/route.ts`

**Schedule:** Daily at 0:00 AM (Vercel CRON)
**Logic:**
1. Find subscriptions where `status = 'trialing'` AND `trial_end < now()`
2. For each:
   - If lot_count ≤ 2 → set `status = 'free_tier'`
   - If lot_count > 2 → set `status = 'read_only'`
3. Send trial expired email

---

### Task 7.3: CRON — Webhook Event Cleanup

**Files:**
- Create: `app/api/cron/cleanup-webhook-events/route.ts`

**Schedule:** Weekly
**Logic:** Delete `stripe_webhook_events` older than 30 days.

---

### Task 7.4: CRON — Behavioral Conversion Triggers

**Files:**
- Create: `app/api/cron/behavioral-triggers/route.ts`

**Schedule:** Daily at 10:00 AM (Vercel CRON)
**Logic:**
1. Find trial users who have completed key actions but haven't subscribed:
   - Created ≥ 3 lots (high engagement)
   - Completed ≥ 1 intervention (experienced value)
   - Added ≥ 1 team member (invested in collaboration)
2. Send targeted conversion email with usage stats and personalized CTA
3. Track which triggers have fired per team (avoid spam — max 1 behavioral email per 7 days)

**Why behavioral triggers?** Research shows usage-based prompts convert 38% better than calendar-based reminders alone. These complement the J-7/J-3/J-1 calendar emails.

See design doc section 15.11 for full trigger logic.

---

### Task 7.5: Vercel CRON Configuration

**Files:**
- Modify: `vercel.json`

```json
{
  "crons": [
    { "path": "/api/cron/trial-notifications", "schedule": "0 9 * * *" },
    { "path": "/api/cron/trial-expiration", "schedule": "0 0 * * *" },
    { "path": "/api/cron/behavioral-triggers", "schedule": "0 10 * * *" },
    { "path": "/api/cron/cleanup-webhook-events", "schedule": "0 3 * * 0" }
  ]
}
```

---

## Phase 8: Email Templates

### Task 8.1: Create Email Templates (React Email + Resend)

**Files to create:**
- `lib/email/templates/welcome.tsx`
- `lib/email/templates/trial-ending.tsx` (parametric: 7/3/1 days)
- `lib/email/templates/trial-expired.tsx`
- `lib/email/templates/win-back.tsx`
- `lib/email/templates/payment-failed.tsx`
- `lib/email/templates/subscription-activated.tsx`

### Task 8.2: Create Subscription Email Service

**Files:**
- Create: `lib/services/domain/subscription-email.service.ts`

Sends emails via Resend. Each method takes typed props and renders React Email template.

**Key: Annual CTA in every email.** Every email that mentions pricing defaults to annual with the savings highlighted.

---

## Phase 9: Advanced UX

### Task 9.1: Enhanced Trial Banner with Progress + Social Proof

See design doc section 15.1 and 15.4.

### Task 9.2: Value Calculator (Loss Aversion)

See design doc section 15.3.

### Task 9.3: Onboarding Checklist with Gamification

See design doc section 15.7.

### Task 9.4: Strategic In-App Notifications

See design doc section 15.9 and 15.10.

---

## Phase 10: Admin Tools & Reactivation

### Task 10.1: Trial Extension (Admin)

**Method:** Direct DB update or Supabase admin API.

```sql
UPDATE subscriptions
SET trial_end = trial_end + INTERVAL '15 days',
    status = 'trialing'
WHERE team_id = :team_id;
```

### Task 10.2: Reactivation Flow

For users in `read_only` or `canceled` status:
1. Show permanent banner with "Réactiver mon abonnement"
2. Click → `createCheckoutSessionAction('annual')` (annual pre-selected)
3. Checkout → new Stripe subscription → webhook updates DB → access restored

### Task 10.3: Manual Subscription Management

Admin can adjust subscriptions via Stripe Dashboard directly. Webhooks sync changes to DB automatically.

---

## Phase 11: Testing & Deployment

### Task 11.1: Configure Stripe Webhook in Dashboard

**Manual Steps:**
1. Stripe Dashboard → Developers → Webhooks
2. Add endpoint: `https://your-domain.com/api/stripe/webhook`
3. Select events:
   - `checkout.session.completed`
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.paid`
   - `invoice.payment_failed`
   - `charge.refunded`
4. Copy webhook secret to `STRIPE_WEBHOOK_SECRET`

### Task 11.2: Configure Stripe Dashboard Settings

1. **Products:** Create "SEIDO Subscription" with annual (50€/unit/year) and monthly (5€/unit/month) prices
2. **Smart Retries:** Enable in Revenue Recovery
3. **Dunning emails:** Enable Stripe's built-in failed payment emails
4. **Customer Portal:** Allow update payment, cancel, change plan/quantity
5. **Stripe Tax:** Belgium 21% VAT, exclusive, automatic
6. **Coupons:** Create EARLY2026, REFERRAL, ANNUAL20

### Task 11.3: Test with Stripe CLI

```bash
# Forward webhooks to local dev server
stripe listen --forward-to localhost:3000/api/stripe/webhook

# Trigger test events
stripe trigger checkout.session.completed
stripe trigger customer.subscription.updated
stripe trigger invoice.payment_failed
```

### Task 11.4: End-to-End Test Checklist

| Test Case | Expected Result |
|-----------|-----------------|
| New signup | Stripe Customer created, trial started (app-side), no Stripe sub |
| Trial day 23 (J-7) | CRON sends email, banner appears in app |
| Trial day 27 (J-3) | CRON sends email |
| Trial day 29 (J-1) | CRON sends email, critical banner |
| Trial expired (> 2 lots) | CRON sets read_only, permanent banner |
| Trial expired (≤ 2 lots) | CRON sets free_tier, no banner |
| Click "Subscribe" (annual) | Redirect to Checkout, annual pre-selected |
| Complete Checkout | Subscription active, lots accessible |
| Add lot over limit (CB saved) | Inline confirm → direct API upgrade → prorated invoice |
| Add lot over limit (no CB) | Upgrade modal → Checkout redirect |
| Free tier → Add 3rd lot | Upgrade modal → Checkout (quantity=3, annual) |
| Portal access | Opens Stripe Customer Portal |
| Cancel via Portal | cancel_at_period_end, then read_only or free_tier at period end |
| Payment failed | past_due status, Stripe Smart Retries active |
| Reactivation | Checkout → new subscription → access restored |
| Webhook duplicate | Idempotency check, no duplicate processing |

---

## Summary

**Total Phases:** 11
**Total Tasks:** ~42
**API Version:** `2025-09-30.clover` (flexible billing default)
**Key Dependencies:**
- Stripe Dashboard configuration (products, prices, webhooks, Smart Retries)
- Environment variables setup
- Database migration applied (including RLS policies for all Stripe tables)
- Resend API key for emails
- Vercel CRON configuration (4 jobs: trial notifications, expiration, behavioral triggers, cleanup)

**Critical Path:**
1. Phase 1 (Foundation) — Must complete first
2. Phase 3 (Webhooks) — Required for subscription sync
3. Phase 4 (Server Actions) — Core business logic + post-Checkout verification
4. Phase 5 (UI Components) — User-facing features
5. Phase 6 (Integration) — Wire everything together
6. Phase 7 (CRON) — Trial management + behavioral conversion triggers
7. Phase 8 (Emails) — Trial conversion optimization + behavioral emails

**Annual-First Strategy Summary:**
- All CTAs default to annual pricing
- Monthly accessible only via "ou payer mensuellement" small link
- Trial Banner CTA → annual Checkout
- Upgrade Modal → annual pre-selected
- Email CTAs → annual Checkout link
- Win-back email → 20% off annual specifically

**Security & Reliability:**
- RLS policies on all Stripe tables (SELECT for team managers, writes via admin client only)
- Post-Checkout server-side verification (`verifyCheckoutSession`) prevents URL spoofing
- Webhook idempotency via `stripe_webhook_events` table
- Upgrade preview includes estimate disclaimer for transparency
- Webhook scaling note: consider Inngest/QStash if volume exceeds 100/min

**Behavioral Conversion Triggers:**
- Usage-based prompts (3+ lots, 1+ intervention, 1+ team member) complement calendar-based emails
- Max 1 behavioral email per 7 days per team to avoid spam
- Research-backed: 38% higher conversion vs calendar-only approach
