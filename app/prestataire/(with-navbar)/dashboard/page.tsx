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

  let allInterventions: InterventionWithRelations[] = []
  let pendingActionsCount = 0

  try {
    logger.info('🔧 [PROVIDER DASHBOARD] Starting service initialization...')

    // Initialiser le service d'interventions
    const interventionService = await createServerActionInterventionService()

    logger.info('✅ [PROVIDER DASHBOARD] Service initialized successfully')
    logger.info('📦 [PROVIDER DASHBOARD] Mode:', isConsolidatedView ? 'CONSOLIDATED' : 'SINGLE TEAM')
    logger.info('📦 [PROVIDER DASHBOARD] Active team IDs:', activeTeamIds)

    // ✅ MULTI-ÉQUIPE: Récupérer interventions de TOUTES les équipes actives
    if (isConsolidatedView && activeTeamIds.length > 1) {
      // Vue consolidée: Promise.all + merge
      const interventionsPromises = activeTeamIds.map(teamId =>
        interventionService.getByTeam(teamId)
      )
      const interventionsResults = await Promise.all(interventionsPromises)

      // Merge des résultats (dédupliquer par ID au cas où)
      const seenIds = new Set<string>()
      for (const result of interventionsResults) {
        if (result.success && result.data) {
          for (const intervention of result.data) {
            if (!seenIds.has(intervention.id)) {
              seenIds.add(intervention.id)
              allInterventions.push(intervention as unknown as InterventionWithRelations)
            }
          }
        }
      }

      logger.info('✅ [PROVIDER DASHBOARD] Consolidated interventions loaded:', allInterventions.length)
    } else {
      // Équipe unique: comportement original
      const interventionsResult = await interventionService.getByTeam(team.id)

      if (interventionsResult.success) {
        allInterventions = (interventionsResult.data || []) as unknown as InterventionWithRelations[]
        logger.info('✅ [PROVIDER DASHBOARD] Interventions loaded:', allInterventions.length)
      } else {
        logger.error('❌ [PROVIDER DASHBOARD] Error loading interventions:', interventionsResult.error)
      }
    }

    // Calculer les actions en attente
    const pendingActions = filterPendingActions(allInterventions, 'prestataire')
    pendingActionsCount = pendingActions.length
    logger.info('📊 [PROVIDER DASHBOARD] Pending actions count:', pendingActionsCount)
  } catch (error) {
    logger.error('❌ [PROVIDER DASHBOARD] Fatal error:', error)
  }

  // Calculer les statistiques
  // Note: 'en_cours' removed from workflow - interventions go directly from 'planifiee' to finalization
  const stats = {
    interventionsCount: allInterventions.length,
    activeCount: allInterventions.filter(i => ['planifiee', 'planification'].includes(i.status)).length,
    completedCount: allInterventions.filter(i => ['cloturee_par_prestataire', 'cloturee_par_locataire', 'cloturee_par_gestionnaire'].includes(i.status)).length
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
    logger.warn('[PROVIDER-DASHBOARD] Unread threads fetch failed, skipping', { error })
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
