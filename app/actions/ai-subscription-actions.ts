'use server'

import { getServerActionAuthContextOrNull } from '@/lib/server-context'
import { createServiceRoleSupabaseClient } from '@/lib/services/core/supabase-client'
import { getStripe, STRIPE_AI_PRICES, AI_TIER_CONFIG, type AiTier } from '@/lib/stripe'
import { logger } from '@/lib/logger'

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
}

// ============================================================================
// Server Actions
// ============================================================================

/**
 * Creates a Stripe checkout session for an AI add-on subscription.
 */
export async function createAiCheckoutAction(
  tier: AiTier
): Promise<ActionResult<{ url: string }>> {
  try {
    const auth = await getServerActionAuthContextOrNull('gestionnaire')
    if (!auth) {
      return { success: false, error: 'Authentication required' }
    }

    const priceId = STRIPE_AI_PRICES[tier]
    if (!priceId) {
      return { success: false, error: `STRIPE_PRICE_AI_${tier.toUpperCase()} env var is not set` }
    }

    // Check if team already has an active AI subscription
    const supabase = createServiceRoleSupabaseClient()
    const { data: existing } = await supabase
      .from('ai_phone_numbers')
      .select('id, is_active')
      .eq('team_id', auth.team.id)
      .eq('is_active', true)
      .limit(1)
      .maybeSingle()

    if (existing) {
      return { success: false, error: 'Votre equipe a deja un assistant IA actif' }
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

    const baseUrl = (process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000').replace(/\/+$/, '')
    const stripe = getStripe()

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: 'subscription',
      metadata: {
        team_id: auth.team.id,
        addon_type: 'ai_voice',
        ai_tier: tier,
      },
      line_items: [{ price: priceId, quantity: 1 }],
      subscription_data: {
        metadata: {
          team_id: auth.team.id,
          addon_type: 'ai_voice',
          ai_tier: tier,
        },
      },
      success_url: `${baseUrl}/gestionnaire/parametres/assistant-ia?checkout=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${baseUrl}/gestionnaire/parametres/assistant-ia?checkout=cancelled`,
    })

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

    const tier = (config.ai_tier as AiTier) || 'solo'
    const tierConfig = AI_TIER_CONFIG[tier]

    return {
      success: true,
      data: {
        isActive: true,
        tier,
        phoneNumber: config.phone_number,
        minutesUsed: Number(usage?.minutes_used ?? 0),
        minutesIncluded: tierConfig.minutes,
        callsCount: usage?.calls_count ?? 0,
        customInstructions: config.custom_instructions,
        autoTopup: config.auto_topup,
        stripeSubscriptionId: config.stripe_ai_subscription_id,
      },
    }
  } catch (error) {
    logger.error({ error }, '❌ [AI-STATUS] Failed to get AI subscription status')
    return { success: false, error: 'Erreur lors de la recuperation du statut' }
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
    await updateCustomInstructions(auth.team.id, auth.team.name, instructions)

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

    const tier = (config.ai_tier as AiTier) || 'solo'
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
    const baseUrl = (process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000').replace(/\/+$/, '')

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

    const tier = (session.metadata?.ai_tier as AiTier) || 'solo'
    const subscription = session.subscription as import('stripe').default.Subscription | null

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

    // Check if already provisioned (idempotent)
    const { data: existingConfig } = await supabase
      .from('ai_phone_numbers')
      .select('id, phone_number, is_active')
      .eq('team_id', auth.team.id)
      .limit(1)
      .maybeSingle()

    if (existingConfig?.is_active) {
      // Already provisioned — just update Stripe info
      await supabase
        .from('ai_phone_numbers')
        .update({
          stripe_ai_subscription_id: subscription?.id ?? null,
          stripe_ai_price_id: subscription?.items?.data?.[0]?.price?.id ?? null,
          ai_tier: tier,
          updated_at: new Date().toISOString(),
        })
        .eq('team_id', auth.team.id)

      logger.info({ teamId: auth.team.id }, '✅ [AI-VERIFY] Already provisioned — updated Stripe info')
      return { success: true, data: { verified: true, phoneNumber: existingConfig.phone_number } }
    }

    // Trigger provisioning
    const { provision } = await import('@/lib/services/domain/ai-phone/phone-provisioning.service')
    const provisionResult = await provision(auth.team.id, auth.team.name)

    // Update with Stripe subscription info
    await supabase
      .from('ai_phone_numbers')
      .update({
        stripe_ai_subscription_id: subscription?.id ?? null,
        stripe_ai_price_id: subscription?.items?.data?.[0]?.price?.id ?? null,
        ai_tier: tier,
        updated_at: new Date().toISOString(),
      })
      .eq('team_id', auth.team.id)

    logger.info(
      { teamId: auth.team.id, phoneNumber: provisionResult.phoneNumber },
      '✅ [AI-VERIFY] Provisioning complete'
    )

    return {
      success: true,
      data: { verified: true, phoneNumber: provisionResult.phoneNumber },
    }
  } catch (error) {
    logger.error({ error }, '❌ [AI-VERIFY] Verification/provisioning failed')
    const message = error instanceof Error ? error.message : 'Erreur lors de la verification'
    return { success: false, error: message }
  }
}
