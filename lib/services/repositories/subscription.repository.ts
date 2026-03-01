import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/database.types'

type SubscriptionRow = Database['public']['Tables']['subscriptions']['Row']
type SubscriptionInsert = Database['public']['Tables']['subscriptions']['Insert']
type SubscriptionUpdate = Database['public']['Tables']['subscriptions']['Update']

export class SubscriptionRepository {
  constructor(private readonly supabase: SupabaseClient<Database>) {}

  async findByTeamId(teamId: string) {
    const { data, error } = await this.supabase
      .from('subscriptions')
      .select('*')
      .eq('team_id', teamId)
      .limit(1)
      .maybeSingle()

    return { data, error }
  }

  async findByStripeSubscriptionId(stripeSubscriptionId: string) {
    const { data, error } = await this.supabase
      .from('subscriptions')
      .select('*')
      .eq('stripe_subscription_id', stripeSubscriptionId)
      .limit(1)
      .maybeSingle()

    return { data, error }
  }

  async create(insertData: SubscriptionInsert) {
    const { data, error } = await this.supabase
      .from('subscriptions')
      .insert(insertData)
      .select()
      .single()

    return { data, error }
  }

  async update(id: string, updateData: SubscriptionUpdate) {
    const { data, error } = await this.supabase
      .from('subscriptions')
      .update(updateData)
      .eq('id', id)
      .select()
      .single()

    return { data, error }
  }

  async updateByTeamId(teamId: string, updateData: SubscriptionUpdate) {
    const { data, error } = await this.supabase
      .from('subscriptions')
      .update(updateData)
      .eq('team_id', teamId)
      .select()
      .single()

    return { data, error }
  }

  async upsertByTeamId(teamId: string, upsertData: Partial<SubscriptionRow> & { team_id: string }) {
    const { data, error } = await this.supabase
      .from('subscriptions')
      .upsert({ ...upsertData, team_id: teamId }, { onConflict: 'team_id' })
      .select()
      .single()

    return { data, error }
  }

  async getLotCount(teamId: string): Promise<{ data: number; error: unknown }> {
    // Live count from lots table — never stale, unlike billable_properties cache
    const { count, error } = await this.supabase
      .from('lots')
      .select('*', { count: 'exact', head: true })
      .eq('team_id', teamId)
      .is('deleted_at', null)

    if (error) return { data: 0, error }
    return { data: count ?? 0, error: null }
  }
}
