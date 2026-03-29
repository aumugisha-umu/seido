'use server'

import { z } from 'zod'
import { getServerActionAuthContextOrNull } from '@/lib/server-context'
import { createServiceRoleSupabaseClient } from '@/lib/services/core/supabase-client'
import { getStripe, STRIPE_AI_PRICES, STRIPE_PRICES, AI_TIER_CONFIG, isAiPrice, type AiTier, type BillingInterval } from '@/lib/stripe'
import { getBaseUrl } from '@/lib/utils/base-url'
import { logger } from '@/lib/logger'

const aiTierSchema = z.enum(['solo', 'equipe', 'agence'])
const billingIntervalSchema = z.enum(['month', 'year'])

// ============================================================================
// Types
// ============================================================================

interface ActionResult<T = void> {
  success: boolean
  data?: T
  error?: string
}

export interface AiSubscriptionInfo {
  isActive: boolean
  tier: AiTier | null
  phoneNumber: string | null
  minutesUsed: number
  minutesIncluded: number
  callsCount: number
  customInstructions: string | null
  autoTopup: boolean
  stripeSubscriptionId: string | null
  provisioningStatus: string | null
  provisioningError: string | null
  /** Main subscription status (trialing, active, free_tier, etc.) */
  subscriptionStatus: string | null
  /** Trial end date ISO string */
  trialEnd: string | null
  /** Billing interval of the existing Stripe subscription (month or year) */
  billingInterval: BillingInterval | null
}

// ============================================================================
// Server Actions
// ============================================================================

/**
 * Creates or adds an AI add-on subscription.
 * - Trial (no Stripe sub): Checkout Session with billing_cycle_anchor = trial end
 * - Active sub exists: stripe.subscriptions.update() to add AI item (no redirect)
 */
