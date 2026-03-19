import type { SupabaseClient } from '@supabase/supabase-js'

/**
 * Retrieves the team_id for a user who is an active team manager (gestionnaire or admin).
 * Uses team_members as the source of truth (not users.team_id which can be stale).
 *
 * @returns The team_id string, or null if the user is not an active team manager.
 */
export async function getTeamManagerContext(supabase: SupabaseClient, userId: string): Promise<string | null> {
  const { data: membership, error } = await supabase
    .from('team_members')
    .select('team_id')
    .eq('user_id', userId)
    .in('role', ['gestionnaire', 'admin'])
    .is('left_at', null)
    .single()

  if (error || !membership?.team_id) {
    return null
  }
  return membership.team_id
}
