# Stripe Subscription Integration - Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Implement Stripe subscription billing for SEIDO with per-lot pricing, 30-day trial, and smooth upgrade UX.

**Design Reference:** `docs/plans/2026-01-30-stripe-subscription-design.md`

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
```

2. Add placeholders to `.env.example`:
```env
# Stripe Configuration
STRIPE_SECRET_KEY=sk_test_xxx
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_xxx
STRIPE_WEBHOOK_SECRET=whsec_xxx
STRIPE_PRICE_MONTHLY=price_xxx
STRIPE_PRICE_ANNUAL=price_xxx
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
  apiVersion: '2024-12-18.acacia', // Use latest stable API version
  typescript: true,
})

// Price IDs from environment
export const STRIPE_PRICES = {
  monthly: process.env.STRIPE_PRICE_MONTHLY!,
  annual: process.env.STRIPE_PRICE_ANNUAL!,
} as const

// Free tier threshold
export const FREE_TIER_LIMIT = 2

// Trial period in days
export const TRIAL_DAYS = 30

// Calculate price based on lot count and billing interval
export function calculatePrice(lotCount: number, interval: 'month' | 'year'): number {
  if (lotCount <= FREE_TIER_LIMIT) return 0
  const pricePerLot = interval === 'month' ? 500 : 5000 // in cents
  return lotCount * pricePerLot
}
```

---

### Task 1.4: Database Migration - Update Subscription Schema

**Files:**
- Create: `supabase/migrations/20260130200000_update_subscription_schema_for_stripe.sql`

**Content:**

```sql
-- ============================================================================
-- Migration: Update subscription schema for Stripe integration
-- Date: 2026-01-30
-- ============================================================================

-- 1. Add 'free_tier' to subscription_status enum if not exists
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

  RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
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

