import { getServerAuthContext } from "@/lib/server-context"
import {
  createServerActionUserService,
  createServerActionBuildingService,
  createServerActionLotService,
  createServerActionInterventionService,
  createServerActionStatsService
} from "@/lib/services"
import { DashboardClient } from "./dashboard-client"
import { StatsCompactV2 } from "./stats-compact-v2"
import { InterventionsSectionWithModals } from "./interventions-section-with-modals"
import { logger as baseLogger } from '@/lib/logger'
import type { InterventionWithRelations } from "@/lib/services"

// Relax logger typing locally to avoid strict method signature constraints for rich logs in this server component
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const logger: any = baseLogger
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const dashLogger: any = logger

/**
 * 🔐 DASHBOARD GESTIONNAIRE - SERVER COMPONENT (Next.js 15 Pattern)
 *
 * Pattern officiel Next.js 15 + React 19:
 * 1. getServerAuthContext() centralisé (1 ligne vs 10+)
 * 2. React.cache() déduplique automatiquement avec layout
 * 3. Server-side data loading avec Promise.all() parallèle
 * 4. Pass all data to Client Components (no client fetching)
 */

export default async function DashboardGestionnaire() {
  // ✅ AUTH + TEAM en 1 ligne (cached via React.cache())
  const { profile, team, supabase } = await getServerAuthContext('gestionnaire')

  // ✅ LAYER 2: Data Layer Security - Récupération données sécurisée
  let stats = {
    buildingsCount: 0,
    lotsCount: 0,
    occupiedLotsCount: 0,
    occupancyRate: 0,
    interventionsCount: 0
  }

  let contactStats = {
    totalContacts: 0,
    totalActiveAccounts: 0,
    invitationsPending: 0,
    contactsByType: {} as Record<string, { total: number; active: number }>
  }

  let recentInterventions: InterventionWithRelations[] = []
  let allInterventions: InterventionWithRelations[] = []

  try {
    dashLogger.info('🔧 [DASHBOARD] Starting service initialization...')

    // Initialiser les services
    const userService = await createServerActionUserService()
    const buildingService = await createServerActionBuildingService()
    const lotService = await createServerActionLotService()
    const interventionService = await createServerActionInterventionService()

    dashLogger.info('✅ [DASHBOARD] All services initialized successfully')
    dashLogger.info('📦 [DASHBOARD] Using team ID from context:', team.id)

    // ⚡ OPTIMISATION: Récupérer les statistiques en parallèle avec Promise.all
    dashLogger.info('🏗️ [DASHBOARD] Starting PARALLEL data loading for team:', team.id)

    // ⚡ Phase 1: Charger buildings, users et interventions en parallèle
    const [buildingsResult, usersResult, interventionsResult] = await Promise.allSettled([
      buildingService.getBuildingsByTeam(team.id),
      userService.getUsersByTeam(team.id),
      interventionService.getByTeam(team.id)
    ])

      // Traiter résultats buildings
      let buildings: any[] = []
      if (buildingsResult.status === 'fulfilled' && buildingsResult.value.success) {
        buildings = (buildingsResult.value.data || []) as any[]
        dashLogger.info('✅ [DASHBOARD] Buildings loaded:', buildings.length)
      } else {
        dashLogger.error('❌ [DASHBOARD] Error loading buildings:',
          buildingsResult.status === 'rejected' ? buildingsResult.reason : 'No data')
      }

      // Traiter résultats users
      let users: any[] = []
      if (usersResult.status === 'fulfilled' && usersResult.value.success) {
        users = (usersResult.value.data || []) as any[]
        dashLogger.info('✅ [DASHBOARD] Users loaded:', users.length)
      } else {
        dashLogger.error('❌ [DASHBOARD] Error loading users:',
          usersResult.status === 'rejected' ? usersResult.reason : 'No data')
      }

      // Traiter résultats interventions
      let interventions: InterventionWithRelations[] = []
      if (interventionsResult.status === 'fulfilled' && interventionsResult.value.success) {
        interventions = (interventionsResult.value.data || []) as unknown as InterventionWithRelations[]
        dashLogger.info('✅ [DASHBOARD] Interventions loaded:', interventions.length)
      } else {
        dashLogger.error('❌ [DASHBOARD] Error loading interventions:',
          interventionsResult.status === 'rejected' ? interventionsResult.reason : 'No data')
      }
      allInterventions = interventions

    // ⚡ OPTIMISATION: Charger TOUS les lots (building + indépendants) en 1 seule requête team-scoped
    dashLogger.info('🏠 [DASHBOARD] Loading ALL lots (including independent) for team:', team.id)
    const allLotsResult = await lotService.getLotsByTeam(team.id)

      let allLots: any[] = []
      if (allLotsResult.success) {
        allLots = allLotsResult.data || []
        dashLogger.info('✅ [DASHBOARD] ALL lots loaded:', allLots.length, '(including independent lots)')

        // Log breakdown for debugging
        const buildingLots = allLots.filter(lot => lot.building_id)
        const independentLots = allLots.filter(lot => !lot.building_id)
        dashLogger.info('  → Building-linked lots:', buildingLots.length)
        dashLogger.info('  → Independent lots:', independentLots.length)
      } else {
        dashLogger.error('❌ [DASHBOARD] Error loading lots:', allLotsResult.error)
      }

      // Calculer les statistiques
      dashLogger.info('📊 [DASHBOARD] Calculating stats with:')
      dashLogger.info('  - buildings array:', buildings)
      dashLogger.info('  - buildings length:', (buildings as any[])?.length || 0)
      dashLogger.info('  - allLots length:', allLots?.length || 0)
      dashLogger.info('  - interventions length:', interventions?.length || 0)

      // Phase 2: Occupancy determined by tenant_id presence
      const occupiedLots = allLots.filter(lot => (lot as any).tenant_id || (lot as any).tenant)

      stats = {
        buildingsCount: (buildings as any[])?.length || 0,
        lotsCount: allLots?.length || 0,
        occupiedLotsCount: occupiedLots?.length || 0,
        occupancyRate: allLots.length > 0 ? Math.round((occupiedLots.length / allLots.length) * 100) : 0,
        interventionsCount: interventions?.length || 0
      }

      dashLogger.info('📊 [DASHBOARD] Final stats calculated:', stats)
      dashLogger.info('📊 [DASHBOARD] Stats object structure:', JSON.stringify(stats, null, 2))

      // Statistiques contacts
      // 🛡️ DEFENSIVE: Ensure users is always an array before operations
      const safeUsers = Array.isArray(users) ? users : []
      const activeUsers = safeUsers.filter((u: any) => u.auth_user_id)
      const contactsByType = safeUsers.reduce((acc: Record<string, { total: number; active: number }>, user: any) => {
        if (!acc[user.role]) {
          acc[user.role] = { total: 0, active: 0 }
        }
        acc[user.role].total++
        if (user.auth_user_id) {
          acc[user.role].active++
        }
        return acc
      }, {} as Record<string, { total: number; active: number }>)

      contactStats = {
        totalContacts: safeUsers.length,
        totalActiveAccounts: activeUsers.length,
        invitationsPending: safeUsers.filter((u: any) => !u.auth_user_id).length,
        contactsByType
      }

    // Interventions triées récentes
    allInterventions = (allInterventions || [])
      .sort((a, b) => (new Date(b.created_at ?? '').getTime() || 0) - (new Date(a.created_at ?? '').getTime() || 0))
    recentInterventions = (allInterventions || []).slice(0, 3)
  } catch (error) {
    // Capturer toutes les propriétés de l'erreur pour diagnostic complet
    const errorDetails = {
      message: error instanceof Error ? error.message : String(error),
      name: error instanceof Error ? error.name : 'UnknownError',
      stack: error instanceof Error ? error.stack?.split('\n').slice(0, 5).join('\n') : undefined,
      type: typeof error,
      constructor: error?.constructor?.name
    }

    // 🔍 IMPORTANT: Pino logger requires manual stringification for complex objects
    dashLogger.error('❌ [DASHBOARD] Error loading data - Full Details:')
    dashLogger.error(JSON.stringify(errorDetails, null, 2))

    // Cas spécial : erreur Supabase avec code
    if (error && typeof error === 'object' && 'code' in error) {
      const supabaseError = {
        code: (error as any).code,
        message: (error as any).message,
        details: (error as any).details,
        hint: (error as any).hint
      }
      dashLogger.error('❌ [DASHBOARD] Supabase error details:')
      dashLogger.error(JSON.stringify(supabaseError, null, 2))
    }

    // Les stats par défaut restent (valeurs 0)
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200"></header>

      {/* Main Content */}
      <div className="py-2">
        {/* Welcome Message and Quick Actions */}
        <div className="mb-8">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-6">
            <div>
              <h1 className="font-bold text-gray-900 mb-[] mt-[] text-3xl">
                Tableau de bord
              </h1>
            </div>

            {/* Actions rapides - Composant client sécurisé */}
            <DashboardClient teamId={team.id} />
          </div>
        </div>

        {/* Portfolio Overview - Compact V2 */}
        <div className="mb-8">
          <StatsCompactV2 stats={stats} contactStats={contactStats} />
        </div>

        {/* Interventions avec tabs (En cours / Terminées) */}
        <div className="mb-8">
          <InterventionsSectionWithModals
            interventions={allInterventions}
            totalCount={stats.interventionsCount}
            teamId={team.id}
          />
        </div>
      </div>
    </div>
  )
}
