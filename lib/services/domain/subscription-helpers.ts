import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/database.types'
import { SubscriptionService } from './subscription.service'
import { SubscriptionRepository } from '../repositories/subscription.repository'
import { StripeCustomerRepository } from '../repositories/stripe-customer.repository'
import { createServiceRoleSupabaseClient } from '../core/supabase-client'
import { getStripe } from '@/lib/stripe'

/**
 * Create a SubscriptionService backed by a service_role client.
 * Use for write operations — RLS only allows SELECT for authenticated users.
 */
export function createServiceRoleSubscriptionService(): SubscriptionService {
  const supabase = createServiceRoleSupabaseClient()
  const stripe = getStripe()
  const subRepo = new SubscriptionRepository(supabase)
  const custRepo = new StripeCustomerRepository(supabase)
  return new SubscriptionService(stripe, subRepo, custRepo)
}

/**
 * Create a SubscriptionService backed by a user-scoped Supabase client.
 * Use for read-only operations where RLS SELECT is sufficient.
 */
export function createSubscriptionService(
  supabase: SupabaseClient<Database>,
): SubscriptionService {
  const stripe = getStripe()
  const subRepo = new SubscriptionRepository(supabase)
  const custRepo = new StripeCustomerRepository(supabase)
  return new SubscriptionService(stripe, subRepo, custRepo)
}
