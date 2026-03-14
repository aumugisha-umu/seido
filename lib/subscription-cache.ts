import { unstable_cache } from 'next/cache'
import { SubscriptionRepository } from '@/lib/services/repositories/subscription.repository'
import { SubscriptionService } from '@/lib/services/domain/subscription.service'
import { StripeCustomerRepository } from '@/lib/services/repositories/stripe-customer.repository'
import { getStripe } from '@/lib/stripe'
import { createServiceRoleSupabaseClient } from '@/lib/services/core/supabase-client'

/**
 * Cached subscription info per team (15min TTL, invalidated by Stripe webhook).
 * Shared across gestionnaire, locataire, and prestataire layouts.
 */
export const getCachedSubscriptionInfo = (teamId: string) =>
  unstable_cache(
    async () => {
      const stripe = getStripe()
      const serviceRoleClient = createServiceRoleSupabaseClient()
      const subRepo = new SubscriptionRepository(serviceRoleClient)
      const custRepo = new StripeCustomerRepository(serviceRoleClient)
      const subService = new SubscriptionService(stripe, subRepo, custRepo)
      return subService.getSubscriptionInfo(teamId, subRepo)
    },
    ['subscription-info', teamId],
    { revalidate: 900, tags: ['subscription'] }
  )()
