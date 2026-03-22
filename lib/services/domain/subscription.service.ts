import Stripe from 'stripe'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/database.types'
import { SubscriptionRepository } from '../repositories/subscription.repository'
import { StripeCustomerRepository } from '../repositories/stripe-customer.repository'
import { FREE_TIER_LIMIT, TRIAL_DAYS, STRIPE_PRICES } from '@/lib/stripe'
import { logger } from '@/lib/logger'

// =============================================================================
// Types
// =============================================================================

export type SubscriptionStatus = Database['public']['Enums']['subscription_status']

export interface SubscriptionInfo {
  status: SubscriptionStatus
  subscribed_lots: number
  actual_lots: number
  trial_end: string | null
  current_period_end: string | null
  cancel_at_period_end: boolean
  can_add_property: boolean
  is_free_tier: boolean
  is_read_only: boolean
  has_stripe_subscription: boolean
  days_left_trial: number | null
  billing_interval: 'month' | 'year' | null
  payment_method_added: boolean
}

export interface UpgradePreview {
  current_lots: number
  subscribed_lots: number
  new_lots: number
  proration_amount: number
  recurring_change: number
  currency: string
  interval: 'month' | 'year'
  is_estimate: boolean
}

export interface CanAddPropertyResult {
  allowed: boolean
  reason?: string
  upgrade_needed?: boolean
}

/**
 * Result of getAccessibleLotIds():
 * - null = all lots are accessible (active subscription, trialing, free tier within limit)
 * - string[] = only these lot IDs are accessible (read_only / expired trial with >FREE_TIER_LIMIT lots)
 */
export type AccessibleLotIds = string[] | null

// =============================================================================
// SubscriptionService — Core Business Logic
// =============================================================================

export class SubscriptionService {
  constructor(
    private readonly stripe: Stripe,
    private readonly subscriptionRepo: SubscriptionRepository,
    private readonly customerRepo: StripeCustomerRepository,
  ) {}

  // ── getSubscriptionInfo ───────────────────────────────────────────────

  /**
   * @param teamId - Team to fetch subscription for
   * @param serviceRoleRepo - Optional repo with service_role client for DB writes
   *   (needed for lazy sync when current_period_end is NULL but stripe_subscription_id exists)
   */
  async getSubscriptionInfo(
    teamId: string,
    serviceRoleRepo?: SubscriptionRepository,
  ): Promise<SubscriptionInfo | null> {
    const { data: sub } = await this.subscriptionRepo.findByTeamId(teamId)
    if (!sub) return null

    // Lazy sync: if Stripe subscription exists but period dates are missing,
    // fetch from Stripe API and persist (self-healing for missed webhooks)
    let periodEnd = sub.current_period_end
    let periodStart = sub.current_period_start ?? null
    let cancelAtEnd = sub.cancel_at_period_end
    let status = sub.status
    let subscribedLots = sub.subscribed_lots

    if (sub.stripe_subscription_id && !sub.current_period_end) {
      const synced = await this.syncPeriodDatesFromStripe(
        teamId,
        sub.stripe_subscription_id,
        serviceRoleRepo,
      )
      if (synced) {
        periodEnd = synced.current_period_end
        periodStart = synced.current_period_start
        cancelAtEnd = synced.cancel_at_period_end
        status = synced.status
        subscribedLots = synced.subscribed_lots
      }
    }

    const { data: actualLots } = await this.subscriptionRepo.getLotCount(teamId)

    const isFreeTier = status === 'free_tier'
    const isReadOnly = this.checkReadOnly(status, sub.trial_end, actualLots)
    const canAdd = this.checkCanAddProperty(status, subscribedLots, actualLots, sub.trial_end)

    let daysLeftTrial: number | null = null
    if (status === 'trialing' && sub.trial_end) {
      const msLeft = new Date(sub.trial_end).getTime() - Date.now()
      daysLeftTrial = Math.max(0, Math.ceil(msLeft / (1000 * 60 * 60 * 24)))
    }

    // Derive billing interval from price_id
    let billingInterval: 'month' | 'year' | null = null
    if (sub.price_id) {
      if (sub.price_id === STRIPE_PRICES.monthly) billingInterval = 'month'
      else if (sub.price_id === STRIPE_PRICES.annual) billingInterval = 'year'
    }

    return {
      status,
      subscribed_lots: subscribedLots,
      actual_lots: actualLots,
      trial_end: sub.trial_end,
      current_period_end: periodEnd,
      cancel_at_period_end: cancelAtEnd,
      can_add_property: canAdd,
      is_free_tier: isFreeTier,
      is_read_only: isReadOnly,
      has_stripe_subscription: !!sub.stripe_subscription_id,
      days_left_trial: daysLeftTrial,
      billing_interval: billingInterval,
      payment_method_added: sub.payment_method_added ?? false,
    }
  }

