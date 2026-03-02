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

  // ── Both data chains run in parallel (independent services + tables) ──
  const [tenantResult, unreadThreads] = await Promise.all([
    // Chain A: Tenant data
    (async () => {
      try {
        const tenantService = await createServerTenantService()
        const data = await tenantService.getTenantData(profile.id)
        logger.info('✅ [LOCATAIRE-PAGE] Tenant data loaded server-side:', {
          userId: profile.id,
          lotsCount: data?.lots?.length || 0,
          contractStatus: data?.contractStatus,
          interventionsCount: data?.interventions?.length || 0
        })
        return { data, error: null }
      } catch (error) {
        logger.error('❌ [LOCATAIRE-PAGE] Failed to load tenant data server-side:', error)
        return { data: null, error: error instanceof Error ? error.message : 'Erreur de chargement' }
      }
    })(),
    // Chain B: Unread conversation threads
    (async (): Promise<{ threads: UnreadThread[]; totalCount: number }> => {
      try {
        const supabase = await createServerSupabaseClient()
        const conversationRepo = new ConversationRepository(supabase)
        const result = await conversationRepo.getUnreadThreadsForDashboard(profile.id)
        return (result.success && result.data) ? result.data : { threads: [], totalCount: 0 }
      } catch {
        return { threads: [], totalCount: 0 }
      }
    })(),
  ])

  const tenantData = tenantResult.data
  const tenantError = tenantResult.error

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
