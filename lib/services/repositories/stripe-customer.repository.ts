import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/database.types'

type StripeCustomerInsert = Database['public']['Tables']['stripe_customers']['Insert']

export class StripeCustomerRepository {
  constructor(private readonly supabase: SupabaseClient<Database>) {}

  async findByTeamId(teamId: string) {
    const { data, error } = await this.supabase
      .from('stripe_customers')
      .select('*')
      .eq('team_id', teamId)
      .limit(1)
      .maybeSingle()

    return { data, error }
  }

  async findByStripeCustomerId(stripeCustomerId: string) {
    const { data, error } = await this.supabase
      .from('stripe_customers')
      .select('*')
      .eq('stripe_customer_id', stripeCustomerId)
      .limit(1)
      .maybeSingle()

    return { data, error }
  }

  async create(insertData: StripeCustomerInsert) {
    const { data, error } = await this.supabase
      .from('stripe_customers')
      .insert(insertData)
      .select()
      .single()

    return { data, error }
  }

  async updateStripeCustomerId(teamId: string, newStripeCustomerId: string, email: string, name: string | null) {
    const { data, error } = await this.supabase
      .from('stripe_customers')
      .update({ stripe_customer_id: newStripeCustomerId, email, name })
      .eq('team_id', teamId)
      .select()
      .single()

    return { data, error }
  }
}