  // ── canAddProperty ────────────────────────────────────────────────────

  async canAddProperty(teamId: string, count: number = 1): Promise<CanAddPropertyResult> {
    const { data: sub } = await this.subscriptionRepo.findByTeamId(teamId)

    // No subscription = new team, allowed
    if (!sub) {
      return { allowed: true }
    }

    const { data: actualLots } = await this.subscriptionRepo.getLotCount(teamId)

    // Read-only, paused, or dead-end statuses = blocked
    if (sub.status === 'read_only' || sub.status === 'unpaid' || sub.status === 'incomplete_expired' || sub.status === 'paused') {
      return { allowed: false, reason: 'Account in read-only mode' }
    }

    if (sub.status === 'canceled') {
      if (actualLots > FREE_TIER_LIMIT) {
        return { allowed: false, reason: 'Account in read-only mode' }
      }
      // Canceled with <=2 lots = treat as free tier
      return (actualLots + count) <= FREE_TIER_LIMIT
        ? { allowed: true }
        : { allowed: false, reason: 'Limite gratuite atteinte (2 lots)', upgrade_needed: true }
    }

    // Free tier: can add up to FREE_TIER_LIMIT
    if (sub.status === 'free_tier') {
      if ((actualLots + count) <= FREE_TIER_LIMIT) {
        return { allowed: true }
      }
      return { allowed: false, reason: 'Limite gratuite atteinte (2 lots)', upgrade_needed: true }
    }

    // Trialing: always allowed (no limit during trial)
    if (sub.status === 'trialing') {
      return { allowed: true }
    }

    // Active / past_due / incomplete
    if (sub.subscribed_lots === 0) {
      // Haven't subscribed yet (still in conceptual trial)
      return { allowed: true }
    }

    if ((actualLots + count) <= sub.subscribed_lots) {
      return { allowed: true }
    }

    return {
      allowed: false,
      reason: `Limite d'abonnement atteinte (${sub.subscribed_lots} lots). Vous tentez d'ajouter ${count} lot${count > 1 ? 's' : ''} mais il ne reste que ${Math.max(0, sub.subscribed_lots - actualLots)} slot${Math.max(0, sub.subscribed_lots - actualLots) > 1 ? 's' : ''} disponible${Math.max(0, sub.subscribed_lots - actualLots) > 1 ? 's' : ''}.`,
      upgrade_needed: true,
    }
  }

  // ── hasPaymentMethod ──────────────────────────────────────────────────

  async hasPaymentMethod(teamId: string): Promise<boolean> {
    try {
      const { data: customer } = await this.customerRepo.findByTeamId(teamId)
      if (!customer) return false

      const methods = await this.stripe.paymentMethods.list({
        customer: customer.stripe_customer_id,
        type: 'card',
        limit: 1,
      })

      return methods.data.length > 0
    } catch {
      return false
    }
  }

  // ── getOrCreateStripeCustomer ─────────────────────────────────────────

  async getOrCreateStripeCustomer(
    teamId: string,
    email: string,
    name?: string,
  ): Promise<string> {
    // Check if already exists in DB
    const { data: existing } = await this.customerRepo.findByTeamId(teamId)
    if (existing) {
      // Verify the customer still exists in Stripe (may be stale after key rotation)
      try {
        const retrieved = await this.stripe.customers.retrieve(existing.stripe_customer_id)
        // Stripe returns { deleted: true } for deleted customers instead of throwing
        if ('deleted' in retrieved && retrieved.deleted) {
          throw new Error('Customer was deleted')
        }
        return existing.stripe_customer_id
      } catch {
        // Customer doesn't exist in Stripe or was deleted — recreate
        const stripeCustomer = await this.stripe.customers.create({
          email,
          name: name ?? undefined,
          metadata: { team_id: teamId },
        })
        await this.customerRepo.updateStripeCustomerId(
          teamId,
          stripeCustomer.id,
          email,
          name ?? null,
        )
        return stripeCustomer.id
      }
    }

    // Create in Stripe
    const stripeCustomer = await this.stripe.customers.create({
      email,
      name: name ?? undefined,
      metadata: { team_id: teamId },
    })

    // Save mapping in DB
    await this.customerRepo.create({
      team_id: teamId,
      stripe_customer_id: stripeCustomer.id,
      email,
      name: name ?? null,
    })

    return stripeCustomer.id
  }

