import { getServerAuthContext } from "@/lib/server-context"
import LocataireDashboard from "@/components/dashboards/locataire-dashboard"
import { createServerTenantService } from "@/lib/services/domain/tenant.service"
import { createServerSupabaseClient, ConversationRepository } from "@/lib/services"
import type { UnreadThread } from "@/lib/services/repositories/conversation-repository"
import { logger } from "@/lib/logger"

export default async function LocataireDashboardPage() {
  const { user, profile } = await getServerAuthContext('locataire')

  const userName = profile.name || user.email?.split('@')[0] || 'Utilisateur'
  const userInitial = userName.charAt(0).toUpperCase()
  const teamId = profile.team_id

  // ✅ Fetch tenant data server-side - no client-side fetch needed
  let tenantData = null
  let tenantError = null

  try {
    const tenantService = await createServerTenantService()
    tenantData = await tenantService.getTenantData(profile.id)
    logger.info('✅ [LOCATAIRE-PAGE] Tenant data loaded server-side:', {
      userId: profile.id,
      lotsCount: tenantData?.lots?.length || 0,
      contractStatus: tenantData?.contractStatus,
      interventionsCount: tenantData?.interventions?.length || 0
    })
  } catch (error) {
    logger.error('❌ [LOCATAIRE-PAGE] Failed to load tenant data server-side:', error)
    tenantError = error instanceof Error ? error.message : 'Erreur de chargement'
  }

  // Fetch unread conversation threads
  let unreadThreads: { threads: UnreadThread[]; totalCount: number } = { threads: [], totalCount: 0 }
  try {
    const supabase = await createServerSupabaseClient()
    const conversationRepo = new ConversationRepository(supabase)
    const unreadResult = await conversationRepo.getUnreadThreadsForDashboard(profile.id)
    if (unreadResult.success && unreadResult.data) {
      unreadThreads = unreadResult.data
    }
  } catch (error) {
    logger.warn('[LOCATAIRE-PAGE] Unread threads fetch failed, skipping', { error })
  }

  return (
    <LocataireDashboard
      userName={userName}
      userInitial={userInitial}
      teamId={teamId}
      // ✅ Pass server-loaded data as props
      serverTenantData={tenantData}
      serverError={tenantError}
      userId={profile.id}
      userRole={profile.role}
      unreadThreads={unreadThreads.threads}
      unreadThreadsTotalCount={unreadThreads.totalCount}
    />
  )
}
