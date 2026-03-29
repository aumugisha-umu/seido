import Stripe from 'stripe'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/database.types'
import { SubscriptionRepository } from '../repositories/subscription.repository'
import { StripeCustomerRepository } from '../repositories/stripe-customer.repository'
import { FREE_TIER_LIMIT, getTierFromPriceId, isAiPrice, type AiTier } from '@/lib/stripe'
import { SubscriptionService, type SubscriptionStatus } from './subscription.service'
import { logger } from '@/lib/logger'

// =============================================================================
// Types
// =============================================================================

export interface WebhookResult {
  status: number
  message: string
}

// =============================================================================
// StripeWebhookHandler — Processes Stripe events
// =============================================================================

export class StripeWebhookHandler {
  private subRepo: SubscriptionRepository
  private custRepo: StripeCustomerRepository

  constructor(private readonly supabase: SupabaseClient<Database>) {
    this.subRepo = new SubscriptionRepository(supabase)
    this.custRepo = new StripeCustomerRepository(supabase)
  }

  // ── Main entry point ──────────────────────────────────────────────────

  async handleEvent(event: Stripe.Event): Promise<WebhookResult> {
    try {
      // Idempotency check — skip if already processed
      const alreadyProcessed = await this.checkAndRecordEvent(event.id, event.type)
      if (alreadyProcessed) {
        return { status: 200, message: `Event ${event.id} already processed` }
      }

      switch (event.type) {
        case 'checkout.session.completed':
          return await this.handleCheckoutCompleted(event.data.object as Stripe.Checkout.Session)

        case 'customer.subscription.created':
          return await this.handleSubscriptionCreated(event.data.object as Stripe.Subscription)

        case 'customer.subscription.updated':
          return await this.handleSubscriptionUpdated(event.data.object as Stripe.Subscription)

        case 'customer.subscription.deleted':
          return await this.handleSubscriptionDeleted(event.data.object as Stripe.Subscription)

        case 'customer.subscription.paused':
          return await this.handleSubscriptionPaused(event.data.object as Stripe.Subscription)

        case 'invoice.paid':
          return await this.handleInvoicePaid(event.data.object as Stripe.Invoice)

        case 'invoice.payment_failed':
          return await this.handleInvoicePaymentFailed(event.data.object as Stripe.Invoice)

        case 'charge.refunded':
          return await this.handleChargeRefunded(event.data.object as Stripe.Charge)

        default:
          return { status: 200, message: `Unhandled event type: ${event.type}` }
      }
    } catch (error) {
      // Return 500 so Stripe retries (exponential backoff up to 3 days)
      const message = error instanceof Error ? error.message : 'Unknown error'
      return { status: 500, message: `Error processing ${event.type}: ${message}` }
    }
  }

  // ── Idempotency ───────────────────────────────────────────────────────

  private async checkAndRecordEvent(eventId: string, eventType: string): Promise<boolean> {
    // Try to insert — if it already exists, it was already processed
    const { error } = await this.supabase
      .from('stripe_webhook_events')
      .insert({
        event_id: eventId,
        event_type: eventType,
      })

    // Unique constraint violation = already processed
    if (error?.code === '23505') {
      return true
    }

    // Other errors = not processed, but we should log
    if (error) {
      throw new Error(`Failed to record webhook event: ${error.message}`)
    }

    return false
  }

  // ── Event Handlers ────────────────────────────────────────────────────

