'use server'

/**
 * Subscription Server Actions
 * Server-side operations for Stripe subscription management.
 * All actions require gestionnaire role authentication.
 */

import { getServerActionAuthContextOrNull } from '@/lib/server-context'
import { SubscriptionRepository } from '@/lib/services/repositories/subscription.repository'
import { StripeCustomerRepository } from '@/lib/services/repositories/stripe-customer.repository'
import { createServiceRoleSupabaseClient } from '@/lib/services/core/supabase-client'
import {
  createSubscriptionService,
  createServiceRoleSubscriptionService,
} from '@/lib/services/domain/subscription-helpers'
import { getStripe, STRIPE_PRICES } from '@/lib/stripe'
import { SubscriptionService, type SubscriptionInfo, type UpgradePreview, type CanAddPropertyResult, type AccessibleLotIds } from '@/lib/services/domain/subscription.service'
import { logger } from '@/lib/logger'

// =============================================================================
// Onboarding Progress Types
// =============================================================================

export interface OnboardingProgress {
  hasLot: boolean
  hasContact: boolean
  hasContract: boolean
  hasIntervention: boolean
  hasClosedIntervention: boolean
  hasEmail: boolean
  hasImportedData: boolean
}

// =============================================================================
// Types
// =============================================================================

interface ActionResult<T = unknown> {
  success: boolean
  data?: T
  error?: string
}

// =============================================================================
// Helpers
// =============================================================================

function getBaseUrl(): string {
  const url = process.env.NEXT_PUBLIC_SITE_URL
    || process.env.NEXT_PUBLIC_APP_URL
    || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null)
    || 'http://localhost:3000'
  return url.replace(/\/+$/, '')
}

// =============================================================================
// Actions
// =============================================================================

export async function getSubscriptionStatus(): Promise<ActionResult<SubscriptionInfo | null>> {
  try {
    const auth = await getServerActionAuthContextOrNull('gestionnaire')
    if (!auth) {
      return { success: false, error: 'Authentication required' }
    }

    const serviceRoleClient = createServiceRoleSupabaseClient()
    const serviceRoleRepo = new SubscriptionRepository(serviceRoleClient)
    const service = createSubscriptionService(auth.supabase)

    // Pass service_role repo for lazy sync writes (user client can only SELECT)
    let data = await service.getSubscriptionInfo(auth.team.id, serviceRoleRepo)

    // Fallback: if no subscription exists (deleted row, missed trigger, etc.),
    // recreate a free_tier subscription so the app doesn't break
    if (!data) {
      logger.warn('[SUBSCRIPTION-ACTION] No subscription found for team — creating fallback free_tier', {
        teamId: auth.team.id,
      })
      const { error: insertError } = await serviceRoleRepo.create({
        team_id: auth.team.id,
        status: 'trialing',
        trial_start: new Date().toISOString(),
        trial_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        billable_properties: 0,
        subscribed_lots: 0,
      })
      if (insertError) {
        logger.error('[SUBSCRIPTION-ACTION] Fallback subscription creation failed:', {
          teamId: auth.team.id,
          error: insertError,
        })
      } else {
        // Re-fetch after creation
        data = await service.getSubscriptionInfo(auth.team.id, serviceRoleRepo)
      }
    }

    return { success: true, data }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    logger.error('[SUBSCRIPTION-ACTION] getSubscriptionStatus error:', message)
    return { success: false, error: message }
  }
}

export async function getAccessibleLots(): Promise<ActionResult<AccessibleLotIds>> {
  try {
    const auth = await getServerActionAuthContextOrNull('gestionnaire')
    if (!auth) {
      return { success: false, error: 'Authentication required' }
    }

    const service = createSubscriptionService(auth.supabase)
    const serviceRoleRepo = new SubscriptionRepository(createServiceRoleSupabaseClient())
    const subscriptionInfo = await service.getSubscriptionInfo(auth.team.id, serviceRoleRepo)

    if (!subscriptionInfo) {
      return { success: true, data: null }
    }

    const data = await service.getAccessibleLotIds(auth.team.id, subscriptionInfo, auth.supabase)
    return { success: true, data }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    logger.error('[SUBSCRIPTION-ACTION] getAccessibleLots error:', message)
    return { success: false, error: message }
  }
}

export async function checkCanAddProperty(): Promise<ActionResult<CanAddPropertyResult>> {
  try {
    const auth = await getServerActionAuthContextOrNull('gestionnaire')
    if (!auth) {
      return { success: false, error: 'Authentication required' }
    }

    const service = createSubscriptionService(auth.supabase)
    const data = await service.canAddProperty(auth.team.id)

    return { success: true, data }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    logger.error('[SUBSCRIPTION-ACTION] checkCanAddProperty error:', message)
    return { success: false, error: message }
  }
}