export async function createAiCheckoutAction(
  tier: AiTier,
  billingInterval?: BillingInterval
): Promise<ActionResult<{ url?: string; immediate?: boolean }>> {
  try {
    const tierParsed = aiTierSchema.safeParse(tier)
    if (!tierParsed.success) {
      return { success: false, error: 'Tier invalide' }
    }
    if (billingInterval) {
      const intervalParsed = billingIntervalSchema.safeParse(billingInterval)
      if (!intervalParsed.success) {
        return { success: false, error: 'Intervalle invalide' }
      }
    }

    const auth = await getServerActionAuthContextOrNull('gestionnaire')
    if (!auth) {
      return { success: false, error: 'Authentication required' }
    }

    const supabase = createServiceRoleSupabaseClient()

    // Double-click guard: check if AI already active
    const { data: existingAi } = await supabase
      .from('ai_phone_numbers')
      .select('id, is_active')
      .eq('team_id', auth.team.id)
      .eq('is_active', true)
      .limit(1)
      .maybeSingle()

    if (existingAi) {
      return { success: false, error: "L'assistant IA est deja actif" }
    }

    // Get or create Stripe customer
    const { createServiceRoleSubscriptionService } = await import('@/lib/services/domain/subscription-helpers')
    const subService = createServiceRoleSubscriptionService()
    const customerId = await subService.getOrCreateStripeCustomer(
      auth.team.id,
      auth.profile.email,
      auth.profile.name,
    )

    if (!customerId) {
      return { success: false, error: 'Failed to create Stripe customer' }
    }

    const stripe = getStripe()

    // Check for existing Stripe subscription (main or AI)
    const { SubscriptionRepository } = await import('@/lib/services/repositories/subscription.repository')
    const subRepo = new SubscriptionRepository(supabase)
    const { data: dbSub } = await subRepo.findByTeamId(auth.team.id)

    // ── Path A: Active Stripe subscription exists → add AI item directly ──
    if (dbSub?.stripe_subscription_id && dbSub.status === 'active') {
      const stripeSub = await stripe.subscriptions.retrieve(dbSub.stripe_subscription_id)

      // Double-click guard on Stripe side
      const existingAiItem = stripeSub.items.data.find(i => isAiPrice(i.price.id))
      if (existingAiItem) {
        return { success: false, error: "L'assistant IA est deja actif" }
      }

      // Unpaid invoice guard
      if (stripeSub.latest_invoice) {
        const invoiceId = typeof stripeSub.latest_invoice === 'string'
          ? stripeSub.latest_invoice
          : stripeSub.latest_invoice.id
        const invoice = await stripe.invoices.retrieve(invoiceId)
        if (invoice.status === 'open' || invoice.status === 'past_due') {
          return { success: false, error: 'Veuillez regler votre facture en cours avant de modifier votre abonnement.' }
        }
      }

      // Determine AI price: match existing sub interval (find main item, not AI)
      const mainItem = stripeSub.items.data.find(i => !isAiPrice(i.price.id))
      const subInterval = mainItem?.price?.recurring?.interval === 'month' ? 'month' : 'year'
      const aiPriceId = STRIPE_AI_PRICES[tier][subInterval as BillingInterval]
      if (!aiPriceId) {
        return { success: false, error: `Prix AI ${tier} (${subInterval}) non configure` }
      }

      await stripe.subscriptions.update(dbSub.stripe_subscription_id, {
        items: [{ price: aiPriceId, quantity: 1 }],
        proration_behavior: 'always_invoice',
      })

      // Trigger provisioning
      const { provision } = await import('@/lib/services/domain/ai-phone/phone-provisioning.service')
      await provision(auth.team.id, auth.team.name)

      // Store AI subscription info
      await supabase
        .from('ai_phone_numbers')
        .update({
          stripe_ai_subscription_id: dbSub.stripe_subscription_id,
          stripe_ai_price_id: aiPriceId,
          ai_tier: tier,
          updated_at: new Date().toISOString(),
        })
        .eq('team_id', auth.team.id)

      logger.info({ teamId: auth.team.id, tier, interval: subInterval }, '✅ [AI-CHECKOUT] AI item added to existing subscription')
      return { success: true, data: { immediate: true } }
    }

    // ── Path B: No active sub (trial or no sub) → Stripe Checkout ──
    const interval: BillingInterval = billingInterval ?? 'month'
    const aiPriceId = STRIPE_AI_PRICES[tier][interval]
    if (!aiPriceId) {
      return { success: false, error: `Prix AI ${tier} (${interval}) non configure` }
    }

    const baseUrl = getBaseUrl()

    // If trial active, set billing_cycle_anchor to trial end so first period aligns
    const checkoutParams: Parameters<typeof stripe.checkout.sessions.create>[0] = {
      customer: customerId,
      mode: 'subscription',
      metadata: {
        team_id: auth.team.id,
        addon_type: 'ai_voice',
        ai_tier: tier,
      },
      line_items: [{ price: aiPriceId, quantity: 1 }],
      subscription_data: {
        metadata: {
          team_id: auth.team.id,
          addon_type: 'ai_voice',
          ai_tier: tier,
        },
      },
      success_url: `${baseUrl}/gestionnaire/parametres/assistant-ia?checkout=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${baseUrl}/gestionnaire/parametres/assistant-ia?checkout=cancelled`,
    }

    // Align billing cycle to trial end if still trialing
    if (dbSub?.status === 'trialing' && dbSub.trial_end) {
      const trialEndTs = Math.floor(new Date(dbSub.trial_end).getTime() / 1000)
      if (trialEndTs > Math.floor(Date.now() / 1000)) {
        checkoutParams.subscription_data = {
          ...checkoutParams.subscription_data,
          billing_cycle_anchor: trialEndTs,
        }

        const trialEndDate = new Date(dbSub.trial_end).toLocaleDateString('fr-FR', {
          day: 'numeric', month: 'long', year: 'numeric',
        })
        checkoutParams.custom_text = {
          submit: {
            message: `Le premier mois sera facture au prorata. A la fin de votre essai (${trialEndDate}), l'assistant IA sera aligne sur votre abonnement lots. Si vous avez plus de 2 lots, votre essai sera converti en abonnement payant a cette date.`,
          },
        }
      }
    }

    const session = await stripe.checkout.sessions.create(checkoutParams)

    logger.info({ teamId: auth.team.id, tier, interval }, '🛒 [AI-CHECKOUT] Checkout session created')
    return { success: true, data: { url: session.url! } }
  } catch (error) {
    logger.error({ error }, '❌ [AI-CHECKOUT] Failed to create checkout session')
    return { success: false, error: 'Erreur lors de la creation de la session de paiement' }
  }
}

