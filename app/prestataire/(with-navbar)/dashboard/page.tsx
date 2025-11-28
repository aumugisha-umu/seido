import { getServerAuthContext } from "@/lib/server-context"
import { createServerActionInterventionService } from "@/lib/services"
import { ProviderDashboardV2 } from "@/components/dashboards/provider/provider-dashboard-v2"
import { logger as baseLogger } from '@/lib/logger'
import { filterPendingActions } from '@/lib/intervention-alert-utils'
import type { InterventionWithRelations } from "@/lib/services"

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const logger: any = baseLogger

/**
 * 🔐 DASHBOARD PRESTATAIRE - SERVER COMPONENT (Next.js 15 Pattern)
 */

export default async function PrestataireDashboardPage() {
  // ✅ AUTH + TEAM en 1 ligne (cached via React.cache())
  const { profile, team } = await getServerAuthContext('prestataire')

  let allInterventions: InterventionWithRelations[] = []
  let pendingActionsCount = 0

  try {
    logger.info('🔧 [PROVIDER DASHBOARD] Starting service initialization...')

    // Initialiser le service d'interventions
    const interventionService = await createServerActionInterventionService()

    logger.info('✅ [PROVIDER DASHBOARD] Service initialized successfully')
    logger.info('📦 [PROVIDER DASHBOARD] Using team ID from context:', team.id)

    // Récupérer les interventions du prestataire
    const interventionsResult = await interventionService.getByTeam(team.id)

    if (interventionsResult.success) {
      allInterventions = (interventionsResult.data || []) as unknown as InterventionWithRelations[]
      logger.info('✅ [PROVIDER DASHBOARD] Interventions loaded:', allInterventions.length)

      // Calculer les actions en attente
      const pendingActions = filterPendingActions(allInterventions, 'prestataire')
      pendingActionsCount = pendingActions.length
      logger.info('📊 [PROVIDER DASHBOARD] Pending actions count:', pendingActionsCount)
    } else {
      logger.error('❌ [PROVIDER DASHBOARD] Error loading interventions:', interventionsResult.error)
    }
  } catch (error) {
    logger.error('❌ [PROVIDER DASHBOARD] Fatal error:', error)
  }

  // Calculer les statistiques
  const stats = {
    interventionsCount: allInterventions.length,
    activeCount: allInterventions.filter(i => ['en_cours', 'planifiee', 'planification'].includes(i.status)).length,
    completedCount: allInterventions.filter(i => ['cloturee_par_prestataire', 'cloturee_par_locataire', 'cloturee_par_gestionnaire'].includes(i.status)).length
  }

  return (
    <ProviderDashboardV2
      stats={stats}
      interventions={allInterventions}
      pendingCount={pendingActionsCount}
    />
  )
}