export async function checkHasPaymentMethod(): Promise<ActionResult<boolean>> {
  try {
    const auth = await getServerActionAuthContextOrNull('gestionnaire')
    if (!auth) {
      return { success: false, error: 'Authentication required' }
    }

    // Use service_role — reads stripe_customers (RLS SELECT requires admin role)
    const service = createServiceRoleSubscriptionService()
    const data = await service.hasPaymentMethod(auth.team.id)

    return { success: true, data }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    logger.error('[SUBSCRIPTION-ACTION] checkHasPaymentMethod error:', message)
    return { success: false, error: message }
  }
}

export async function isReadOnlyMode(): Promise<ActionResult<boolean>> {
  try {
    const auth = await getServerActionAuthContextOrNull('gestionnaire')
    if (!auth) {
      return { success: false, error: 'Authentication required' }
    }

    const service = createSubscriptionService(auth.supabase)
    const data = await service.isReadOnlyMode(auth.team.id)

    return { success: true, data }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    logger.error('[SUBSCRIPTION-ACTION] isReadOnlyMode error:', message)
    return { success: false, error: message }
  }
}

export async function createCheckoutSessionAction(params: {
  interval?: 'annual' | 'monthly'
  quantity: number
}): Promise<ActionResult<{ url: string }>> {
  try {
    const auth = await getServerActionAuthContextOrNull('gestionnaire')
    if (!auth) {
      return { success: false, error: 'Authentication required' }
    }

    // Use service_role client — RLS on stripe_customers only allows SELECT for authenticated
    const service = createServiceRoleSubscriptionService()
    const { interval = 'annual', quantity } = params
    const priceId = interval === 'monthly' ? STRIPE_PRICES.monthly : STRIPE_PRICES.annual

    if (!priceId) {
      return { success: false, error: `STRIPE_PRICE_${interval === 'monthly' ? 'MONTHLY' : 'ANNUAL'} env var is not set` }
    }

    // Ensure customer exists in Stripe
    const customerId = await service.getOrCreateStripeCustomer(
      auth.team.id,
      auth.profile.email,
      auth.profile.name,
    )

    if (!customerId) {
      return { success: false, error: 'Failed to create Stripe customer' }
    }

    // If user is trialing, pass trial_end so Stripe shows "0 EUR today"
    // and doesn't charge until trial expires
    const subRepo = new SubscriptionRepository(createServiceRoleSupabaseClient())
    const { data: sub } = await subRepo.findByTeamId(auth.team.id)
    let trialEnd: number | undefined
    if (sub?.status === 'trialing' && sub.trial_end) {
      const trialEndTs = Math.floor(new Date(sub.trial_end).getTime() / 1000)
      // Only pass if trial_end is in the future
      if (trialEndTs > Math.floor(Date.now() / 1000)) {
        trialEnd = trialEndTs
      }
    }

    const baseUrl = getBaseUrl()
    const session = await service.createCheckoutSession({
      teamId: auth.team.id,
      customerId,
      priceId,
      quantity,
      trialEnd,
      successUrl: `${baseUrl}/gestionnaire/settings/billing?checkout=success&session_id={CHECKOUT_SESSION_ID}`,
      cancelUrl: `${baseUrl}/gestionnaire/settings/billing?checkout=cancelled`,
    })

    return { success: true, data: { url: session.url! } }
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error)
    logger.error('[CHECKOUT] createCheckoutSession error:', message)
    return { success: false, error: message }
  }
}

export async function upgradeSubscription(
  additionalLots: number,
): Promise<ActionResult<{ success: boolean; invoice_amount?: number }>> {
  try {
    const auth = await getServerActionAuthContextOrNull('gestionnaire')
    if (!auth) {
      return { success: false, error: 'Authentication required' }
    }

    // Use service_role — upgrade modifies subscription records
    const service = createServiceRoleSubscriptionService()
    const data = await service.upgradeSubscriptionDirect(auth.team.id, additionalLots)

    return { success: true, data }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    logger.error('[SUBSCRIPTION-ACTION] upgradeSubscription error:', message)
    return { success: false, error: message }
  }
}