Expected: `lib/database.types.ts` updated with new columns

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
      .single()

    if (error && error.code !== 'PGRST116') throw error
    return data
  }

  async findByStripeSubscriptionId(subscriptionId: string): Promise<SubscriptionRow | null> {
    const { data, error } = await this.supabase
      .from('subscriptions')
      .select('*')
      .eq('id', subscriptionId)
      .single()

    if (error && error.code !== 'PGRST116') throw error
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
      .single()

    if (error && error.code !== 'PGRST116') throw error
    return data
  }

  async findByStripeCustomerId(stripeCustomerId: string): Promise<StripeCustomerRow | null> {
    const { data, error } = await this.supabase
      .from('stripe_customers')
      .select('*')
      .eq('stripe_customer_id', stripeCustomerId)
      .single()

    if (error && error.code !== 'PGRST116') throw error
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
import { stripe, STRIPE_PRICES, FREE_TIER_LIMIT, TRIAL_DAYS, calculatePrice } from '@/lib/stripe'
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

export interface SubscriptionInfo {
  status: SubscriptionStatus
  subscribed_lots: number
  actual_lots: number
  trial_end: Date | null
  current_period_end: Date | null
  cancel_at_period_end: boolean
  can_add_property: boolean
  is_free_tier: boolean
}

export interface UpgradePreview {
  current_lots: number
  new_lots: number
  proration_amount: number
  monthly_change: number
  currency: string
}

export class SubscriptionService {
  private subscriptionRepo: SubscriptionRepository
  private stripeCustomerRepo: StripeCustomerRepository

  constructor(private supabase: SupabaseClient<Database>) {
    this.subscriptionRepo = new SubscriptionRepository(supabase)
    this.stripeCustomerRepo = new StripeCustomerRepository(supabase)
  }

  /**
   * Get subscription status for a team
   */
  async getSubscriptionInfo(teamId: string): Promise<SubscriptionInfo | null> {
    const subscription = await this.subscriptionRepo.findByTeamId(teamId)
    if (!subscription) return null

    const lotCount = await this.subscriptionRepo.getLotCount(teamId)
    const isFreeTier = lotCount <= FREE_TIER_LIMIT && subscription.status === 'free_tier'

    const canAdd =
      subscription.status === 'trialing' && new Date(subscription.trial_end!) > new Date()
        ? true
        : subscription.status === 'active' || subscription.status === 'past_due'
          ? lotCount < subscription.subscribed_lots
          : isFreeTier
            ? lotCount < FREE_TIER_LIMIT
            : false

    return {
      status: subscription.status as SubscriptionStatus,
      subscribed_lots: subscription.subscribed_lots,
      actual_lots: lotCount,
      trial_end: subscription.trial_end ? new Date(subscription.trial_end) : null,
      current_period_end: subscription.current_period_end
        ? new Date(subscription.current_period_end)
        : null,
      cancel_at_period_end: subscription.cancel_at_period_end,
      can_add_property: canAdd,
      is_free_tier: isFreeTier,
    }
  }

  /**
   * Check if team can add a property
   */
  async canAddProperty(teamId: string): Promise<{ allowed: boolean; reason?: string; upgrade_needed?: boolean }> {
    const info = await this.getSubscriptionInfo(teamId)

    if (!info) {
      return { allowed: false, reason: 'No subscription found' }
    }

    if (info.can_add_property) {
      return { allowed: true }
    }

    if (info.status === 'trialing') {
      return { allowed: false, reason: 'Trial expired', upgrade_needed: true }
    }

    if (info.status === 'canceled' || info.status === 'incomplete') {
      return { allowed: false, reason: 'Subscription inactive', upgrade_needed: true }
    }

    if (info.is_free_tier && info.actual_lots >= FREE_TIER_LIMIT) {
      return {
        allowed: false,
        reason: `Free tier limit reached (${FREE_TIER_LIMIT} lots)`,
        upgrade_needed: true
      }
    }

    if (info.actual_lots >= info.subscribed_lots) {
      return {
        allowed: false,
        reason: `Subscription limit reached (${info.subscribed_lots} lots)`,
        upgrade_needed: true
      }
    }

    return { allowed: false, reason: 'Unknown error' }
  }

  /**
   * Get or create Stripe customer for team
   */
  async getOrCreateStripeCustomer(teamId: string, email: string, name?: string): Promise<string> {
    const existing = await this.stripeCustomerRepo.findByTeamId(teamId)
    if (existing) return existing.stripe_customer_id

    // Create new Stripe customer
    const customer = await stripe.customers.create({
      email,
      name,
      metadata: {
        team_id: teamId,
      },
    })

    // Store mapping
    await this.stripeCustomerRepo.create({
      team_id: teamId,
      stripe_customer_id: customer.id,
    })

    return customer.id
  }

  /**
   * Create Checkout Session for new subscription
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
      line_items: [
        {
          price: priceId,
          quantity,
        },
      ],
      subscription_data: {
        metadata: {
          team_id: teamId,
        },
      },
      success_url: successUrl,
      cancel_url: cancelUrl,
      allow_promotion_codes: true,
    })

    return session
  }

  /**
   * Create Checkout Session for upgrading subscription (adding lots)
   */
  async createUpgradeCheckoutSession(
    teamId: string,
    additionalLots: number,
    successUrl: string,
    cancelUrl: string
  ): Promise<Stripe.Checkout.Session> {
    const subscription = await this.subscriptionRepo.findByTeamId(teamId)
    if (!subscription || !subscription.id) {
      throw new Error('No active subscription found')
    }

    const stripeCustomer = await this.stripeCustomerRepo.findByTeamId(teamId)
    if (!stripeCustomer) {
      throw new Error('No Stripe customer found')
    }

    // Get current Stripe subscription to update
    const stripeSubscription = await stripe.subscriptions.retrieve(subscription.id)
    const currentItem = stripeSubscription.items.data[0]

    const newQuantity = (subscription.subscribed_lots || 0) + additionalLots

    // Create checkout session for subscription update
    const session = await stripe.checkout.sessions.create({
      customer: stripeCustomer.stripe_customer_id,
      mode: 'subscription',
      line_items: [
        {
          price: currentItem.price.id,
          quantity: newQuantity,
        },
      ],
      subscription_data: {
        metadata: {
          team_id: teamId,
          upgrade_from: subscription.subscribed_lots,
        },
      },
      success_url: successUrl,
      cancel_url: cancelUrl,
    })

    return session
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
   * Preview upgrade pricing (for showing in modal)
   */
  async previewUpgrade(teamId: string, additionalLots: number): Promise<UpgradePreview> {
    const subscription = await this.subscriptionRepo.findByTeamId(teamId)
    if (!subscription) {
      throw new Error('No subscription found')
    }

    const currentLots = subscription.subscribed_lots || 0
    const newLots = currentLots + additionalLots

    // Calculate proration (simplified - actual proration done by Stripe)
    const interval = subscription.price_id?.includes('annual') ? 'year' : 'month'
    const monthlyChange = additionalLots * (interval === 'year' ? 417 : 500) // cents

    // For accurate proration, we'd use Stripe's invoice preview API
    // This is a simplified estimate

    return {
      current_lots: currentLots,
      new_lots: newLots,
      proration_amount: Math.round(monthlyChange / 2), // Rough estimate for mid-cycle
      monthly_change: monthlyChange,
      currency: 'eur',
    }
  }

  /**
   * Initialize trial for new team (called after signup)
   */
  async initializeTrialSubscription(teamId: string, stripeCustomerId: string): Promise<void> {
    const trialEnd = new Date()
    trialEnd.setDate(trialEnd.getDate() + TRIAL_DAYS)

    // Check initial lot count
    const lotCount = await this.subscriptionRepo.getLotCount(teamId)

    await this.subscriptionRepo.create({
      id: `trial_${teamId}`, // Temporary ID until Stripe subscription created
      team_id: teamId,
      stripe_customer_id: stripeCustomerId,
      status: lotCount <= FREE_TIER_LIMIT ? 'free_tier' : 'trialing',
      trial_start: new Date().toISOString(),
      trial_end: trialEnd.toISOString(),
      subscribed_lots: 0, // No subscription yet
      billable_properties: lotCount,
    })
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
        await handleSubscriptionUpdated(supabase, subscription)
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

      case 'customer.subscription.trial_will_end': {
        const subscription = event.data.object as Stripe.Subscription
        await handleTrialWillEnd(supabase, subscription)
        break
      }

      default:
        console.log(`Unhandled event type: ${event.type}`)
    }

    return NextResponse.json({ received: true })
  } catch (error) {
    console.error('Webhook handler error:', error)
    return NextResponse.json({ error: 'Webhook handler failed' }, { status: 500 })
  }
}

async function handleCheckoutCompleted(supabase: any, session: Stripe.Checkout.Session) {
  const teamId = session.metadata?.team_id
  if (!teamId) {
    console.error('No team_id in checkout session metadata')
    return
  }

  // Subscription is created separately via customer.subscription.created
  console.log(`Checkout completed for team ${teamId}`)
}

async function handleSubscriptionUpdated(supabase: any, subscription: Stripe.Subscription) {
  const teamId = subscription.metadata.team_id
  if (!teamId) {
    console.error('No team_id in subscription metadata')
    return
  }

  const item = subscription.items.data[0]
  const quantity = item.quantity || 1

  const updateData = {
    id: subscription.id,
    team_id: teamId,
    stripe_customer_id: subscription.customer as string,
    price_id: item.price.id,
    status: subscription.status,
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

  const { error } = await supabase
    .from('subscriptions')
    .upsert(updateData, { onConflict: 'id' })

  if (error) {
    console.error('Error upserting subscription:', error)
    throw error
  }

  console.log(`Subscription ${subscription.id} updated for team ${teamId}`)
}

async function handleSubscriptionDeleted(supabase: any, subscription: Stripe.Subscription) {
  const { error } = await supabase
    .from('subscriptions')
    .update({
      status: 'canceled',
      ended_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', subscription.id)

  if (error) {
    console.error('Error marking subscription as canceled:', error)
    throw error
  }

  console.log(`Subscription ${subscription.id} marked as canceled`)
}

async function handleInvoicePaid(supabase: any, invoice: Stripe.Invoice) {
  // Store invoice in database for history
  const { error } = await supabase
    .from('stripe_invoices')
    .upsert({
      id: invoice.id,
      subscription_id: invoice.subscription as string,
      team_id: invoice.metadata?.team_id,
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
      paid_at: invoice.status === 'paid' ? new Date().toISOString() : null,
    })

  if (error) {
    console.error('Error storing invoice:', error)
  }

  console.log(`Invoice ${invoice.id} paid`)
}

async function handlePaymentFailed(supabase: any, invoice: Stripe.Invoice) {
  // Update subscription status to past_due
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

  // TODO: Send notification email to team owner
  console.log(`Payment failed for invoice ${invoice.id}`)
}

async function handleTrialWillEnd(supabase: any, subscription: Stripe.Subscription) {
  const teamId = subscription.metadata.team_id
  // TODO: Send trial ending notification email
  console.log(`Trial will end soon for team ${teamId}`)
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
import { revalidatePath } from 'next/cache'

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

export async function getSubscriptionStatus() {
  const supabase = await createServerSupabaseClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  // Get user's team
  const { data: teamMember } = await supabase
    .from('team_members')
    .select('team_id')
    .eq('user_id', user.id)
    .single()

  if (!teamMember) throw new Error('No team found')

  const service = new SubscriptionService(supabase)
  return service.getSubscriptionInfo(teamMember.team_id)
}

export async function checkCanAddProperty() {
  const supabase = await createServerSupabaseClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const { data: teamMember } = await supabase
    .from('team_members')
    .select('team_id')
    .eq('user_id', user.id)
    .single()

  if (!teamMember) throw new Error('No team found')

  const service = new SubscriptionService(supabase)
  return service.canAddProperty(teamMember.team_id)
}

export async function createCheckoutSessionAction(interval: 'monthly' | 'annual') {
  const supabase = await createServerSupabaseClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const { data: teamMember } = await supabase
    .from('team_members')
    .select('team_id, teams(name)')
    .eq('user_id', user.id)
    .single()

  if (!teamMember) throw new Error('No team found')

  const service = new SubscriptionService(supabase)

  // Get or create Stripe customer
  const customerId = await service.getOrCreateStripeCustomer(
    teamMember.team_id,
    user.email!,
    (teamMember.teams as any)?.name
  )

  // Get current lot count for initial quantity
  const { data: lotCount } = await supabase
    .from('lots')
    .select('*', { count: 'exact', head: true })
    .eq('team_id', teamMember.team_id)
    .is('deleted_at', null)

  const quantity = Math.max(lotCount?.count || 0, FREE_TIER_LIMIT + 1)

  const priceId = interval === 'monthly'
    ? STRIPE_PRICES.monthly
    : STRIPE_PRICES.annual

  const session = await service.createCheckoutSession(
    teamMember.team_id,
    customerId,
    priceId,
    quantity,
    `${APP_URL}/settings?checkout=success`,
    `${APP_URL}/settings?checkout=canceled`
  )

  return { url: session.url }
}

export async function createUpgradeSessionAction(additionalLots: number = 1) {
  const supabase = await createServerSupabaseClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const { data: teamMember } = await supabase
    .from('team_members')
    .select('team_id')
    .eq('user_id', user.id)
    .single()

  if (!teamMember) throw new Error('No team found')

  const service = new SubscriptionService(supabase)

  const session = await service.createUpgradeCheckoutSession(
    teamMember.team_id,
    additionalLots,
    `${APP_URL}/patrimoine?upgrade=success`,
    `${APP_URL}/patrimoine?upgrade=canceled`
  )

  return { url: session.url }
}

export async function createPortalSessionAction() {
  const supabase = await createServerSupabaseClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const { data: teamMember } = await supabase
    .from('team_members')
    .select('team_id')
    .eq('user_id', user.id)
    .single()

  if (!teamMember) throw new Error('No team found')

  const service = new SubscriptionService(supabase)

  const session = await service.createPortalSession(
    teamMember.team_id,
    `${APP_URL}/settings`
  )

  return { url: session.url }
}

export async function getUpgradePreview(additionalLots: number) {
  const supabase = await createServerSupabaseClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const { data: teamMember } = await supabase
    .from('team_members')
    .select('team_id')
    .eq('user_id', user.id)
    .single()

  if (!teamMember) throw new Error('No team found')

  const service = new SubscriptionService(supabase)
  return service.previewUpgrade(teamMember.team_id, additionalLots)
}
```

---

## Phase 5: UI Components

### Task 5.1: Create Trial Banner Component

**Files:**
- Create: `components/billing/trial-banner.tsx`

**Content:**

```typescript
'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { X, Clock } from 'lucide-react'
import { getSubscriptionStatus, createCheckoutSessionAction } from '@/app/actions/subscription-actions'
import { useRouter } from 'next/navigation'

export function TrialBanner() {
  const router = useRouter()
  const [status, setStatus] = useState<any>(null)
  const [dismissed, setDismissed] = useState(false)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    getSubscriptionStatus().then(setStatus).catch(console.error)
  }, [])

  if (!status || status.status !== 'trialing' || dismissed) return null

  const daysLeft = status.trial_end
    ? Math.max(0, Math.ceil((new Date(status.trial_end).getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
    : 0

  if (daysLeft > 7) return null // Only show in last 7 days

  const handleSubscribe = async () => {
    setLoading(true)
    try {
      const { url } = await createCheckoutSessionAction('monthly')
      if (url) router.push(url)
    } catch (error) {
      console.error('Error creating checkout session:', error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="bg-gradient-to-r from-blue-600 to-blue-500 text-white px-4 py-2 flex items-center justify-between">
      <div className="flex items-center gap-2">
        <Clock className="h-4 w-4" />
        <span className="text-sm font-medium">
          {daysLeft === 0
            ? "Votre essai gratuit se termine aujourd'hui"
            : daysLeft === 1
              ? "Votre essai gratuit se termine demain"
              : `Votre essai gratuit se termine dans ${daysLeft} jours`
          }
        </span>
      </div>
      <div className="flex items-center gap-2">
        <Button
          size="sm"
          variant="secondary"
          onClick={handleSubscribe}
          disabled={loading}
        >
          {loading ? 'Chargement...' : 'S\'abonner maintenant'}
        </Button>
        <button
          onClick={() => setDismissed(true)}
          className="text-white/80 hover:text-white p-1"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  )
}
```

---

### Task 5.2: Create Upgrade Modal Component

**Files:**
- Create: `components/billing/upgrade-modal.tsx`

**Content:**

```typescript
'use client'

import { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Plus, Minus, Building2 } from 'lucide-react'
import { createUpgradeSessionAction, getUpgradePreview } from '@/app/actions/subscription-actions'
import { useRouter } from 'next/navigation'

interface UpgradeModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  currentLots: number
  subscribedLots: number
}

export function UpgradeModal({
  open,
  onOpenChange,
  currentLots,
  subscribedLots
}: UpgradeModalProps) {
  const router = useRouter()
  const [additionalLots, setAdditionalLots] = useState(1)
  const [preview, setPreview] = useState<any>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (open) {
      getUpgradePreview(additionalLots).then(setPreview).catch(console.error)
    }
  }, [open, additionalLots])

  const handleUpgrade = async () => {
    setLoading(true)
    try {
      const { url } = await createUpgradeSessionAction(additionalLots)
      if (url) router.push(url)
    } catch (error) {
      console.error('Error creating upgrade session:', error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5 text-blue-500" />
            Augmenter votre abonnement
          </DialogTitle>
          <DialogDescription>
            Vous avez atteint la limite de {subscribedLots} lots de votre abonnement.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Current status */}
          <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
            <span className="text-sm text-muted-foreground">Lots actuels</span>
            <Badge variant="secondary">{currentLots} / {subscribedLots}</Badge>
          </div>

          {/* Quantity selector */}
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Lots supplémentaires</span>
            <div className="flex items-center gap-2">
              <Button
                size="icon"
                variant="outline"
                onClick={() => setAdditionalLots(Math.max(1, additionalLots - 1))}
                disabled={additionalLots <= 1}
              >
                <Minus className="h-4 w-4" />
              </Button>
              <span className="w-8 text-center font-bold">{additionalLots}</span>
              <Button
                size="icon"
                variant="outline"
                onClick={() => setAdditionalLots(additionalLots + 1)}
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Price preview */}
          {preview && (
            <div className="p-4 bg-blue-50 dark:bg-blue-950/30 rounded-lg space-y-2">
              <div className="flex justify-between text-sm">
                <span>Paiement immédiat (prorata)</span>
                <span className="font-semibold">
                  ~{(preview.proration_amount / 100).toFixed(2)}€
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Puis chaque mois</span>
                <span className="font-semibold text-blue-600">
                  +{(preview.monthly_change / 100).toFixed(2)}€/mois
                </span>
              </div>
              <div className="pt-2 border-t border-blue-200 dark:border-blue-800">
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Nouvelle limite</span>
                  <span className="font-bold">{preview.new_lots} lots</span>
                </div>
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Annuler
          </Button>
          <Button onClick={handleUpgrade} disabled={loading}>
            {loading ? 'Chargement...' : 'Confirmer l\'upgrade'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
```

---

### Task 5.3: Update Subscription Management Section

**Files:**
- Modify: `components/subscription-management-section.tsx`

**Replace content to make it functional:**

```typescript
'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { CreditCard, ExternalLink, Building2 } from 'lucide-react'
import {
  getSubscriptionStatus,
  createCheckoutSessionAction,
  createPortalSessionAction
} from '@/app/actions/subscription-actions'
import { useRouter } from 'next/navigation'

export function SubscriptionManagementSection() {
  const router = useRouter()
  const [status, setStatus] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState(false)

  useEffect(() => {
    getSubscriptionStatus()
      .then(setStatus)
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  const handleSubscribe = async (interval: 'monthly' | 'annual') => {
    setActionLoading(true)
    try {
      const { url } = await createCheckoutSessionAction(interval)
      if (url) router.push(url)
    } catch (error) {
      console.error('Error:', error)
    } finally {
      setActionLoading(false)
    }
  }

  const handleManageSubscription = async () => {
    setActionLoading(true)
    try {
      const { url } = await createPortalSessionAction()
      if (url) window.open(url, '_blank')
    } catch (error) {
      console.error('Error:', error)
    } finally {
      setActionLoading(false)
    }
  }

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-64" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-32 w-full" />
        </CardContent>
      </Card>
    )
  }

  const statusLabels: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' }> = {
    trialing: { label: 'Période d\'essai', variant: 'secondary' },
    active: { label: 'Actif', variant: 'default' },
    past_due: { label: 'Paiement en retard', variant: 'destructive' },
    canceled: { label: 'Annulé', variant: 'destructive' },
    free_tier: { label: 'Gratuit', variant: 'secondary' },
  }

  const currentStatus = statusLabels[status?.status] || { label: 'Inconnu', variant: 'secondary' }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5" />
              Gestion d'abonnement
            </CardTitle>
            <CardDescription>
              Gérez votre abonnement et vos limites de biens.
            </CardDescription>
          </div>
          <Badge variant={currentStatus.variant}>{currentStatus.label}</Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Current usage */}
        <div className="p-4 rounded-lg bg-muted/50 border">
          <div className="flex items-center gap-3 mb-2">
            <Building2 className="h-5 w-5 text-primary" />
            <span className="font-medium">Utilisation actuelle</span>
          </div>
          <div className="text-2xl font-bold">
            {status?.actual_lots || 0}
            <span className="text-lg font-normal text-muted-foreground">
              {' '}/ {status?.subscribed_lots || '∞'} lots
            </span>
          </div>
        </div>

        {/* Trial info */}
        {status?.status === 'trialing' && status?.trial_end && (
          <div className="p-4 rounded-lg bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800">
            <p className="text-sm text-blue-800 dark:text-blue-200">
              <strong>Période d'essai</strong> - Se termine le{' '}
              {new Date(status.trial_end).toLocaleDateString('fr-FR', {
                day: 'numeric',
                month: 'long',
                year: 'numeric'
              })}
            </p>
          </div>
        )}

        {/* Actions */}
        {status?.status === 'trialing' || status?.status === 'free_tier' ? (
          <div className="flex flex-col sm:flex-row gap-3">
            <Button
              onClick={() => handleSubscribe('monthly')}
              disabled={actionLoading}
              className="flex-1"
            >
              S'abonner (5€/lot/mois)
            </Button>
            <Button
              variant="outline"
              onClick={() => handleSubscribe('annual')}
              disabled={actionLoading}
              className="flex-1"
            >
              Abonnement annuel (50€/lot/an)
            </Button>
          </div>
        ) : status?.status === 'active' || status?.status === 'past_due' ? (
          <Button
            variant="outline"
            onClick={handleManageSubscription}
            disabled={actionLoading}
            className="w-full"
          >
            <ExternalLink className="h-4 w-4 mr-2" />
            Gérer mon abonnement (Stripe)
          </Button>
        ) : null}

        {/* Info message */}
        <p className="text-xs text-muted-foreground">
          {status?.is_free_tier
            ? 'Avec 2 lots ou moins, SEIDO reste gratuit (hors IA et API externes).'
            : 'Vous pouvez modifier votre abonnement, télécharger vos factures et gérer votre moyen de paiement via le portail Stripe.'
          }
        </p>
      </CardContent>
    </Card>
  )
}
```

---

## Phase 6: Integration & Hooks

### Task 6.1: Add Trial Banner to Layout

**Files:**
- Modify: `app/(app)/layout.tsx`

**Add import and component:**

```typescript
import { TrialBanner } from '@/components/billing/trial-banner'

// Add inside layout, before main content:
<TrialBanner />
```

---

### Task 6.2: Create useSubscription Hook

**Files:**
- Create: `hooks/use-subscription.ts`

**Content:**

```typescript
'use client'

import { useState, useEffect, useCallback } from 'react'
import { getSubscriptionStatus, checkCanAddProperty } from '@/app/actions/subscription-actions'

export function useSubscription() {
  const [status, setStatus] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  const refresh = useCallback(async () => {
    setLoading(true)
    try {
      const data = await getSubscriptionStatus()
      setStatus(data)
      setError(null)
    } catch (err) {
      setError(err as Error)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    refresh()
  }, [refresh])

  const canAddProperty = useCallback(async () => {
    try {
      return await checkCanAddProperty()
    } catch {
      return { allowed: false, reason: 'Error checking subscription' }
    }
  }, [])

  return {
    status,
    loading,
    error,
    refresh,
    canAddProperty,
  }
}
```

---

### Task 6.3: Integrate Subscription Check in Property Forms

**Files to modify:**
- `components/patrimoine/lot-form.tsx` (or similar)
- `components/patrimoine/building-form.tsx` (or similar)

**Pattern to add before form submission:**

```typescript
import { useSubscription } from '@/hooks/use-subscription'
import { UpgradeModal } from '@/components/billing/upgrade-modal'

// In component:
const { canAddProperty, status } = useSubscription()
const [showUpgradeModal, setShowUpgradeModal] = useState(false)

// Before creating property:
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

## Phase 7: Testing & Deployment

### Task 7.1: Configure Stripe Webhook in Dashboard

**Manual Steps:**
1. Go to Stripe Dashboard → Developers → Webhooks
2. Add endpoint: `https://your-domain.com/api/stripe/webhook`
3. Select events:
   - `checkout.session.completed`
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.paid`
   - `invoice.payment_failed`
   - `customer.subscription.trial_will_end`
4. Copy webhook secret to `STRIPE_WEBHOOK_SECRET`

---

### Task 7.2: Create Stripe Products & Prices

**Manual Steps:**
1. Go to Stripe Dashboard → Products
2. Create product "SEIDO Subscription"
3. Add prices:
   - Monthly: 5€, recurring monthly, per unit
   - Annual: 50€, recurring yearly, per unit
4. Copy price IDs to environment variables

---

### Task 7.3: Test with Stripe CLI

**Steps:**

```bash
# Install Stripe CLI
# Forward webhooks to local
stripe listen --forward-to localhost:3000/api/stripe/webhook

# In another terminal, trigger test events
stripe trigger checkout.session.completed
stripe trigger customer.subscription.updated
```

---

### Task 7.4: End-to-End Test Checklist

| Test Case | Expected Result |
|-----------|-----------------|
| New signup | Trial subscription created |
| Trial day 23 | Email sent, banner appears |
| Click "Subscribe" | Redirect to Checkout |
| Complete Checkout | Subscription active |
| Add lot over limit | Upgrade modal appears |
| Confirm upgrade | Redirect to Checkout, quantity increased |
| Portal access | Opens Stripe Customer Portal |
| Webhook: payment_failed | Status changed to past_due |

---

---

## Phase 8: Email Automation

### Task 8.1: Configure Email Templates

**Files:**
- Create: `lib/email/templates/trial-ending-7days.tsx`
- Create: `lib/email/templates/trial-ending-1day.tsx`
- Create: `lib/email/templates/payment-failed.tsx`
- Create: `lib/email/templates/subscription-activated.tsx`

**Template structure (using React Email):**

```typescript
// lib/email/templates/trial-ending-7days.tsx
import { Html, Head, Body, Container, Text, Button, Hr } from '@react-email/components'

interface TrialEnding7DaysProps {
  firstName: string
  trialEndDate: string
  lotCount: number
  monthlyPrice: number
  dashboardUrl: string
}

export function TrialEnding7Days({
  firstName,
  trialEndDate,
  lotCount,
  monthlyPrice,
  dashboardUrl
}: TrialEnding7DaysProps) {
  const isFreeTierEligible = lotCount <= 2

  return (
    <Html>
      <Head />
      <Body style={{ fontFamily: 'Arial, sans-serif', backgroundColor: '#f4f4f5' }}>
        <Container style={{ padding: '40px 20px', maxWidth: '600px', margin: '0 auto' }}>
          <Text style={{ fontSize: '24px', fontWeight: 'bold', color: '#1e293b' }}>
            Bonjour {firstName},
          </Text>

          <Text style={{ color: '#475569' }}>
            Votre période d'essai gratuite de SEIDO se termine le <strong>{trialEndDate}</strong>.
          </Text>

          <Text style={{ color: '#475569' }}>
            Vous gérez actuellement <strong>{lotCount} lots</strong>.
          </Text>

          {isFreeTierEligible ? (
            <Text style={{ color: '#16a34a', fontWeight: 'bold' }}>
              ✓ Bonne nouvelle ! Avec 2 lots ou moins, SEIDO reste gratuit à vie.
            </Text>
          ) : (
            <>
              <Text style={{ color: '#475569' }}>
                Pour continuer à gérer votre patrimoine sans interruption,
                votre abonnement sera de <strong>{monthlyPrice}€/mois</strong>.
              </Text>

              <Button
                href={dashboardUrl}
                style={{
                  backgroundColor: '#2563eb',
                  color: 'white',
                  padding: '12px 24px',
                  borderRadius: '8px',
                  textDecoration: 'none',
                  fontWeight: 'bold'
                }}
              >
                Configurer mon abonnement
              </Button>
            </>
          )}

          <Hr style={{ margin: '24px 0', borderColor: '#e5e7eb' }} />

          <Text style={{ color: '#94a3b8', fontSize: '12px' }}>
            L'équipe SEIDO - La sérénité retrouvée pour les gestionnaires immobiliers
          </Text>
        </Container>
      </Body>
    </Html>
  )
}
```

---

### Task 8.2: Create Email Service

**Files:**
- Create: `lib/services/domain/subscription-email.service.ts`

**Content:**

```typescript
import { Resend } from 'resend'
import { TrialEnding7Days } from '@/lib/email/templates/trial-ending-7days'
import { TrialEnding1Day } from '@/lib/email/templates/trial-ending-1day'
import { PaymentFailed } from '@/lib/email/templates/payment-failed'
import { SubscriptionActivated } from '@/lib/email/templates/subscription-activated'

const resend = new Resend(process.env.RESEND_API_KEY)

export class SubscriptionEmailService {
  async sendTrialEndingEmail(
    email: string,
    firstName: string,
    daysLeft: 7 | 1,
    lotCount: number,
    trialEndDate: Date
  ) {
    const Template = daysLeft === 7 ? TrialEnding7Days : TrialEnding1Day
    const subject = daysLeft === 7
      ? 'Votre période d\'essai SEIDO se termine dans 7 jours'
      : '⏰ Dernier jour d\'essai SEIDO'

    const monthlyPrice = lotCount * 5

    await resend.emails.send({
      from: 'SEIDO <noreply@seido-app.com>',
      to: email,
      subject,
      react: Template({
        firstName,
        trialEndDate: trialEndDate.toLocaleDateString('fr-FR', {
          day: 'numeric',
          month: 'long',
          year: 'numeric'
        }),
        lotCount,
        monthlyPrice,
        dashboardUrl: `${process.env.NEXT_PUBLIC_APP_URL}/settings`
      })
    })
  }

  async sendPaymentFailedEmail(
    email: string,
    firstName: string,
    invoiceUrl: string
  ) {
    await resend.emails.send({
      from: 'SEIDO <noreply@seido-app.com>',
      to: email,
      subject: '⚠️ Problème de paiement SEIDO',
      react: PaymentFailed({
        firstName,
        invoiceUrl,
        updatePaymentUrl: `${process.env.NEXT_PUBLIC_APP_URL}/settings`
      })
    })
  }

  async sendSubscriptionActivatedEmail(
    email: string,
    firstName: string,
    planName: string,
    lotCount: number
  ) {
    await resend.emails.send({
      from: 'SEIDO <noreply@seido-app.com>',
      to: email,
      subject: '🎉 Bienvenue dans SEIDO Pro !',
      react: SubscriptionActivated({
        firstName,
        planName,
        lotCount,
        dashboardUrl: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard`
      })
    })
  }
}
```

---

### Task 8.3: Create CRON Job for Trial Notifications

**Files:**
- Create: `app/api/cron/trial-notifications/route.ts`

**Content:**

```typescript
import { NextResponse } from 'next/server'
import { createAdminSupabaseClient } from '@/lib/services/supabase/admin'
import { SubscriptionEmailService } from '@/lib/services/domain/subscription-email.service'

// Vercel Cron: Run daily at 9:00 AM
// vercel.json: { "crons": [{ "path": "/api/cron/trial-notifications", "schedule": "0 9 * * *" }] }

export async function GET(req: Request) {
  // Verify cron secret
  const authHeader = req.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createAdminSupabaseClient()
  const emailService = new SubscriptionEmailService()

  const now = new Date()
  const in7Days = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)
  const in1Day = new Date(now.getTime() + 1 * 24 * 60 * 60 * 1000)

  // Find trials ending in 7 days
  const { data: trials7Days } = await supabase
    .from('subscriptions')
    .select(`
      team_id,
      trial_end,
      billable_properties,
      teams!inner(
        id,
        name,
        team_members!inner(
          users!inner(email, raw_user_meta_data)
        )
      )
    `)
    .eq('status', 'trialing')
    .gte('trial_end', in7Days.toISOString().split('T')[0])
    .lt('trial_end', new Date(in7Days.getTime() + 24 * 60 * 60 * 1000).toISOString().split('T')[0])

  // Find trials ending tomorrow
  const { data: trials1Day } = await supabase
    .from('subscriptions')
    .select(`
      team_id,
      trial_end,
      billable_properties,
      teams!inner(
        id,
        name,
        team_members!inner(
          users!inner(email, raw_user_meta_data)
        )
      )
    `)
    .eq('status', 'trialing')
    .gte('trial_end', in1Day.toISOString().split('T')[0])
    .lt('trial_end', new Date(in1Day.getTime() + 24 * 60 * 60 * 1000).toISOString().split('T')[0])

  let sent = 0

  // Send 7-day emails
  for (const trial of trials7Days || []) {
    const owner = (trial.teams as any)?.team_members?.[0]?.users
    if (owner?.email) {
      await emailService.sendTrialEndingEmail(
        owner.email,
        owner.raw_user_meta_data?.first_name || 'Gestionnaire',
        7,
        trial.billable_properties || 0,
        new Date(trial.trial_end!)
      )
      sent++
    }
  }

  // Send 1-day emails
  for (const trial of trials1Day || []) {
    const owner = (trial.teams as any)?.team_members?.[0]?.users
    if (owner?.email) {
      await emailService.sendTrialEndingEmail(
        owner.email,
        owner.raw_user_meta_data?.first_name || 'Gestionnaire',
        1,
        trial.billable_properties || 0,
        new Date(trial.trial_end!)
      )
      sent++
    }
  }

  return NextResponse.json({
    success: true,
    emails_sent: sent,
    trials_7days: trials7Days?.length || 0,
    trials_1day: trials1Day?.length || 0
  })
}
```

---

## Phase 9: Advanced UX Components

### Task 9.1: Create Value Calculator Component

**Files:**
- Create: `components/billing/value-calculator.tsx`

**Content:**

```typescript
'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { TrendingUp, Clock, Zap } from 'lucide-react'

interface ValueStats {
  interventions_closed: number
  documents_count: number
  providers_count: number
  estimated_hours_saved: number
}

interface ValueCalculatorProps {
  teamId: string
}

export function ValueCalculator({ teamId }: ValueCalculatorProps) {
  const [stats, setStats] = useState<ValueStats | null>(null)

  useEffect(() => {
    // Fetch team stats
    fetch(`/api/team/stats`)
      .then(res => res.json())
      .then(setStats)
      .catch(console.error)
  }, [teamId])

  if (!stats) return null

  const hourlyRate = 45 // €/hour average
  const moneySaved = stats.estimated_hours_saved * hourlyRate

  return (
    <Card className="bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-950/30 dark:to-emerald-950/30 border-green-200 dark:border-green-800">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-green-800 dark:text-green-200">
          <TrendingUp className="h-5 w-5" />
          Valeur créée avec SEIDO
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-3 gap-4 text-center">
          <div>
            <div className="text-2xl font-bold text-green-600">
              ~{stats.estimated_hours_saved}h
            </div>
            <div className="text-xs text-muted-foreground">économisées</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-green-600">
              {stats.interventions_closed}
            </div>
            <div className="text-xs text-muted-foreground">interventions</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-green-600">
              ~{moneySaved}€
            </div>
            <div className="text-xs text-muted-foreground">de productivité</div>
          </div>
        </div>

        <p className="text-xs text-muted-foreground text-center">
          Estimation basée sur {stats.interventions_closed} interventions clôturées
          et un gain moyen de 30 min par intervention.
        </p>
      </CardContent>
    </Card>
  )
}
```

---

### Task 9.2: Create Contextual Upgrade Prompt

**Files:**
- Create: `components/billing/upgrade-prompt.tsx`

**Content:**

```typescript
'use client'

import { useState } from 'react'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { X, Sparkles, Building2, FileText, Download } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { createCheckoutSessionAction } from '@/app/actions/subscription-actions'

type PromptContext =
  | 'add_lot'
  | 'add_intervention'
  | 'export_data'
  | 'ai_feature'
  | 'api_integration'

interface UpgradePromptProps {
  context: PromptContext
  onDismiss?: () => void
  className?: string
}

const contextConfig: Record<PromptContext, {
  icon: React.ElementType
  title: string
  description: string
  cta: string
  gradient: string
}> = {
  add_lot: {
    icon: Building2,
    title: "Gérez plus de biens",
    description: "Débloquez la gestion illimitée de votre patrimoine immobilier.",
    cta: "Passer à Pro",
    gradient: "from-blue-500 to-blue-600"
  },
  add_intervention: {
    icon: Sparkles,
    title: "Continuez sans interruption",
    description: "Gardez le contrôle de toutes vos interventions en cours.",
    cta: "Activer Pro",
    gradient: "from-purple-500 to-purple-600"
  },
  export_data: {
    icon: Download,
    title: "Exportez vos données",
    description: "Téléchargez vos rapports, historiques et statistiques.",
    cta: "Débloquer l'export",
    gradient: "from-green-500 to-green-600"
  },
  ai_feature: {
    icon: Sparkles,
    title: "Fonctionnalité IA",
    description: "Accédez aux suggestions intelligentes et à l'automatisation.",
    cta: "Activer l'IA",
    gradient: "from-orange-500 to-orange-600"
  },
  api_integration: {
    icon: FileText,
    title: "Intégrations API",
    description: "Connectez SEIDO à vos outils existants.",
    cta: "Débloquer les APIs",
    gradient: "from-cyan-500 to-cyan-600"
  }
}

export function UpgradePrompt({ context, onDismiss, className }: UpgradePromptProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const config = contextConfig[context]
  const Icon = config.icon

  const handleUpgrade = async () => {
    setLoading(true)
    try {
      const { url } = await createCheckoutSessionAction('annual')
      if (url) router.push(url)
    } catch (error) {
      console.error('Error:', error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Alert className={`relative overflow-hidden ${className}`}>
      {/* Gradient background */}
      <div className={`absolute inset-0 bg-gradient-to-r ${config.gradient} opacity-5`} />

      <div className="relative flex items-start gap-4">
        <div className={`p-2 rounded-lg bg-gradient-to-r ${config.gradient}`}>
          <Icon className="h-5 w-5 text-white" />
        </div>

        <div className="flex-1">
          <AlertTitle className="font-semibold">{config.title}</AlertTitle>
          <AlertDescription className="text-sm text-muted-foreground">
            {config.description}
          </AlertDescription>

          <div className="mt-3 flex items-center gap-2">
            <Button
              size="sm"
              onClick={handleUpgrade}
              disabled={loading}
              className={`bg-gradient-to-r ${config.gradient} text-white border-0`}
            >
              {loading ? 'Chargement...' : config.cta}
            </Button>
            <span className="text-xs text-muted-foreground">
              À partir de 4,17€/lot/mois
            </span>
          </div>
        </div>

        {onDismiss && (
          <button
            onClick={onDismiss}
            className="text-muted-foreground hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>
    </Alert>
  )
}
```

---

### Task 9.3: Enhanced Trial Banner with Progress

**Files:**
- Modify: `components/billing/trial-banner.tsx`

**Replace with enhanced version:**

```typescript
'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { X, Clock, Users, Sparkles } from 'lucide-react'
import { getSubscriptionStatus, createCheckoutSessionAction } from '@/app/actions/subscription-actions'
import { useRouter } from 'next/navigation'

export function TrialBanner() {
  const router = useRouter()
  const [status, setStatus] = useState<any>(null)
  const [dismissed, setDismissed] = useState(false)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    // Check localStorage for dismissed state
    const dismissedUntil = localStorage.getItem('trial-banner-dismissed')
    if (dismissedUntil && new Date(dismissedUntil) > new Date()) {
      setDismissed(true)
    }

    getSubscriptionStatus().then(setStatus).catch(console.error)
  }, [])

  if (!status || status.status !== 'trialing' || dismissed) return null

  const daysLeft = status.trial_end
    ? Math.max(0, Math.ceil((new Date(status.trial_end).getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
    : 0

  const totalTrialDays = 30
  const progress = ((totalTrialDays - daysLeft) / totalTrialDays) * 100

  // Show always in last 7 days, otherwise only if not recently dismissed
  if (daysLeft > 7) return null

  const handleDismiss = () => {
    // Dismiss for 24 hours
    const tomorrow = new Date()
    tomorrow.setDate(tomorrow.getDate() + 1)
    localStorage.setItem('trial-banner-dismissed', tomorrow.toISOString())
    setDismissed(true)
  }

  const handleSubscribe = async () => {
    setLoading(true)
    try {
      const { url } = await createCheckoutSessionAction('annual')
      if (url) router.push(url)
    } catch (error) {
      console.error('Error creating checkout session:', error)
    } finally {
      setLoading(false)
    }
  }

  // Urgency levels
  const isUrgent = daysLeft <= 3
  const isCritical = daysLeft <= 1

  const bgClass = isCritical
    ? 'bg-gradient-to-r from-red-600 to-red-500'
    : isUrgent
      ? 'bg-gradient-to-r from-orange-500 to-amber-500'
      : 'bg-gradient-to-r from-blue-600 to-blue-500'

  return (
    <div className={`${bgClass} text-white px-4 py-3`}>
      <div className="container mx-auto">
        <div className="flex items-center justify-between gap-4">
          {/* Left: Message + Progress */}
          <div className="flex items-center gap-4 flex-1">
            <div className="flex items-center gap-2">
              {isCritical ? (
                <Sparkles className="h-5 w-5 animate-pulse" />
              ) : (
                <Clock className="h-5 w-5" />
              )}
              <span className="font-medium">
                {daysLeft === 0
                  ? "🔴 Dernier jour d'essai !"
                  : daysLeft === 1
                    ? "⚠️ Plus qu'un jour d'essai"
                    : `${daysLeft} jours restants`
                }
              </span>
            </div>

            {/* Progress bar */}
            <div className="hidden sm:flex items-center gap-2 flex-1 max-w-xs">
              <Progress
                value={progress}
                className="h-2 bg-white/20 [&>div]:bg-white"
              />
              <span className="text-xs text-white/80 whitespace-nowrap">
                {Math.round(progress)}%
              </span>
            </div>

            {/* Social proof (optional) */}
            <div className="hidden md:flex items-center gap-1 text-sm text-white/80">
              <Users className="h-4 w-4" />
              <span>127 gestionnaires ont souscrit ce mois</span>
            </div>
          </div>

          {/* Right: CTA + Dismiss */}
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="secondary"
              onClick={handleSubscribe}
              disabled={loading}
              className="font-semibold shadow-lg"
            >
              {loading ? 'Chargement...' : (
                isCritical ? "Garder mes données →" : "S'abonner maintenant"
              )}
            </Button>
            <button
              onClick={handleDismiss}
              className="text-white/80 hover:text-white p-1 transition-colors"
              title="Rappeler demain"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Mobile: Loss aversion message */}
        {isCritical && status.actual_lots > 0 && (
          <div className="mt-2 text-sm text-white/90 sm:hidden">
            Ne perdez pas l'accès à vos {status.actual_lots} lots !
          </div>
        )}
      </div>
    </div>
  )
}
```

---

### Task 9.4: Add Webhook Idempotency Table

**Files:**
- Modify: `supabase/migrations/20260130200000_update_subscription_schema_for_stripe.sql`

**Add to migration:**

```sql
-- 7. Webhook events tracking for idempotency
CREATE TABLE IF NOT EXISTS stripe_webhook_events (
  event_id TEXT PRIMARY KEY,  -- Stripe event ID (evt_xxx)
  event_type TEXT NOT NULL,
  processed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  team_id UUID REFERENCES teams(id) ON DELETE SET NULL
);

CREATE INDEX idx_webhook_events_processed ON stripe_webhook_events(processed_at);

-- Cleanup old events (keep 30 days)
CREATE OR REPLACE FUNCTION cleanup_old_webhook_events()
RETURNS void AS $$
BEGIN
  DELETE FROM stripe_webhook_events
  WHERE processed_at < NOW() - INTERVAL '30 days';
END;
$$ LANGUAGE plpgsql;
```

---

### Task 9.5: Update Webhook Handler for Idempotency

**Files:**
- Modify: `app/api/stripe/webhook/route.ts`

**Add idempotency check at the beginning:**

```typescript
// After event verification, before switch statement:

// Check idempotency
const { data: existingEvent } = await supabase
  .from('stripe_webhook_events')
  .select('event_id')
  .eq('event_id', event.id)
  .single()

if (existingEvent) {
  console.log(`Duplicate webhook event: ${event.id}`)
  return NextResponse.json({ received: true, duplicate: true })
}

// Record event
await supabase
  .from('stripe_webhook_events')
  .insert({
    event_id: event.id,
    event_type: event.type,
    team_id: (event.data.object as any).metadata?.team_id || null
  })
```

---

## Summary

**Total Tasks:** ~35 tasks across 9 phases
**Estimated Effort:** 5-7 days for full implementation
**Key Dependencies:**
- Stripe Dashboard configuration (products, prices, webhooks)
- Environment variables setup
- Database migration applied
- Resend API key for emails
- Vercel cron configuration

**Critical Path:**
1. Phase 1 (Foundation) - Must complete first
2. Phase 3 (Webhooks) - Required for subscription sync
3. Phase 4 (Server Actions) - Core business logic
4. Phase 5 (UI Components) - User-facing features
5. Phase 8 (Emails) - Trial conversion optimization
6. Phase 9 (Advanced UX) - Conversion rate optimization

**Conversion Optimization Priorities:**
1. Enhanced Trial Banner (urgency + progress)
2. Contextual Upgrade Prompts
3. Value Calculator (loss aversion)
4. Email sequences (J-7, J-1, J+3)
5. Social proof elements
