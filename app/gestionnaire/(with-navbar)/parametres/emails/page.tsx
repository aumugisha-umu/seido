/**
 * Email Settings — SSR Pre-fetch Hybrid
 *
 * Server Component fetches initial connections + blacklist data,
 * then passes to client component which handles mutations and refreshes.
 * Eliminates loading spinner on first paint.
 */

import { getServerAuthContext } from '@/lib/server-context'
import { createServiceRoleSupabaseClient } from '@/lib/services'
import { logger } from '@/lib/logger'
import { EmailSettingsClient } from './email-settings-client'
import type { EmailConnection } from './email-settings-client'
import type { BlacklistEntry } from '../../mail/components/types'

export default async function EmailSettingsPage() {
  const { profile, team, supabase } = await getServerAuthContext('gestionnaire')

  let initialConnections: EmailConnection[] = []
  let initialBlacklist: BlacklistEntry[] = []

  try {
    // Fetch connections for the team
    const { data: connections, error: connError } = await supabase
      .from('team_email_connections')
      .select('id, provider, email_address, is_active, last_sync_at, last_error, sync_from_date, created_at, auth_method, oauth_token_expires_at, visibility, added_by_user_id')
      .eq('team_id', team.id)
      .order('created_at', { ascending: false })

    if (connError) {
      logger.warn('[EMAIL-SETTINGS] Failed to SSR-fetch connections', { error: connError })
    } else {
      initialConnections = (connections || []) as EmailConnection[]
    }
  } catch (error) {
    logger.warn('[EMAIL-SETTINGS] SSR connections fetch failed', { error })
  }

  try {
    // Blacklist needs service role for the JOIN on users table
    const supabaseAdmin = createServiceRoleSupabaseClient()

    const { data: blacklistData, error: blError } = await supabaseAdmin
      .from('email_blacklist')
      .select('*, users:blocked_by_user_id(first_name, last_name)')
      .eq('team_id', team.id)
      .order('created_at', { ascending: false })

    if (blError) {
      logger.warn('[EMAIL-SETTINGS] Failed to SSR-fetch blacklist', { error: blError })
    } else {
      initialBlacklist = (blacklistData || []).map((entry: { id: string; sender_email: string | null; sender_domain: string | null; reason: string | null; blocked_by_user_id: string; created_at: string; users: { first_name: string | null; last_name: string | null } | null }) => {
        const user = entry.users
        const userName = user
          ? [user.first_name, user.last_name].filter(Boolean).join(' ') || 'Inconnu'
          : 'Inconnu'
        return {
          id: entry.id,
          sender_email: entry.sender_email,
          sender_domain: entry.sender_domain,
          reason: entry.reason,
          blocked_by_user_name: userName,
          is_current_user: entry.blocked_by_user_id === profile.id,
          created_at: entry.created_at,
        }
      }) as BlacklistEntry[]
    }
  } catch (error) {
    logger.warn('[EMAIL-SETTINGS] SSR blacklist fetch failed', { error })
  }

  return (
    <EmailSettingsClient
      initialConnections={initialConnections}
      initialBlacklist={initialBlacklist}
    />
  )
}
