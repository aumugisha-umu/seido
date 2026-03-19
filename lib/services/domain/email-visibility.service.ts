import { SupabaseClient } from '@supabase/supabase-js'
import type { EmailVisibility } from '@/lib/types/email-integration'

/**
 * Centralized visibility logic for email connections.
 * All API routes use this to determine which connections/emails a user can access.
 *
 * Access rules:
 * - Shared connections: visible to all gestionnaires in the team
 * - Private connections: visible only to the user who added them
 * - Shared-with-me emails: visible via email_shares (created when adding conversation participants)
 */
export class EmailVisibilityService {
  /**
   * Returns connection IDs the user can access:
   * - All shared connections for the team
   * - User's own private connections
   *
   * This is the SINGLE source of truth for the visibility filter.
   * EmailConnectionRepository.getAccessibleConnections() delegates to this.
   */
  static async getAccessibleConnectionIds(
    supabase: SupabaseClient,
    teamId: string,
    userId: string
  ): Promise<string[]> {
    const { data, error } = await supabase
      .from('team_email_connections')
      .select('id')
      .eq('team_id', teamId)
      .or(`visibility.eq.shared,added_by_user_id.eq.${userId}`)

    if (error) throw error
    return (data || []).map(c => c.id)
  }

  /**
   * Check if a specific connection is private
   */
  static async isPrivateConnection(
    supabase: SupabaseClient,
    connectionId: string
  ): Promise<boolean> {
    const { data, error } = await supabase
      .from('team_email_connections')
      .select('visibility')
      .eq('id', connectionId)
      .limit(1)

    if (error) throw error
    return data?.[0]?.visibility === 'private'
  }

  /**
   * Get connections split by visibility for sidebar rendering
   */
  static async getConnectionsByVisibility(
    supabase: SupabaseClient,
    teamId: string,
    userId: string
  ): Promise<{
    privateConnections: { id: string; email_address: string; visibility: EmailVisibility }[]
    sharedConnections: { id: string; email_address: string; visibility: EmailVisibility }[]
  }> {
    const { data, error } = await supabase
      .from('team_email_connections')
      .select('id, email_address, visibility, added_by_user_id')
      .eq('team_id', teamId)
      .or(`visibility.eq.shared,added_by_user_id.eq.${userId}`)
      .order('created_at', { ascending: false })

    if (error) throw error

    const connections = data || []
    return {
      privateConnections: connections
        .filter(c => c.visibility === 'private' && c.added_by_user_id === userId)
        .map(({ id, email_address, visibility }) => ({ id, email_address, visibility })),
      sharedConnections: connections
        .filter(c => c.visibility === 'shared')
        .map(({ id, email_address, visibility }) => ({ id, email_address, visibility })),
    }
  }
}
