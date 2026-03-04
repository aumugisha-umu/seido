import { getServerAuthContext } from "@/lib/server-context"
import { createServerActionInterventionService, createServerSupabaseClient, ConversationRepository } from "@/lib/services"
import type { UnreadThread } from "@/lib/services/repositories/conversation-repository"
import { ProviderDashboardV2 } from "@/components/dashboards/provider/provider-dashboard-v2"
import { logger as baseLogger } from '@/lib/logger'
import { filterPendingActions } from '@/lib/intervention-alert-utils'
import type { InterventionWithRelations } from "@/lib/services"

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const logger: any = baseLogger

/**
 * 🔐 DASHBOARD PRESTATAIRE - SERVER COMPONENT (Next.js 15 Pattern)
 *
 * ✅ MULTI-ÉQUIPE (Jan 2026): Supporte la vue consolidée "Toutes les équipes"
 * - Si isConsolidatedView = true, récupère interventions de TOUTES les équipes
 * - Utilise Promise.all pour requêtes parallèles + merge des résultats
 */

export default async function PrestataireDashboardPage() {
  // ✅ AUTH + TEAM en 1 ligne (cached via React.cache())
  // ✅ MULTI-ÉQUIPE: activeTeamIds contient TOUS les team IDs si vue consolidée
  const { profile, team, activeTeamIds, isConsolidatedView } = await getServerAuthContext('prestataire')

  // ── Both data chains run in parallel (independent services + tables) ──
  const [interventionsData, unreadThreads] = await Promise.all([
    // Chain A: Interventions + pending actions
    (async () => {
      try {
        const interventionService = await createServerActionInterventionService()
        let allInterventions: InterventionWithRelations[] = []

        if (isConsolidatedView && activeTeamIds.length > 1) {
          const results = await Promise.all(activeTeamIds.map(tid => interventionService.getByTeam(tid)))
          const seenIds = new Set<string>()
          for (const result of results) {
            if (result.success && result.data) {
              for (const intervention of result.data) {
                if (!seenIds.has(intervention.id)) {
                  seenIds.add(intervention.id)
                  allInterventions.push(intervention as unknown as InterventionWithRelations)
                }
              }
            }
          }
        } else {
          const result = await interventionService.getByTeam(team.id)
          if (result.success) allInterventions = (result.data || []) as unknown as InterventionWithRelations[]
        }

        const pendingActionsCount = filterPendingActions(allInterventions, 'prestataire').length
        return { allInterventions, pendingActionsCount }
      } catch (error) {
        logger.error('❌ [PROVIDER DASHBOARD] Fatal error:', error)
        return { allInterventions: [] as InterventionWithRelations[], pendingActionsCount: 0 }
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

  const { allInterventions, pendingActionsCount } = interventionsData

  const stats = {
    interventionsCount: allInterventions.length,
    activeCount: allInterventions.filter(i => ['planifiee', 'planification'].includes(i.status)).length,
    completedCount: allInterventions.filter(i => ['cloturee_par_prestataire', 'cloturee_par_locataire', 'cloturee_par_gestionnaire'].includes(i.status)).length
  }

  return (
    <ProviderDashboardV2
      stats={stats}
      interventions={allInterventions}
      pendingCount={pendingActionsCount}
      userId={profile.id}
      unreadThreads={unreadThreads.threads}
      unreadThreadsTotalCount={unreadThreads.totalCount}
    />
  )
}