export async function getUpgradePreview(
  additionalLots: number,
): Promise<ActionResult<UpgradePreview>> {
  try {
    const auth = await getServerActionAuthContextOrNull('gestionnaire')
    if (!auth) {
      return { success: false, error: 'Authentication required' }
    }

    // Use service_role — reads stripe_customers + subscriptions
    const service = createServiceRoleSubscriptionService()
    const data = await service.previewUpgrade(auth.team.id, additionalLots)

    return { success: true, data }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    logger.error('[SUBSCRIPTION-ACTION] getUpgradePreview error:', message)
    return { success: false, error: message }
  }
}

export async function createPortalSessionAction(): Promise<ActionResult<{ url: string }>> {
  try {
    const auth = await getServerActionAuthContextOrNull('gestionnaire')
    if (!auth) {
      return { success: false, error: 'Authentication required' }
    }

    // Use service_role — portal session reads stripe_customers (RLS SELECT requires admin role)
    const service = createServiceRoleSubscriptionService()
    const baseUrl = getBaseUrl()
    const session = await service.createPortalSession(
      auth.team.id,
      `${baseUrl}/gestionnaire/settings/billing`,
    )

    return { success: true, data: { url: session.url } }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    logger.error('[SUBSCRIPTION-ACTION] createPortalSession error:', message)
    return { success: false, error: message }
  }
}