/**
 * Gets the current AI subscription status for the authenticated team.
 */
export async function getAiSubscriptionStatus(): Promise<ActionResult<AiSubscriptionInfo>> {
  try {
    const auth = await getServerActionAuthContextOrNull('gestionnaire')
    if (!auth) {
      return { success: false, error: 'Authentication required' }
    }

    const supabase = createServiceRoleSupabaseClient()

    // Fetch AI config
    const { data: config } = await supabase
      .from('ai_phone_numbers')
      .select('*')
      .eq('team_id', auth.team.id)
      .limit(1)
      .maybeSingle()

    // Fetch main subscription info (for trial status + billing interval)
    const { SubscriptionRepository } = await import('@/lib/services/repositories/subscription.repository')
    const subRepo = new SubscriptionRepository(supabase)
    const { data: dbSub } = await subRepo.findByTeamId(auth.team.id)

    // Derive billing interval from DB price_id (no Stripe API call needed)
    let billingInterval: BillingInterval | null = null
    if (dbSub?.price_id) {
      if (dbSub.price_id === STRIPE_PRICES.monthly) billingInterval = 'month'
      else if (dbSub.price_id === STRIPE_PRICES.annual) billingInterval = 'year'
    }

    if (!config || !config.is_active) {
      return {
        success: true,
        data: {
          isActive: false,
          tier: null,
          phoneNumber: null,
          minutesUsed: 0,
          minutesIncluded: 0,
          callsCount: 0,
          customInstructions: null,
          autoTopup: false,
          stripeSubscriptionId: null,
          provisioningStatus: config?.provisioning_status ?? null,
          provisioningError: config?.provisioning_error ?? null,
          subscriptionStatus: dbSub?.status ?? null,
          trialEnd: dbSub?.trial_end ?? null,
          billingInterval,
        },
      }
    }

    // Fetch current month usage
    const currentMonth = new Date().toISOString().slice(0, 7) + '-01'
    const { data: usage } = await supabase
      .from('ai_phone_usage')
      .select('minutes_used, calls_count')
      .eq('team_id', auth.team.id)
      .eq('month', currentMonth)
      .limit(1)
      .maybeSingle()

    const tier = aiTierSchema.catch('solo').parse(config.ai_tier)
    const tierConfig = AI_TIER_CONFIG[tier]

    return {
      success: true,
      data: {
        isActive: true,
        tier,
        phoneNumber: config.whatsapp_number ?? config.phone_number,
        minutesUsed: Number(usage?.minutes_used ?? 0),
        minutesIncluded: tierConfig.minutes,
        callsCount: usage?.calls_count ?? 0,
        customInstructions: config.custom_instructions,
        autoTopup: config.auto_topup,
        stripeSubscriptionId: config.stripe_ai_subscription_id,
        provisioningStatus: config.provisioning_status ?? null,
        provisioningError: config.provisioning_error ?? null,
        subscriptionStatus: dbSub?.status ?? null,
        trialEnd: dbSub?.trial_end ?? null,
        billingInterval,
      },
    }
  } catch (error) {
    logger.error({ error }, '❌ [AI-STATUS] Failed to get AI subscription status')
    return { success: false, error: 'Erreur lors de la recuperation du statut' }
  }
}