  private async handleCheckoutCompleted(session: Stripe.Checkout.Session): Promise<WebhookResult> {
    const teamId = session.metadata?.team_id
    if (!teamId) {
      return { status: 400, message: 'Missing team_id in checkout session metadata' }
    }

    // 'paid' = normal checkout, 'no_payment_required' = trial with 0 EUR
    if (session.payment_status !== 'paid' && session.payment_status !== 'no_payment_required') {
      return { status: 200, message: 'Checkout payment not yet completed' }
    }

    // Route AI add-on checkouts to dedicated handler
    if (session.metadata?.addon_type === 'ai_voice') {
      return this.handleAiCheckoutCompleted(session, teamId)
    }

    // Subscription will be synced via subscription.created/updated webhooks
    // Just ensure the customer mapping exists
    if (session.customer && typeof session.customer === 'string') {
      const { data: existing } = await this.custRepo.findByTeamId(teamId)
      if (!existing) {
        await this.custRepo.create({
          team_id: teamId,
          stripe_customer_id: session.customer,
          email: session.customer_email ?? null,
        })
      }
    }

    // Send subscription-activated email (non-blocking)
    try {
      const { getSubscriptionEmailService } = await import('./subscription-email.service')
      const emailService = getSubscriptionEmailService()

      // Get team admin details
      const { data: members } = await this.supabase
        .from('team_members')
        .select('user_id, users!inner(email, first_name)')
        .eq('team_id', teamId)
        .eq('role', 'admin')
        .is('left_at', null)
        .limit(1)

      const member = members?.[0]
      if (member?.users?.email) {
        const { data: sub } = await this.subRepo.findByTeamId(teamId)
        const { data: team } = await this.supabase
          .from('teams')
          .select('name')
          .eq('id', teamId)
          .limit(1)
          .maybeSingle()

        const item = session.line_items?.data?.[0]
        const interval = item?.price?.recurring?.interval === 'year' ? 'annual' : 'monthly' as const
        const periodEnd = sub?.current_period_end
          ? new Date(sub.current_period_end).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })
          : ''

        await emailService.sendSubscriptionActivated(member.users.email, {
          firstName: member.users.first_name || 'Gestionnaire',
          teamName: team?.name || 'Votre equipe',
          plan: interval,
          lotCount: sub?.subscribed_lots ?? 0,
          amountHT: (session.amount_total ?? 0) / 100,
          nextRenewalDate: periodEnd,
        })
      }
    } catch {
      // Non-blocking — email failure should not affect checkout processing
    }

    return { status: 200, message: 'Checkout completed processed' }
  }

  private async handleSubscriptionCreated(subscription: Stripe.Subscription): Promise<WebhookResult> {
    const teamId = subscription.metadata?.team_id
    if (!teamId) {
      return { status: 400, message: 'Missing team_id in subscription metadata' }
    }

    // Legacy route: AI-only subscriptions with addon_type metadata (pre-unified model)
    if (subscription.metadata?.addon_type === 'ai_voice' && !subscription.items?.data?.some(i => !isAiPrice(i.price.id))) {
      return this.handleAiSubscriptionCreatedOrUpdated(subscription, teamId)
    }

    // Unified model: process main item + detect AI item
    const mainItem = subscription.items?.data?.find(i => !isAiPrice(i.price.id))
    const aiItem = subscription.items?.data?.find(i => isAiPrice(i.price.id))
    const quantity = mainItem?.quantity ?? 0

    const status = SubscriptionService.mapStripeStatus(subscription.status)
    const hasPaymentMethod = !!subscription.default_payment_method

    // Sync main subscription to DB (even if only AI item exists, we track the subscription)
    await this.subRepo.upsertByTeamId(teamId, {
      team_id: teamId,
      stripe_subscription_id: subscription.id,
      stripe_customer_id: typeof subscription.customer === 'string' ? subscription.customer : null,
      price_id: mainItem?.price?.id ?? null,
      status,
      subscribed_lots: quantity,
      current_period_start: subscription.current_period_start
        ? new Date(subscription.current_period_start * 1000).toISOString()
        : null,
      current_period_end: subscription.current_period_end
        ? new Date(subscription.current_period_end * 1000).toISOString()
        : null,
      cancel_at_period_end: subscription.cancel_at_period_end ?? false,
      ...(hasPaymentMethod ? { payment_method_added: true } : {}),
    })

    // Handle AI item if present
    if (aiItem) {
      await this.ensureAiProvisioned(teamId, subscription.id, aiItem.price.id)
    }

    if (quantity > 0) {
      void this.sendSubscriptionAdminNotification('change', teamId, 0, quantity, mainItem?.price?.id ?? null).catch(() => {})
    }

    return { status: 200, message: 'Subscription created processed' }
  }

  private async handleSubscriptionUpdated(subscription: Stripe.Subscription): Promise<WebhookResult> {
    const teamId = subscription.metadata?.team_id

    // Legacy route: AI-only subscriptions with addon_type metadata (pre-unified model)
    if (subscription.metadata?.addon_type === 'ai_voice' && !subscription.items?.data?.some(i => !isAiPrice(i.price.id))) {
      const resolvedTeamId = teamId ?? await this.resolveAiTeamId(subscription.id)
      if (!resolvedTeamId) {
        return { status: 400, message: 'Cannot determine team_id for AI subscription update' }
      }
      return this.handleAiSubscriptionCreatedOrUpdated(subscription, resolvedTeamId)
    }

    // Try to find by Stripe subscription ID first (out-of-order handling)
    let targetTeamId = teamId
    if (!targetTeamId) {
      const { data: existing } = await this.subRepo.findByStripeSubscriptionId(subscription.id)
      if (existing) {
        targetTeamId = existing.team_id
      }
    }
    // Also try to resolve via AI phone numbers table
    if (!targetTeamId) {
      targetTeamId = await this.resolveAiTeamId(subscription.id)
    }

    if (!targetTeamId) {
      return { status: 400, message: 'Cannot determine team_id for subscription update' }
    }

    // Unified model: process main item + detect AI item changes
    const mainItem = subscription.items?.data?.find(i => !isAiPrice(i.price.id))
    const aiItem = subscription.items?.data?.find(i => isAiPrice(i.price.id))
    const quantity = mainItem?.quantity ?? 0
    const status = SubscriptionService.mapStripeStatus(subscription.status)

    const hasPaymentMethod = !!subscription.default_payment_method

    // Capture old lots before upsert for admin notification delta
    const { data: existingSub } = await this.subRepo.findByTeamId(targetTeamId)
    const oldLots = existingSub?.subscribed_lots ?? 0

    await this.subRepo.upsertByTeamId(targetTeamId, {
      team_id: targetTeamId,
      stripe_subscription_id: subscription.id,
      stripe_customer_id: typeof subscription.customer === 'string' ? subscription.customer : null,
      price_id: mainItem?.price?.id ?? null,
      status,
      subscribed_lots: quantity,
      current_period_start: subscription.current_period_start
        ? new Date(subscription.current_period_start * 1000).toISOString()
        : null,
      current_period_end: subscription.current_period_end
        ? new Date(subscription.current_period_end * 1000).toISOString()
        : null,
      cancel_at_period_end: subscription.cancel_at_period_end ?? false,
      cancel_at: subscription.cancel_at
        ? new Date(subscription.cancel_at * 1000).toISOString()
        : null,
      canceled_at: subscription.canceled_at
        ? new Date(subscription.canceled_at * 1000).toISOString()
        : null,
      ...(hasPaymentMethod ? { payment_method_added: true } : {}),
    })

    // Handle AI item: provision if present, deprovision if removed
    if (aiItem) {
      await this.ensureAiProvisioned(targetTeamId, subscription.id, aiItem.price.id)
    } else {
      // AI item was removed — check if it was previously active and deprovision
      await this.ensureAiDeprovisioned(targetTeamId, subscription.id)
    }

    // Admin notification — only when lot count actually changes
    if (quantity !== oldLots && quantity > 0) {
      void this.sendSubscriptionAdminNotification('change', targetTeamId, oldLots, quantity, mainItem?.price?.id ?? null).catch(() => {})
    }

    return { status: 200, message: 'Subscription updated processed' }
  }

  private async handleSubscriptionDeleted(subscription: Stripe.Subscription): Promise<WebhookResult> {
    const teamId = subscription.metadata?.team_id

    // Route AI add-on deletions to dedicated handler
    if (subscription.metadata?.addon_type === 'ai_voice') {
      const resolvedTeamId = teamId ?? await this.resolveAiTeamId(subscription.id)
      if (!resolvedTeamId) {
        return { status: 200, message: 'AI subscription deleted but team not found — no-op' }
      }
      return this.handleAiSubscriptionDeleted(resolvedTeamId)
    }

    let targetTeamId = teamId

    if (!targetTeamId) {
      const { data: existing } = await this.subRepo.findByStripeSubscriptionId(subscription.id)
      if (existing) {
        targetTeamId = existing.team_id
      }
    }

    if (!targetTeamId) {
      return { status: 200, message: 'Subscription deleted but team not found — no-op' }
    }

    // Capture subscription details before deletion for admin notification
    const { data: existingSub } = await this.subRepo.findByTeamId(targetTeamId)
    const lotsLost = existingSub?.subscribed_lots ?? 0
    const priceId = existingSub?.price_id ?? null
    const subscriptionStart = existingSub?.current_period_start ?? null

    // Determine post-deletion status based on lot count
    const { data: lotCount } = await this.subRepo.getLotCount(targetTeamId)
    const newStatus: SubscriptionStatus = lotCount <= FREE_TIER_LIMIT ? 'free_tier' : 'read_only'

    await this.subRepo.updateByTeamId(targetTeamId, {
      status: newStatus,
      stripe_subscription_id: null,
      cancel_at_period_end: false,
      ended_at: new Date().toISOString(),
    })

    // Admin notification — churn (non-blocking)
    if (lotsLost > 0) {
      void this.sendSubscriptionAdminNotification('cancelled', targetTeamId, lotsLost, 0, priceId, subscriptionStart).catch(() => {})
    }

    return { status: 200, message: `Subscription deleted, team transitioned to ${newStatus}` }
  }

  private async handleSubscriptionPaused(subscription: Stripe.Subscription): Promise<WebhookResult> {
    const teamId = subscription.metadata?.team_id
    let targetTeamId = teamId

    if (!targetTeamId) {
      const { data: existing } = await this.subRepo.findByStripeSubscriptionId(subscription.id)
      if (existing) {
        targetTeamId = existing.team_id
      }
    }

    if (!targetTeamId) {
      return { status: 200, message: 'Subscription paused but team not found — no-op' }
    }

    await this.subRepo.updateByTeamId(targetTeamId, {
      status: 'paused',
    })

    return { status: 200, message: 'Subscription paused processed' }
  }

  private async handleInvoicePaid(invoice: Stripe.Invoice): Promise<WebhookResult> {
    const subscriptionId = typeof invoice.subscription === 'string'
      ? invoice.subscription
      : invoice.subscription?.id ?? null

    // Find internal subscription record
    let internalSubId: string | null = null
    if (subscriptionId) {
      const { data: sub } = await this.subRepo.findByStripeSubscriptionId(subscriptionId)
      if (sub) {
        internalSubId = sub.id
      }
    }

    await this.supabase.from('stripe_invoices').upsert(
      {
        stripe_invoice_id: invoice.id,
        subscription_id: internalSubId,
        stripe_customer_id: typeof invoice.customer === 'string'
          ? invoice.customer
          : invoice.customer?.id ?? '',
        amount_due: invoice.amount_due ?? 0,
        amount_paid: invoice.amount_paid ?? 0,
        amount_remaining: invoice.amount_remaining ?? 0,
        currency: invoice.currency ?? 'eur',
        status: invoice.status ?? 'draft',
        hosted_invoice_url: invoice.hosted_invoice_url ?? null,
        invoice_pdf: invoice.invoice_pdf ?? null,
        period_start: invoice.period_start
          ? new Date(invoice.period_start * 1000).toISOString()
          : null,
        period_end: invoice.period_end
          ? new Date(invoice.period_end * 1000).toISOString()
          : null,
        paid_at: invoice.status === 'paid' ? new Date().toISOString() : null,
      },
      { onConflict: 'stripe_invoice_id' },
    )

    return { status: 200, message: 'Invoice paid processed' }
  }

  private async handleInvoicePaymentFailed(invoice: Stripe.Invoice): Promise<WebhookResult> {
    const subscriptionId = typeof invoice.subscription === 'string'
      ? invoice.subscription
      : invoice.subscription?.id ?? null

    if (!subscriptionId) {
      return { status: 200, message: 'Payment failed for non-subscription invoice — ignored' }
    }

    const { data: sub } = await this.subRepo.findByStripeSubscriptionId(subscriptionId)
    if (!sub) {
      return { status: 200, message: 'Subscription not found for failed payment — no-op' }
    }

    // Only transition to past_due if currently active
    if (sub.status === 'active') {
      await this.subRepo.updateByTeamId(sub.team_id, {
        status: 'past_due',
      })
    }

    return { status: 200, message: 'Invoice payment failed processed' }
  }

  private async handleChargeRefunded(charge: Stripe.Charge): Promise<WebhookResult> {
    const refundAmount = charge.amount_refunded ?? 0
    const isFullRefund = refundAmount === charge.amount

    // Refund is tracked via idempotency insert (stripe_webhook_events).
    // activity_logs requires team_id/user_id which charge doesn't carry.
    // Billing UI queries stripe_invoices + Stripe API for refund details.

    return { status: 200, message: `Charge refunded (${isFullRefund ? 'full' : 'partial'}) processed` }
  }

  // ── AI Add-on Handlers ───────────────────────────────────────────────

  /**
   * Ensures AI is provisioned for a team (idempotent).
   * Called when an AI price item is detected on a subscription.
   */
  private async ensureAiProvisioned(teamId: string, subscriptionId: string, aiPriceId: string): Promise<void> {
    const tier = this.detectAiTier(aiPriceId)

    // Idempotence: check if already active
    const { data: existing } = await this.supabase
      .from('ai_phone_numbers')
      .select('id, is_active, provisioning_status')
      .eq('team_id', teamId)
      .limit(1)
      .maybeSingle()

    if (existing?.is_active && existing.provisioning_status === 'active') {
      // Already active — just update Stripe info
      await this.supabase
        .from('ai_phone_numbers')
        .update({
          stripe_ai_subscription_id: subscriptionId,
          stripe_ai_price_id: aiPriceId,
          ai_tier: tier,
          updated_at: new Date().toISOString(),
        })
        .eq('team_id', teamId)
      return
    }

    // If provisioning is in progress, just update Stripe info without re-triggering
    if (existing && !['pending', 'failed'].includes(existing.provisioning_status ?? 'pending')) {
      await this.supabase
        .from('ai_phone_numbers')
        .update({
          stripe_ai_subscription_id: subscriptionId,
          stripe_ai_price_id: aiPriceId,
          ai_tier: tier,
          updated_at: new Date().toISOString(),
        })
        .eq('team_id', teamId)
      return
    }

    // Trigger provisioning
    const { data: teamData } = await this.supabase
      .from('teams')
      .select('name')
      .eq('id', teamId)
      .single()

    try {
      const { provision } = await import('./ai-phone/phone-provisioning.service')
      await provision(teamId, teamData?.name ?? 'Equipe')

      await this.supabase
        .from('ai_phone_numbers')
        .update({
          stripe_ai_subscription_id: subscriptionId,
          stripe_ai_price_id: aiPriceId,
          ai_tier: tier,
        })
        .eq('team_id', teamId)

      logger.info({ teamId, tier }, '✅ [STRIPE-AI] Provisioning triggered via items detection')
    } catch (provisionError) {
      logger.error({ provisionError, teamId }, '❌ [STRIPE-AI] Provisioning failed')
    }
  }

  /**
   * Deprovisions AI if it was previously active but AI item is no longer on the subscription.
   */
  private async ensureAiDeprovisioned(teamId: string, subscriptionId: string): Promise<void> {
    const { data: config } = await this.supabase
      .from('ai_phone_numbers')
      .select('id, is_active, stripe_ai_subscription_id')
      .eq('team_id', teamId)
      .eq('is_active', true)
      .limit(1)
      .maybeSingle()

    // Only deprovision if the AI was on THIS subscription
    if (!config || config.stripe_ai_subscription_id !== subscriptionId) return

    try {
      const { deprovision } = await import('./ai-phone/phone-provisioning.service')
      await deprovision(teamId)
      logger.info({ teamId }, '✅ [STRIPE-AI] Deprovisioned via items detection (AI item removed)')
    } catch (deprovisionError) {
      logger.error({ deprovisionError, teamId }, '⚠️ [STRIPE-AI] Deprovisioning failed (non-blocking)')
    }
  }

  /**
   * Resolves team_id from an AI subscription's stripe_ai_subscription_id
   * (fallback when metadata is missing on updated/deleted events)
   */
  private async resolveAiTeamId(stripeSubscriptionId: string): Promise<string | null> {
    const { data } = await this.supabase
      .from('ai_phone_numbers')
      .select('team_id')
      .eq('stripe_ai_subscription_id', stripeSubscriptionId)
      .limit(1)
      .maybeSingle()
    return data?.team_id ?? null
  }

  /**
   * Detects AI tier from Stripe price ID
   */
  private detectAiTier(priceId: string): AiTier {
    return getTierFromPriceId(priceId) ?? 'solo'
  }

  private async handleAiCheckoutCompleted(
    session: Stripe.Checkout.Session,
    teamId: string,
  ): Promise<WebhookResult> {
    logger.info({ teamId }, '🤖 [STRIPE-AI] AI checkout completed')

    // Ensure customer mapping exists
    if (session.customer && typeof session.customer === 'string') {
      const { data: existing } = await this.custRepo.findByTeamId(teamId)
      if (!existing) {
        await this.custRepo.create({
          team_id: teamId,
          stripe_customer_id: session.customer,
          email: session.customer_email ?? null,
        })
      }
    }

    // Subscription sync happens via subscription.created webhook
    // The handleAiSubscriptionCreatedOrUpdated will trigger provisioning
    return { status: 200, message: 'AI checkout completed — awaiting subscription.created' }
  }

  private async handleAiSubscriptionCreatedOrUpdated(
    subscription: Stripe.Subscription,
    teamId: string,
  ): Promise<WebhookResult> {
    const item = subscription.items?.data?.[0]
    const priceId = item?.price?.id ?? ''
    const tier = this.detectAiTier(priceId)
    const isActive = subscription.status === 'active'

    logger.info(
      { teamId, tier, status: subscription.status, subscriptionId: subscription.id },
      '🤖 [STRIPE-AI] AI subscription created/updated'
    )

    // Update ai_phone_numbers with Stripe subscription info
    const { data: existingConfig } = await this.supabase
      .from('ai_phone_numbers')
      .select('id')
      .eq('team_id', teamId)
      .limit(1)
      .maybeSingle()

    if (existingConfig) {
      // Update existing config
      await this.supabase
        .from('ai_phone_numbers')
        .update({
          stripe_ai_subscription_id: subscription.id,
          stripe_ai_price_id: priceId,
          ai_tier: tier,
          is_active: isActive,
          updated_at: new Date().toISOString(),
        })
        .eq('team_id', teamId)
    } else if (isActive) {
      // New subscription — trigger provisioning
      // Get team name for agent creation
      const { data: teamData } = await this.supabase
        .from('teams')
        .select('name')
        .eq('id', teamId)
        .single()

      try {
        const { provision } = await import('./ai-phone/phone-provisioning.service')
        await provision(teamId, teamData?.name ?? 'Equipe')

        // Update with Stripe info after provisioning
        await this.supabase
          .from('ai_phone_numbers')
          .update({
            stripe_ai_subscription_id: subscription.id,
            stripe_ai_price_id: priceId,
            ai_tier: tier,
          })
          .eq('team_id', teamId)

        logger.info({ teamId, tier }, '✅ [STRIPE-AI] Provisioning triggered')
      } catch (provisionError) {
        logger.error({ provisionError, teamId }, '❌ [STRIPE-AI] Provisioning failed')
        // Don't fail the webhook — Stripe will retry
        return { status: 500, message: 'AI provisioning failed' }
      }
    }

    return { status: 200, message: `AI subscription ${subscription.status} processed (tier: ${tier})` }
  }

  private async handleAiSubscriptionDeleted(teamId: string): Promise<WebhookResult> {
    logger.info({ teamId }, '🤖 [STRIPE-AI] AI subscription deleted — deprovisioning')

    try {
      const { deprovision } = await import('./ai-phone/phone-provisioning.service')
      await deprovision(teamId)
      logger.info({ teamId }, '✅ [STRIPE-AI] Deprovisioning complete')
    } catch (deprovisionError) {
      logger.error({ deprovisionError, teamId }, '⚠️ [STRIPE-AI] Deprovisioning failed (non-blocking)')
    }

    return { status: 200, message: 'AI subscription deleted — deprovisioned' }
  }

  // ── Admin Notification Helper ────────────────────────────────────────

  /**
   * Get team admin details for admin notifications.
   * Returns null if no admin found.
   */
  private async getTeamAdminDetails(teamId: string): Promise<{
    firstName: string
    lastName: string
    email: string
    teamName: string
  } | null> {
    const [memberResult, teamResult] = await Promise.all([
      this.supabase
        .from('team_members')
        .select('user_id, users!inner(email, first_name, last_name, name)')
        .eq('team_id', teamId)
        .eq('role', 'admin')
        .is('left_at', null)
        .limit(1),
      this.supabase
        .from('teams')
        .select('name')
        .eq('id', teamId)
        .limit(1)
        .maybeSingle(),
    ])

    const member = memberResult.data?.[0]
    if (!member?.users?.email) return null

    const user = member.users as { email: string; first_name: string | null; last_name: string | null; name: string | null }
    return {
      firstName: user.first_name || user.name?.split(' ')[0] || 'Inconnu',
      lastName: user.last_name || user.name?.split(' ').slice(1).join(' ') || '',
      email: user.email,
      teamName: teamResult.data?.name || 'Equipe inconnue',
    }
  }

  /**
   * Send admin notification for subscription events. Non-blocking.
   */
  private async sendSubscriptionAdminNotification(
    type: 'change' | 'cancelled',
    teamId: string,
    oldLots: number,
    newLots: number,
    priceId: string | null,
    subscriptionStartDate?: string | null,
  ): Promise<void> {
    try {
      const admin = await this.getTeamAdminDetails(teamId)
      if (!admin) return

      const { createAdminNotificationService } = await import(
        './admin-notification/admin-notification.service'
      )
      const adminService = createAdminNotificationService(this.supabase)

      if (type === 'change') {
        await adminService.notifySubscriptionChange({
          teamId,
          teamName: admin.teamName,
          firstName: admin.firstName,
          lastName: admin.lastName,
          email: admin.email,
          oldLots,
          newLots,
          priceId,
        })
      } else {
        await adminService.notifySubscriptionCancelled({
          teamId,
          teamName: admin.teamName,
          firstName: admin.firstName,
          lastName: admin.lastName,
          email: admin.email,
          lotsLost: oldLots,
          priceId,
          subscriptionStartDate: subscriptionStartDate ?? null,
        })
      }
    } catch (error) {
      logger.error({ error, teamId, type }, '[WEBHOOK] Admin notification failed (non-blocking)')
    }
  }

  // ── Helpers ───────────────────────────────────────────────────────────

  // mapStripeStatus consolidated into SubscriptionService.mapStripeStatus()
}
