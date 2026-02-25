import { getServerAuthContext } from '@/lib/server-context'
import { SubscriptionService } from '@/lib/services/domain/subscription.service'
import { SubscriptionRepository } from '@/lib/services/repositories/subscription.repository'
import { StripeCustomerRepository } from '@/lib/services/repositories/stripe-customer.repository'
import { createServiceRoleSupabaseClient } from '@/lib/services/core/supabase-client'
import { getStripe } from '@/lib/stripe'
import { BillingPageClient } from './billing-page-client'

/**
 * Billing Page — Server Component
 *
 * Fetches subscription info on the server, passes to client component.
 * Only accessible to gestionnaire role (getServerAuthContext enforces).
 */
export default async function BillingPage() {
  const { team, supabase } = await getServerAuthContext('gestionnaire')

  // Fetch initial subscription data server-side for fast render
  const stripe = getStripe()
  const subRepo = new SubscriptionRepository(supabase)
  const custRepo = new StripeCustomerRepository(supabase)
  const service = new SubscriptionService(stripe, subRepo, custRepo)

  // Pass service_role repo for lazy sync writes (user client can only SELECT on subscriptions)
  const serviceRoleRepo = new SubscriptionRepository(createServiceRoleSupabaseClient())
  const subscriptionInfo = await service.getSubscriptionInfo(team.id, serviceRoleRepo)

  return (
    <BillingPageClient
      initialSubscriptionInfo={subscriptionInfo}
      teamName={team.name}
    />
  )
}