/**
 * Previews prorated amount for adding AI add-on to an existing subscription.
 */
export async function previewAiAddonAction(
  tier: AiTier
): Promise<ActionResult<{ prorationAmount: number; currency: string; interval: string }>> {
  try {
    const tierParsed = aiTierSchema.safeParse(tier)
    if (!tierParsed.success) {
      return { success: false, error: 'Tier invalide' }
    }

    const auth = await getServerActionAuthContextOrNull('gestionnaire')
    if (!auth) {
      return { success: false, error: 'Authentication required' }
    }

    const supabase = createServiceRoleSupabaseClient()
    const { SubscriptionRepository } = await import('@/lib/services/repositories/subscription.repository')
    const subRepo = new SubscriptionRepository(supabase)
    const { data: dbSub } = await subRepo.findByTeamId(auth.team.id)

    if (!dbSub?.stripe_subscription_id) {
      return { success: false, error: 'Aucun abonnement actif' }
    }

    const stripe = getStripe()
    const stripeSub = await stripe.subscriptions.retrieve(dbSub.stripe_subscription_id)
    const mainItem = stripeSub.items.data.find(i => !isAiPrice(i.price.id))
    const subInterval = mainItem?.price?.recurring?.interval === 'month' ? 'month' : 'year'
    const aiPriceId = STRIPE_AI_PRICES[tier][subInterval as BillingInterval]

    if (!aiPriceId) {
      return { success: false, error: `Prix AI ${tier} (${subInterval}) non configure` }
    }

    const preview = await stripe.invoices.createPreview({
      customer: stripeSub.customer as string,
      subscription: dbSub.stripe_subscription_id,
      subscription_items: [
        ...stripeSub.items.data.map(i => ({ id: i.id })),
        { price: aiPriceId, quantity: 1 },
      ],
      subscription_proration_behavior: 'always_invoice',
    })

    return {
      success: true,
      data: {
        prorationAmount: preview.amount_due,
        currency: preview.currency,
        interval: subInterval,
      },
    }
  } catch (error) {
    logger.error({ error }, '❌ [AI-PREVIEW] Failed to preview AI add-on')
    return { success: false, error: 'Erreur lors de la previsualisation' }
  }
}

/**
 * Removes the AI add-on from the subscription with prorated credit.
 */
export async function removeAiAddonAction(): Promise<ActionResult> {
  try {
    const auth = await getServerActionAuthContextOrNull('gestionnaire')
    if (!auth) {
      return { success: false, error: 'Authentication required' }
    }

    const supabase = createServiceRoleSupabaseClient()

    // Find the AI phone config to get subscription info
    const { data: config } = await supabase
      .from('ai_phone_numbers')
      .select('stripe_ai_subscription_id')
      .eq('team_id', auth.team.id)
      .eq('is_active', true)
      .limit(1)
      .maybeSingle()

    if (!config?.stripe_ai_subscription_id) {
      return { success: false, error: 'Aucun assistant IA actif' }
    }

    const stripe = getStripe()
    const stripeSub = await stripe.subscriptions.retrieve(config.stripe_ai_subscription_id)

    // Find the AI item on the subscription
    const aiItem = stripeSub.items.data.find(i => isAiPrice(i.price.id))
    if (!aiItem) {
      return { success: false, error: "L'assistant IA n'est pas actif sur cet abonnement" }
    }

    // Immediate cancellation, no proration refund (even for annual plans)
    if (stripeSub.items.data.length === 1) {
      // Only AI item → cancel subscription immediately, no proration
      await stripe.subscriptions.cancel(stripeSub.id, {
        prorate: false,
      })
    } else {
      // Multi-item → remove AI item immediately, no proration credit
      await stripe.subscriptionItems.del(aiItem.id, {
        proration_behavior: 'none',
      })
    }

    // Deprovision immediately in both cases
    const { deprovision } = await import('@/lib/services/domain/ai-phone/phone-provisioning.service')
    await deprovision(auth.team.id)

    logger.info({ teamId: auth.team.id }, '✅ [AI-REMOVE] AI add-on removed')
    return { success: true }
  } catch (error) {
    logger.error({ error }, '❌ [AI-REMOVE] Failed to remove AI add-on')
    return { success: false, error: "Erreur lors de la resiliation de l'assistant IA" }
  }
}

