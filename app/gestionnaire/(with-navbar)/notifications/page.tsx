/**
 * Notifications Page - Server Component
 *
 * ⚡ SSR Optimization: Fetches initial notifications server-side
 * for instant page load, then hydrates with Client Component for interactivity
 */

import { getServerAuthContext } from '@/lib/server-context'
import { NotificationsClient } from './notifications-client'
import type { Notification } from '@/hooks/use-notifications'

// ============================================================================
// SERVER-SIDE DATA FETCHING
// ============================================================================

async function getNotifications(
  supabase: any,
  userId: string,
  teamId: string,
  scope: 'personal' | 'team'
): Promise<{ notifications: Notification[], unreadCount: number }> {
  const isPersonal = scope === 'personal'

  const { data, error } = await supabase
    .from('notifications')
    .select(`
      *,
      created_by_user:users!created_by(
        id,
        name,
        email
      ),
      team:teams!team_id(
        id,
        name
      )
    `)
    .eq('team_id', teamId)
    .eq('user_id', userId)
    .eq('is_personal', isPersonal)
    .eq('archived', false)
    .order('created_at', { ascending: false })
    .limit(50)

  if (error) {
    console.error(`Error fetching ${scope} notifications:`, error)
    return { notifications: [], unreadCount: 0 }
  }

  const notifications = (data || []) as Notification[]
  const unreadCount = notifications.filter(n => !n.read).length

  return { notifications, unreadCount }
}

// ============================================================================
// PAGE COMPONENT (Server)
// ============================================================================

export default async function NotificationsPage() {
  // ⚡ Server-side auth context (1 line instead of multiple hooks)
  const { user, profile, team, supabase } = await getServerAuthContext('gestionnaire')

  // Fetch both notification types in parallel
  const [teamResult, personalResult] = await Promise.all([
    getNotifications(supabase, profile.id, team.id, 'team'),
    getNotifications(supabase, profile.id, team.id, 'personal')
  ])

  return (
    <NotificationsClient
      userId={profile.id}
      teamId={team.id}
      initialTeamNotifications={teamResult.notifications}
      initialPersonalNotifications={personalResult.notifications}
      initialUnreadCount={teamResult.unreadCount}
      initialPersonalUnreadCount={personalResult.unreadCount}
    />
  )
}