  // ── createCheckoutSession ─────────────────────────────────────────────

  async createCheckoutSession(params: {
    teamId: string
    customerId: string
    priceId?: string
    quantity: number
    successUrl: string
    cancelUrl: string
    trialEnd?: number // Unix timestamp — Stripe collects payment method but charges 0 EUR until this date
  }): Promise<Stripe.Checkout.Session> {
    const { teamId, customerId, quantity, successUrl, cancelUrl, trialEnd } = params
    const priceId = params.priceId || STRIPE_PRICES.annual

    // Minimum 3 lots (since 1-2 is free tier)
    const effectiveQuantity = Math.max(quantity, FREE_TIER_LIMIT + 1)

    const session = await this.stripe.checkout.sessions.create({
      customer: customerId,
      mode: 'subscription',
      allow_promotion_codes: true,
      payment_method_collection: 'always',
      metadata: { team_id: teamId },
      line_items: [
        {
          price: priceId,
          quantity: effectiveQuantity,
        },
      ],
      subscription_data: {
        metadata: { team_id: teamId },
        ...(trialEnd ? { trial_end: trialEnd } : {}),
      },
      success_url: successUrl,
      cancel_url: cancelUrl,
    })

    return session
  }

  // ── upgradeSubscriptionDirect ─────────────────────────────────────────

  async upgradeSubscriptionDirect(
    teamId: string,
    additionalLots: number,
  ): Promise<{ success: boolean; invoice_amount?: number }> {
    const { data: sub } = await this.subscriptionRepo.findByTeamId(teamId)
    if (!sub?.stripe_subscription_id) {
      return { success: false }
    }

    // Fetch current Stripe subscription to get item ID
    const stripeSub = await this.stripe.subscriptions.retrieve(sub.stripe_subscription_id)
    const item = stripeSub.items.data[0]
    if (!item) {
      return { success: false }
    }

    const newQuantity = (item.quantity ?? 0) + additionalLots

    const updated = await this.stripe.subscriptions.update(sub.stripe_subscription_id, {
      items: [
        {
          id: item.id,
          quantity: newQuantity,
        },
      ],
      proration_behavior: 'always_invoice',
    })

    // Update DB
    await this.subscriptionRepo.updateByTeamId(teamId, {
      subscribed_lots: newQuantity,
    })

    // Get latest invoice for proration amount
    const invoices = await this.stripe.invoices.list({
      subscription: sub.stripe_subscription_id,
      limit: 1,
    })
    const invoiceAmount = invoices.data[0]?.amount_due ?? 0

    return { success: true, invoice_amount: invoiceAmount }
  }

  // ── previewUpgrade ────────────────────────────────────────────────────

  async previewUpgrade(
    teamId: string,
    additionalLots: number,
  ): Promise<UpgradePreview> {
    const { data: sub } = await this.subscriptionRepo.findByTeamId(teamId)
    if (!sub?.stripe_subscription_id) {
      // Rough estimate for teams without active subscription
      const newLots = additionalLots
      return {
        current_lots: 0,
        subscribed_lots: 0,
        new_lots: newLots,
        proration_amount: 0,
        recurring_change: 0,
        currency: 'eur',
        interval: 'year',
        is_estimate: true,
      }
    }

    // Fetch actual lot count for display (not Stripe quantity)
    const { data: actualLots } = await this.subscriptionRepo.getLotCount(teamId)

    try {
      const stripeSub = await this.stripe.subscriptions.retrieve(sub.stripe_subscription_id)
      const item = stripeSub.items.data[0]
      const currentQuantity = item?.quantity ?? 0
      const newQuantity = currentQuantity + additionalLots

      const preview = await this.stripe.invoices.createPreview({
        customer: stripeSub.customer as string,
        subscription: sub.stripe_subscription_id,
        subscription_items: [
          {
            id: item?.id,
            quantity: newQuantity,
          },
        ],
        subscription_proration_behavior: 'always_invoice',
      })

      // Determine interval from price
      const interval = (item?.price?.recurring?.interval === 'month' ? 'month' : 'year') as 'month' | 'year'
      const pricePerLot = interval === 'year' ? 5000 : 500

      return {
        current_lots: actualLots,
        subscribed_lots: currentQuantity,
        new_lots: newQuantity,
        proration_amount: preview.amount_due,
        recurring_change: additionalLots * pricePerLot,
        currency: preview.currency,
        interval,
        is_estimate: false,
      }
    } catch {
      // Fallback to rough estimate
      const subscribedLots = sub.subscribed_lots
      const newLots = subscribedLots + additionalLots
      const pricePerLot = 5000 // Default to annual

      return {
        current_lots: actualLots,
        subscribed_lots: subscribedLots,
        new_lots: newLots,
        proration_amount: additionalLots * pricePerLot,
        recurring_change: additionalLots * pricePerLot,
        currency: 'eur',
        interval: 'year',
        is_estimate: true,
      }
    }
  }

