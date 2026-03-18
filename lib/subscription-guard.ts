import { createServiceRoleSupabaseClient } from '@/lib/services/core/supabase-client'
import { SubscriptionRepository } from '@/lib/services/repositories/subscription.repository'

/**
 * Statuses that indicate a team's subscription is blocked.
 * Must stay in sync with subscription.service.ts is_read_only logic.
 */
export const BLOCKED_STATUSES = new Set(['read_only', 'unpaid', 'incomplete_expired', 'paused'])

/**
 * Check if a team's subscription is blocked (read-only / unpaid / expired / paused).
 * Used by locataire/prestataire layouts to show blocked banners,
 * detail pages to restrict access, and notification actions to suppress notifs.
 *
 * Uses service role client to bypass RLS.
 */
export async function isTeamSubscriptionBlocked(teamId: string): Promise<boolean> {
  try {
    const supabase = createServiceRoleSupabaseClient()
    const subRepo = new SubscriptionRepository(supabase)
    const { data: sub } = await subRepo.findByTeamId(teamId)
    if (!sub) return false
    return BLOCKED_STATUSES.has(sub.status)
  } catch {
    return false // fail-open: don't block on error
  }
}