export async function verifyCheckoutSession(
  sessionId: string,
): Promise<ActionResult<{ verified: boolean; subscription_status?: string }>> {
  try {
    const auth = await getServerActionAuthContextOrNull('gestionnaire')
    if (!auth) {
      return { success: false, error: 'Authentication required' }
    }

    const stripe = getStripe()
    const session = await stripe.checkout.sessions.retrieve(sessionId, {
      expand: ['subscription'],
    })

    // Verify this session belongs to the authenticated team
    if (session.metadata?.team_id !== auth.team.id) {
      logger.warn('[VERIFY-CHECKOUT] team_id mismatch — session.metadata:', {
        sessionMetadata: session.metadata,
        expectedTeamId: auth.team.id,
      })
      return { success: true, data: { verified: false } }
    }

    // Verify payment completed
    // 'paid' = normal checkout, 'no_payment_required' = trial with 0 EUR
    if (session.payment_status !== 'paid' && session.payment_status !== 'no_payment_required') {
      return { success: true, data: { verified: false } }
    }

    // ── Sync subscription to DB (fallback for missing webhooks) ──────
    // In local dev, Stripe webhooks don't reach localhost unless Stripe CLI
    // is running. This ensures the subscription is written to DB immediately
    // after a successful checkout, regardless of webhook delivery.
    const subscription = session.subscription as import('stripe').default.Subscription | null
    if (subscription?.id) {
      const item = subscription.items?.data?.[0]
      const quantity = item?.quantity ?? 0

      const serviceClient = createServiceRoleSupabaseClient()
      const subRepo = new SubscriptionRepository(serviceClient)
      const custRepo = new StripeCustomerRepository(serviceClient)

      // Ensure customer mapping exists
      const customerId = typeof subscription.customer === 'string'
        ? subscription.customer
        : (subscription.customer as { id: string })?.id
      if (customerId) {
        const { data: existingCust } = await custRepo.findByTeamId(auth.team.id)
        if (!existingCust) {
          await custRepo.create({
            team_id: auth.team.id,
            stripe_customer_id: customerId,
            email: session.customer_email ?? auth.profile.email,
          })
        }
      }

      // Map Stripe status to DB status (single source of truth)
      const dbStatus = SubscriptionService.mapStripeStatus(subscription.status)

      // Stripe API: current_period_start/end are on the subscription item (items.data[0]), not always on subscription root.
      const itemPeriodStart = (item as { current_period_start?: number } | undefined)?.current_period_start
      const itemPeriodEnd = (item as { current_period_end?: number } | undefined)?.current_period_end
      let periodStartIso: string | null = (subscription.current_period_start ?? itemPeriodStart)
        ? new Date((subscription.current_period_start ?? itemPeriodStart)! * 1000).toISOString()
        : null
      let periodEndIso: string | null = (subscription.current_period_end ?? itemPeriodEnd)
        ? new Date((subscription.current_period_end ?? itemPeriodEnd)! * 1000).toISOString()
        : null

      // Expanded session.subscription can omit period dates; fetch full subscription and read from items.data[0].
      if (subscription.id && periodStartIso == null && periodEndIso == null) {
        try {
          const fullSub = await stripe.subscriptions.retrieve(subscription.id)
          const fullItem = fullSub.items?.data?.[0] as { current_period_start?: number; current_period_end?: number } | undefined
          const rawStart = fullSub.current_period_start ?? fullItem?.current_period_start
          const rawEnd = fullSub.current_period_end ?? fullItem?.current_period_end
          periodStartIso = rawStart ? new Date(rawStart * 1000).toISOString() : null
          periodEndIso = rawEnd ? new Date(rawEnd * 1000).toISOString() : null
        } catch (e) {
          logger.warn('[VERIFY-CHECKOUT] Could not retrieve full subscription for period dates:', e instanceof Error ? e.message : e)
        }
      }

      logger.info('[VERIFY-CHECKOUT] Writing subscription to DB:', {
        teamId: auth.team.id,
        subscriptionId: subscription.id,
        status: dbStatus,
        quantity,
        rawPeriodStart: subscription.current_period_start,
        rawPeriodEnd: subscription.current_period_end,
        periodStartIso,
        periodEndIso,
      })

      const { data: upsertData, error: upsertError } = await subRepo.upsertByTeamId(auth.team.id, {
        team_id: auth.team.id,
        stripe_subscription_id: subscription.id,
        stripe_customer_id: customerId ?? null,
        price_id: item?.price?.id ?? null,
        status: dbStatus as import('@/lib/services/domain/subscription.service').SubscriptionStatus,
        subscribed_lots: quantity,
        current_period_start: periodStartIso,
        current_period_end: periodEndIso,
        cancel_at_period_end: subscription.cancel_at_period_end ?? false,
        payment_method_added: true,
      })

      if (upsertError) {
        logger.error('[VERIFY-CHECKOUT] Upsert FAILED:', {
          teamId: auth.team.id,
          error: upsertError.message ?? String(upsertError),
          code: (upsertError as { code?: string }).code,
          details: (upsertError as { details?: string }).details,
        })
      } else {
        logger.info('[VERIFY-CHECKOUT] Subscription synced to DB:', {
          subscriptionId: subscription.id,
          status: dbStatus,
          quantity,
          teamId: auth.team.id,
          savedPeriodEnd: upsertData?.current_period_end,
        })
      }
    }

    return {
      success: true,
      data: {
        verified: true,
        subscription_status: typeof subscription === 'object' ? subscription?.status : session.payment_status,
      },
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    logger.error('[SUBSCRIPTION-ACTION] verifyCheckoutSession error:', message)
    return { success: false, error: message }
  }
}

export async function getOnboardingProgress(): Promise<ActionResult<OnboardingProgress>> {
  try {
    const auth = await getServerActionAuthContextOrNull('gestionnaire')
    if (!auth) {
      return { success: false, error: 'Authentication required' }
    }

    const { supabase, team } = auth

    // Run all 6 checks in parallel for performance
    const [lots, contacts, contracts, interventions, closedInterventions, emails] = await Promise.all([
      // 1. Has at least one lot
      supabase
        .from('lots')
        .select('id', { count: 'exact', head: true })
        .eq('team_id', team.id),
      // 2. Has at least one contact (team_members count > 1, since the gestionnaire themselves is always a member)
      supabase
        .from('team_members')
        .select('id', { count: 'exact', head: true })
        .eq('team_id', team.id),
      // 3. Has created at least one contract
      supabase
        .from('contracts')
        .select('id', { count: 'exact', head: true })
        .eq('team_id', team.id),
      // 4. Has at least one manually-created intervention by gestionnaire
      supabase
        .from('interventions')
        .select('id', { count: 'exact', head: true })
        .eq('team_id', team.id)
        .eq('creation_source', 'manual'),
      // 5. Has closed at least one intervention
      supabase
        .from('interventions')
        .select('id', { count: 'exact', head: true })
        .eq('team_id', team.id)
        .in('status', ['cloturee_par_gestionnaire', 'cloturee_par_prestataire', 'cloturee_par_locataire']),
      // 6. Has connected at least one email account
      supabase
        .from('team_email_connections')
        .select('id', { count: 'exact', head: true })
        .eq('team_id', team.id)
        .eq('is_active', true),
    ])

    return {
      success: true,
      data: {
        hasLot: (lots.count ?? 0) > 0,
        hasContact: (contacts.count ?? 0) > 1,
        hasContract: (contracts.count ?? 0) > 0,
        hasIntervention: (interventions.count ?? 0) > 0,
        hasClosedIntervention: (closedInterventions.count ?? 0) > 0,
        hasEmail: (emails.count ?? 0) > 0,
        hasImportedData: false, // Optional step — tracked via localStorage skip
      },
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    logger.error('[SUBSCRIPTION-ACTION] getOnboardingProgress error:', message)
    return { success: false, error: message }
  }
}