  // ── createPortalSession ───────────────────────────────────────────────

  async createPortalSession(
    teamId: string,
    returnUrl: string,
  ): Promise<Stripe.BillingPortal.Session> {
    const { data: customer } = await this.customerRepo.findByTeamId(teamId)
    if (!customer) {
      throw new Error(`No Stripe customer found for team ${teamId}`)
    }

    const session = await this.stripe.billingPortal.sessions.create({
      customer: customer.stripe_customer_id,
      return_url: returnUrl,
    })

    return session
  }

  // ── initializeTrialSubscription ───────────────────────────────────────

  async initializeTrialSubscription(teamId: string): Promise<void> {
    const { data: actualLots } = await this.subscriptionRepo.getLotCount(teamId)

    const trialEnd = new Date()
    trialEnd.setDate(trialEnd.getDate() + TRIAL_DAYS)

    // Always start as trialing — after 30 days, transitions to free_tier (≤2 lots) or read_only (>2 lots)
    const status: SubscriptionStatus = 'trialing'

    await this.subscriptionRepo.create({
      team_id: teamId,
      status,
      trial_start: new Date().toISOString(),
      trial_end: trialEnd.toISOString(),
      billable_properties: actualLots,
    })
  }

  // ── isReadOnlyMode ────────────────────────────────────────────────────

  async isReadOnlyMode(teamId: string): Promise<boolean> {
    const { data: sub } = await this.subscriptionRepo.findByTeamId(teamId)
    if (!sub) return false

    const { data: actualLots } = await this.subscriptionRepo.getLotCount(teamId)
    return this.checkReadOnly(sub.status, sub.trial_end, actualLots)
  }

  // ── Private helpers ───────────────────────────────────────────────────

  /**
   * Lazy-sync period dates from Stripe API when DB has stripe_subscription_id
   * but current_period_end is NULL (e.g. webhook never fired in preview env).
   * Persists to DB so subsequent calls skip the API call.
   */
  private async syncPeriodDatesFromStripe(
    teamId: string,
    stripeSubId: string,
    serviceRoleRepo?: SubscriptionRepository,
  ): Promise<{
    current_period_end: string | null
    current_period_start: string | null
    cancel_at_period_end: boolean
    status: SubscriptionStatus
    subscribed_lots: number
  } | null> {
    try {
      const stripeSub = await this.stripe.subscriptions.retrieve(stripeSubId)
      const firstItem = stripeSub.items?.data?.[0]
      // Stripe API: current_period_start/end are on the subscription item, not the subscription root (see docs).
      const rawPeriodStart = stripeSub.current_period_start ?? (firstItem as { current_period_start?: number } | undefined)?.current_period_start
      const rawPeriodEnd = stripeSub.current_period_end ?? (firstItem as { current_period_end?: number } | undefined)?.current_period_end

      const periodEnd = rawPeriodEnd
        ? new Date(rawPeriodEnd * 1000).toISOString()
        : null
      const periodStart = rawPeriodStart
        ? new Date(rawPeriodStart * 1000).toISOString()
        : null
      const cancelAtEnd = stripeSub.cancel_at_period_end ?? false
      const status = SubscriptionService.mapStripeStatus(stripeSub.status)
      const quantity = firstItem?.quantity ?? 0

      // Persist to DB using service_role repo if available, else fall back to current repo
      const writeRepo = serviceRoleRepo ?? this.subscriptionRepo
      const updatePayload = {
        current_period_start: periodStart,
        current_period_end: periodEnd,
        cancel_at_period_end: cancelAtEnd,
        status,
        subscribed_lots: quantity,
      }
      const { data: updateData, error: updateError } = await writeRepo.updateByTeamId(teamId, updatePayload)

      if (updateError) {
        logger.error('[SUBSCRIPTION] Lazy-sync DB write FAILED:', {
          teamId,
          stripeSubId,
          error: updateError.message ?? String(updateError),
          code: (updateError as { code?: string }).code,
          details: (updateError as { details?: string }).details,
          repoType: serviceRoleRepo ? 'service_role' : 'user_scoped',
        })
        // Still return Stripe data so the page shows correct dates
        // even when persistence fails (will retry on next load)
      } else {
        logger.info('[SUBSCRIPTION] Lazy-synced period dates from Stripe:', {
          teamId,
          stripeSubId,
          status,
          periodEnd,
          quantity,
          savedPeriodEnd: updateData?.current_period_end,
        })
      }

      return {
        current_period_end: periodEnd,
        current_period_start: periodStart,
        cancel_at_period_end: cancelAtEnd,
        status,
        subscribed_lots: quantity,
      }
    } catch (error) {
      logger.warn('[SUBSCRIPTION] Failed to lazy-sync from Stripe:', {
        teamId,
        stripeSubId,
        error: error instanceof Error ? error.message : String(error),
      })
      return null
    }
  }