/**
 * Updates custom instructions for the AI agent.
 */
export async function updateAiCustomInstructionsAction(
  instructions: string
): Promise<ActionResult> {
  try {
    const auth = await getServerActionAuthContextOrNull('gestionnaire')
    if (!auth) {
      return { success: false, error: 'Authentication required' }
    }

    if (instructions.length > 500) {
      return { success: false, error: 'Les instructions ne peuvent pas depasser 500 caracteres' }
    }

    const { updateCustomInstructions } = await import('@/lib/services/domain/ai-phone/phone-provisioning.service')
    await updateCustomInstructions(auth.team.id, instructions)

    return { success: true }
  } catch (error) {
    logger.error({ error }, '❌ [AI-INSTRUCTIONS] Failed to update custom instructions')
    return { success: false, error: 'Erreur lors de la mise a jour des instructions' }
  }
}

/**
 * Toggles auto-topup setting.
 */
export async function toggleAiAutoTopupAction(
  enabled: boolean
): Promise<ActionResult> {
  try {
    const auth = await getServerActionAuthContextOrNull('gestionnaire')
    if (!auth) {
      return { success: false, error: 'Authentication required' }
    }

    const supabase = createServiceRoleSupabaseClient()
    await supabase
      .from('ai_phone_numbers')
      .update({ auto_topup: enabled, updated_at: new Date().toISOString() })
      .eq('team_id', auth.team.id)

    return { success: true }
  } catch (error) {
    logger.error({ error }, '❌ [AI-TOPUP] Failed to toggle auto-topup')
    return { success: false, error: 'Erreur lors de la mise a jour' }
  }
}

/**
 * Creates a one-time invoice for minute top-up.
 */
export async function createAiTopupAction(): Promise<ActionResult<{ url: string }>> {
  try {
    const auth = await getServerActionAuthContextOrNull('gestionnaire')
    if (!auth) {
      return { success: false, error: 'Authentication required' }
    }

    const supabase = createServiceRoleSupabaseClient()
    const { data: config } = await supabase
      .from('ai_phone_numbers')
      .select('ai_tier, stripe_ai_subscription_id')
      .eq('team_id', auth.team.id)
      .eq('is_active', true)
      .limit(1)
      .maybeSingle()

    if (!config) {
      return { success: false, error: 'Aucun assistant IA actif' }
    }

    const tier = aiTierSchema.catch('solo').parse(config.ai_tier)
    const tierConfig = AI_TIER_CONFIG[tier]

    // Get Stripe customer
    const { createServiceRoleSubscriptionService } = await import('@/lib/services/domain/subscription-helpers')
    const subService = createServiceRoleSubscriptionService()
    const customerId = await subService.getOrCreateStripeCustomer(
      auth.team.id,
      auth.profile.email,
      auth.profile.name,
    )

    if (!customerId) {
      return { success: false, error: 'Failed to get Stripe customer' }
    }

    const stripe = getStripe()
    const baseUrl = getBaseUrl()

    // Create one-time checkout for top-up
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: 'payment',
      metadata: {
        team_id: auth.team.id,
        addon_type: 'ai_voice_topup',
        topup_minutes: String(tierConfig.topupMinutes),
      },
      line_items: [{
        price_data: {
          currency: 'eur',
          unit_amount: tierConfig.topupPrice,
          product_data: {
            name: `Recharge ${tierConfig.topupMinutes} minutes — Assistant IA`,
            description: `Pack de ${tierConfig.topupMinutes} minutes supplementaires pour l'assistant IA`,
          },
        },
        quantity: 1,
      }],
      success_url: `${baseUrl}/gestionnaire/parametres/assistant-ia?topup=success`,
      cancel_url: `${baseUrl}/gestionnaire/parametres/assistant-ia?topup=cancelled`,
    })

    return { success: true, data: { url: session.url! } }
  } catch (error) {
    logger.error({ error }, '❌ [AI-TOPUP] Failed to create top-up session')
    return { success: false, error: 'Erreur lors de la creation de la recharge' }
  }
}