  // ── getAccessibleLotIds ──────────────────────────────────────────────

  /**
   * Returns which lots a team can access based on subscription status.
   *
   * @returns null = all lots accessible (active, trialing, free_tier ≤ limit)
   * @returns string[] = only these lot IDs are accessible (read_only mode)
   *
   * The rule: when restricted, keep the 2 oldest lots (by created_at ASC).
   */
  async getAccessibleLotIds(
    teamId: string,
    subscriptionInfo: SubscriptionInfo,
    supabase: SupabaseClient<Database>,
  ): Promise<AccessibleLotIds> {
    // If not read-only, all lots are accessible
    if (!subscriptionInfo.is_read_only) return null

    // If within free tier limit, all lots are accessible
    if (subscriptionInfo.actual_lots <= FREE_TIER_LIMIT) return null

    // Read-only with >FREE_TIER_LIMIT lots: only the N oldest are accessible
    const { data: lots, error } = await supabase
      .from('lots')
      .select('id')
      .eq('team_id', teamId)
      .is('deleted_at', null)
      .order('created_at', { ascending: true })
      .limit(FREE_TIER_LIMIT)

    if (error || !lots) {
      logger.error('[SUBSCRIPTION] getAccessibleLotIds query failed — FAIL CLOSED (no lots accessible)', { teamId, error })
      // Fail closed: return empty array (no access) to prevent unauthorized access on DB error
      return []
    }

    return lots.map(l => l.id)
  }

  /**
   * Maps Stripe subscription status string to our DB enum.
   * Reusable across webhook handler and lazy sync.
   */
  static mapStripeStatus(stripeStatus: string): SubscriptionStatus {
    const map: Record<string, SubscriptionStatus> = {
      active: 'active',
      past_due: 'past_due',
      canceled: 'canceled',
      incomplete: 'incomplete',
      incomplete_expired: 'incomplete_expired',
      trialing: 'trialing',
      unpaid: 'unpaid',
      paused: 'paused',
    }
    const mapped = map[stripeStatus]
    if (!mapped) {
      logger.warn({ stripeStatus }, '⚠️ [STRIPE] Unknown subscription status — falling back to past_due (fail-closed)')
      return 'past_due'
    }
    return mapped
  }

  private checkReadOnly(
    status: SubscriptionStatus,
    trialEnd: string | null,
    actualLots: number,
  ): boolean {
    if (status === 'read_only') return true
    if (status === 'unpaid') return true
    if (status === 'incomplete_expired') return true
    if (status === 'paused') return true

    if (status === 'canceled' && actualLots > FREE_TIER_LIMIT) return true

    if (status === 'trialing' && trialEnd) {
      const expired = new Date(trialEnd).getTime() < Date.now()
      if (expired && actualLots > FREE_TIER_LIMIT) return true
    }

    return false
  }

  private checkCanAddProperty(
    status: SubscriptionStatus,
    subscribedLots: number,
    actualLots: number,
    trialEnd: string | null,
  ): boolean {
    if (status === 'read_only' || status === 'unpaid' || status === 'incomplete_expired' || status === 'paused') {
      return false
    }

    if (status === 'canceled') {
      return actualLots < FREE_TIER_LIMIT
    }

    if (status === 'free_tier') {
      return actualLots < FREE_TIER_LIMIT
    }

    if (status === 'trialing') {
      // Check if trial expired with >2 lots
      if (trialEnd) {
        const expired = new Date(trialEnd).getTime() < Date.now()
        if (expired && actualLots > FREE_TIER_LIMIT) return false
      }
      return true
    }

    // Active / past_due / paused / incomplete
    if (subscribedLots === 0) return true
    return actualLots < subscribedLots
  }
}