/**
 * Verifies a Stripe checkout session and triggers provisioning.
 * This is the webhook fallback — in local dev, webhooks don't fire
 * unless Stripe CLI is running. This ensures provisioning happens
 * immediately after checkout success redirect.
 */
export async function verifyAiCheckoutSession(
  sessionId: string
): Promise<ActionResult<{ verified: boolean; phoneNumber?: string }>> {
  try {
    logger.info({ sessionId }, '🔍 [AI-VERIFY] Starting checkout session verification')

    const auth = await getServerActionAuthContextOrNull('gestionnaire')
    if (!auth) {
      logger.warn('🔍 [AI-VERIFY] Auth failed — returning early')
      return { success: false, error: 'Authentication required' }
    }

    logger.info({ teamId: auth.team.id }, '🔍 [AI-VERIFY] Auth OK, retrieving Stripe session')

    const stripe = getStripe()
    const session = await stripe.checkout.sessions.retrieve(sessionId, {
      expand: ['subscription'],
    })

    logger.info({
      teamId: auth.team.id,
      sessionTeamId: session.metadata?.team_id,
      addonType: session.metadata?.addon_type,
      paymentStatus: session.payment_status,
    }, '🔍 [AI-VERIFY] Session retrieved — checking metadata')

    // Verify this session belongs to the authenticated team
    if (session.metadata?.team_id !== auth.team.id) {
      logger.warn({ sessionMetadata: session.metadata, expectedTeamId: auth.team.id },
        '⚠️ [AI-VERIFY] team_id mismatch')
      return { success: false, error: 'Session does not belong to your team' }
    }

    // Verify it's an AI add-on checkout
    if (session.metadata?.addon_type !== 'ai_voice') {
      logger.warn({ addonType: session.metadata?.addon_type }, '⚠️ [AI-VERIFY] Not an AI voice checkout')
      return { success: false, error: 'This checkout is not for AI assistant' }
    }

    // Verify payment completed
    if (session.payment_status !== 'paid') {
      logger.warn({ paymentStatus: session.payment_status }, '⚠️ [AI-VERIFY] Payment not completed')
      return { success: false, error: `Payment status: ${session.payment_status}` }
    }

    const tier = aiTierSchema.catch('solo').parse(session.metadata?.ai_tier)
    const subscription = session.subscription as import('stripe').default.Subscription | null
    const aiPriceId = subscription?.items?.data?.find(i => isAiPrice(i.price.id))?.price?.id ?? null

    logger.info({ teamId: auth.team.id, tier, subscriptionId: subscription?.id },
      '✅ [AI-VERIFY] Checkout verified — syncing subscription')

    const supabase = createServiceRoleSupabaseClient()

    // Ensure customer mapping exists
    const customerId = typeof session.customer === 'string'
      ? session.customer
      : null
    if (customerId) {
      const { StripeCustomerRepository } = await import('@/lib/services/repositories/stripe-customer.repository')
      const custRepo = new StripeCustomerRepository(supabase)
      const { data: existingCust } = await custRepo.findByTeamId(auth.team.id)
      if (!existingCust) {
        await custRepo.create({
          team_id: auth.team.id,
          stripe_customer_id: customerId,
          email: session.customer_email ?? auth.profile.email,
        })
      }
    }

    // Check if already provisioned or in progress (idempotent)
    const { data: existingConfig } = await supabase
      .from('ai_phone_numbers')
      .select('id, phone_number, whatsapp_number, is_active, provisioning_status')
      .eq('team_id', auth.team.id)
      .limit(1)
      .maybeSingle()

    if (existingConfig?.is_active && existingConfig.provisioning_status === 'active') {
      // Already fully provisioned — just update Stripe info
      await supabase
        .from('ai_phone_numbers')
        .update({
          stripe_ai_subscription_id: subscription?.id ?? null,
          stripe_ai_price_id: aiPriceId,
          ai_tier: tier,
          updated_at: new Date().toISOString(),
        })
        .eq('team_id', auth.team.id)

      logger.info({ teamId: auth.team.id }, '✅ [AI-VERIFY] Already provisioned — updated Stripe info')
      return { success: true, data: { verified: true, phoneNumber: existingConfig.whatsapp_number ?? existingConfig.phone_number } }
    }

    // If provisioning is already in progress (purchasing), don't re-trigger
    if (existingConfig && !['pending', 'failed'].includes(existingConfig.provisioning_status ?? 'pending')) {
      logger.info(
        { teamId: auth.team.id, status: existingConfig.provisioning_status },
        '⏭️ [AI-VERIFY] Provisioning already in progress'
      )
      return { success: true, data: { verified: false } }
    }

    // Trigger provisioning (buys Twilio number → active)
    const { provision } = await import('@/lib/services/domain/ai-phone/phone-provisioning.service')
    const provisionResult = await provision(auth.team.id, auth.team.name)

    // Update with Stripe subscription info
    await supabase
      .from('ai_phone_numbers')
      .update({
        stripe_ai_subscription_id: subscription?.id ?? null,
        stripe_ai_price_id: aiPriceId,
        ai_tier: tier,
        updated_at: new Date().toISOString(),
      })
      .eq('team_id', auth.team.id)

    const isFullyProvisioned = provisionResult.provisioningStatus === 'active'

    logger.info(
      { teamId: auth.team.id, phoneNumber: provisionResult.phoneNumber, status: provisionResult.provisioningStatus },
      `[AI-VERIFY] Provisioning ${isFullyProvisioned ? 'complete' : 'started'}`
    )

    return {
      success: true,
      data: { verified: isFullyProvisioned, phoneNumber: provisionResult.phoneNumber || undefined },
    }
  } catch (error) {
    logger.error({ error }, '❌ [AI-VERIFY] Verification/provisioning failed')
    const message = error instanceof Error ? error.message : 'Erreur lors de la verification'
    return { success: false, error: message }
  }
}

/**
 * Polls the provisioning status for the authenticated team.
 * Used by the UI to detect when async provisioning completes.
 */
export async function getProvisioningStatus(): Promise<ActionResult<{
  status: string
  phoneNumber: string | null
  error: string | null
}>> {
  try {
    const auth = await getServerActionAuthContextOrNull('gestionnaire')
    if (!auth) {
      return { success: false, error: 'Authentication required' }
    }

    const supabase = createServiceRoleSupabaseClient()
    const { data } = await supabase
      .from('ai_phone_numbers')
      .select('provisioning_status, whatsapp_number, phone_number, provisioning_error')
      .eq('team_id', auth.team.id)
      .limit(1)
      .maybeSingle()

    return {
      success: true,
      data: {
        status: data?.provisioning_status ?? 'pending',
        phoneNumber: data?.whatsapp_number ?? data?.phone_number ?? null,
        error: data?.provisioning_error ?? null,
      },
    }
  } catch (error) {
    logger.error({ error }, '❌ [AI-STATUS] Failed to get provisioning status')
    return { success: false, error: 'Erreur lors de la recuperation du statut' }
  }
}
